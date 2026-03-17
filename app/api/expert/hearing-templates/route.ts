import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

interface QuestionInput {
  id?: string;
  question: string;
  type: string;
  required: boolean;
  options?: string[];
}

/** POST: 히어링 템플릿 신규 생성 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const body = await request.json();
    const { title, description, subsidyType, questions } = body as {
      title: string;
      description: string;
      subsidyType: string;
      questions: QuestionInput[];
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: 'title は必須です。' }, { status: 400 });
    }

    // hearing_templates 행 생성
    const { data: ht, error: htError } = await supabaseAdmin
      .from('hearing_templates')
      .insert({
        expert_id: user.id,
        title: title.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (htError || !ht) {
      console.error('hearing_templates insert error:', htError);
      return NextResponse.json({ error: htError?.message ?? 'insert failed' }, { status: 500 });
    }

    const templateId = ht.id as number;

    // 질문 삽입
    if (questions?.length > 0) {
      const validQuestions = questions.filter((q) => q.question?.trim());
      if (validQuestions.length > 0) {
        const { data: insertedQuestions, error: qError } = await supabaseAdmin
          .from('hearing_questions')
          .insert(
            validQuestions.map((q, i) => ({
              template_id: templateId,
              question_text: q.question.trim(),
              field_type: q.type || 'text',
              is_required: q.required ?? true,
              display_order: i + 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }))
          )
          .select('id, question_text');

        if (qError) {
          console.error('hearing_questions insert error:', qError);
        }

        // 선택지 삽입 (select/radio/checkbox 타입)
        if (insertedQuestions) {
          for (let i = 0; i < validQuestions.length; i++) {
            const q = validQuestions[i];
            const insertedQ = insertedQuestions[i];
            if (!insertedQ) continue;
            const opts = q.options?.filter((o) => o?.trim());
            if (opts && opts.length > 0) {
              const { error: oError } = await supabaseAdmin
                .from('hearing_options')
                .insert(
                  opts.map((opt, oi) => ({
                    question_id: insertedQ.id,
                    option_text: opt.trim(),
                    display_order: oi + 1,
                    created_at: new Date().toISOString(),
                  }))
                );
              if (oError) console.error('hearing_options insert error:', oError);
            }
          }
        }
      }
    }

    return NextResponse.json({ id: String(templateId), title, description, subsidyType });
  } catch (e) {
    console.error('POST hearing-templates error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/** PUT: 히어링 템플릿 수정 (질문/선택지 전체 재생성) */
export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const body = await request.json();
    const { id, title, questions } = body as {
      id: string;
      title: string;
      description: string;
      subsidyType: string;
      questions: QuestionInput[];
    };

    if (!id) return NextResponse.json({ error: 'id は必須です。' }, { status: 400 });
    if (!title?.trim()) return NextResponse.json({ error: 'title は必須です。' }, { status: 400 });

    const templateId = Number(id);

    // 본인 소유 확인
    const { data: existing } = await supabaseAdmin
      .from('hearing_templates')
      .select('id')
      .eq('id', templateId)
      .eq('expert_id', user.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'テンプレートが見つかりません。' }, { status: 404 });
    }

    // 템플릿 제목 업데이트
    const { error: htError } = await supabaseAdmin
      .from('hearing_templates')
      .update({ title: title.trim(), updated_at: new Date().toISOString() })
      .eq('id', templateId)
      .eq('expert_id', user.id);

    if (htError) {
      console.error('hearing_templates update error:', htError);
      return NextResponse.json({ error: htError.message }, { status: 500 });
    }

    // 기존 질문의 ID를 가져와서 선택지 삭제 후 질문 삭제
    const { data: oldQuestions } = await supabaseAdmin
      .from('hearing_questions')
      .select('id')
      .eq('template_id', templateId);

    if (oldQuestions && oldQuestions.length > 0) {
      const oldQIds = oldQuestions.map((q: { id: number }) => q.id);
      await supabaseAdmin.from('hearing_options').delete().in('question_id', oldQIds);
      await supabaseAdmin.from('hearing_questions').delete().eq('template_id', templateId);
    }

    // 새 질문 삽입
    const validQuestions = (questions || []).filter((q) => q.question?.trim());
    if (validQuestions.length > 0) {
      const { data: insertedQuestions, error: qError } = await supabaseAdmin
        .from('hearing_questions')
        .insert(
          validQuestions.map((q, i) => ({
            template_id: templateId,
            question_text: q.question.trim(),
            field_type: q.type || 'text',
            is_required: q.required ?? true,
            display_order: i + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
        )
        .select('id');

      if (qError) {
        console.error('hearing_questions re-insert error:', qError);
      }

      if (insertedQuestions) {
        for (let i = 0; i < validQuestions.length; i++) {
          const q = validQuestions[i];
          const insertedQ = insertedQuestions[i];
          if (!insertedQ) continue;
          const opts = q.options?.filter((o) => o?.trim());
          if (opts && opts.length > 0) {
            const { error: oError } = await supabaseAdmin
              .from('hearing_options')
              .insert(
                opts.map((opt, oi) => ({
                  question_id: insertedQ.id,
                  option_text: opt.trim(),
                  display_order: oi + 1,
                  created_at: new Date().toISOString(),
                }))
              );
            if (oError) console.error('hearing_options re-insert error:', oError);
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PUT hearing-templates error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/** DELETE: 히어링 템플릿 삭제 */
export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id は必須です。' }, { status: 400 });

    const templateId = Number(id);

    // 본인 소유 확인
    const { data: existing } = await supabaseAdmin
      .from('hearing_templates')
      .select('id')
      .eq('id', templateId)
      .eq('expert_id', user.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'テンプレートが見つかりません。' }, { status: 404 });
    }

    // 선택지 → 질문 → 템플릿 순서로 삭제
    const { data: oldQuestions } = await supabaseAdmin
      .from('hearing_questions')
      .select('id')
      .eq('template_id', templateId);

    if (oldQuestions && oldQuestions.length > 0) {
      const oldQIds = oldQuestions.map((q: { id: number }) => q.id);
      await supabaseAdmin.from('hearing_options').delete().in('question_id', oldQIds);
      await supabaseAdmin.from('hearing_questions').delete().eq('template_id', templateId);
    }

    const { error } = await supabaseAdmin
      .from('hearing_templates')
      .delete()
      .eq('id', templateId)
      .eq('expert_id', user.id);

    if (error) {
      console.error('hearing_templates delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE hearing-templates error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
