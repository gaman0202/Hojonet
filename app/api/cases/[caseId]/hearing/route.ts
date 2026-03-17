import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * PUT: 案件に紐づくヒアリング回答を保存（提出 or 下書き）
 * Body: { responses: Record<string, string | string[]>, status: 'draft' | 'submitted' }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { caseId } = await params;
    const caseIdNum = parseInt(caseId, 10);
    if (isNaN(caseIdNum)) {
      return NextResponse.json({ error: '案件IDが無効です。' }, { status: 400 });
    }

    const body = await request.json();
    const responses = body.responses as Record<string, string | string[]>;
    const status = body.status === 'submitted' ? 'submitted' : 'draft';

    if (!responses || typeof responses !== 'object') {
      return NextResponse.json({ error: '回答（responses）は必須です。' }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });
    }

    const { data: caseRow, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('id, user_group_id')
      .eq('id', caseIdNum)
      .single();

    if (caseError || !caseRow) {
      return NextResponse.json({ error: '案件が見つかりません。' }, { status: 404 });
    }

    const isOwner = caseRow.user_group_id === profile.id || caseRow.user_group_id === profile.group_id;
    if (!isOwner) {
      return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });
    }

    const now = new Date().toISOString();

    const { error: upsertError } = await supabaseAdmin
      .from('case_hearing_submissions')
      .upsert(
        {
          case_id: caseIdNum,
          payload: responses,
          status, // 'draft' or 'submitted'
          submitted_at: now,
          updated_at: now,
        },
        { onConflict: 'case_id' }
      );

    if (upsertError) {
      console.error('Hearing save error:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status });
  } catch (e) {
    console.error('Cases hearing API error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/**
 * GET: 案件に紐づくヒアリング回答を取得
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { caseId } = await params;
    const caseIdNum = parseInt(caseId, 10);
    if (isNaN(caseIdNum)) {
      return NextResponse.json({ error: '案件IDが無効です。' }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });
    }

    const { data: caseRow, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('id, user_group_id, hearing_template_id')
      .eq('id', caseIdNum)
      .single();

    if (caseError || !caseRow) {
      return NextResponse.json({ error: '案件が見つかりません。' }, { status: 404 });
    }

    const isOwner = caseRow.user_group_id === profile.id || caseRow.user_group_id === profile.group_id;
    if (!isOwner) {
      return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });
    }

    const { data: submission } = await supabaseAdmin
      .from('case_hearing_submissions')
      .select('payload, submitted_at, status')
      .eq('case_id', caseIdNum)
      .maybeSingle();

    const responses = (submission?.payload as Record<string, string | string[]>) ?? {};
    const submittedAt = submission?.submitted_at ?? null;
    // status 컬럼으로 제출 여부 판단 (submitted_at이 아닌 명시적 status 사용)
    const dbStatus = submission?.status as string | undefined;
    let status: 'pending' | 'submitted' | 'reviewed' = 'pending';
    
    // reviewed_at과 review_comment는 별도로 조회 (컬럼이 없을 수 있음)
    let reviewedAt: string | null = null;
    let reviewComment: string | null = null;
    try {
      const { data: reviewData } = await supabaseAdmin
        .from('case_hearing_submissions')
        .select('reviewed_at, review_comment')
        .eq('case_id', caseIdNum)
        .maybeSingle();
      reviewedAt = reviewData?.reviewed_at ?? null;
      reviewComment = reviewData?.review_comment ?? null;
    } catch (e) {
      // reviewed_at 컬럼이 없으면 무시
    }
    
    // 상태 판단: reviewed_at이 있으면 reviewed, 없으면 status 컬럼 확인
    if (reviewedAt) {
      status = 'reviewed';
    } else if (dbStatus === 'submitted') {
      status = 'submitted';
    } else if (responses && typeof responses === 'object' && ('companyName' in responses || 'prefecture' in responses)) {
      // 旧フォーム申込で payload のみ保存され status 未設定の場合は「回答済み」扱い
      const leg = responses as Record<string, unknown>;
      if (leg.companyName || leg.prefecture || leg.businessDescription) status = 'submitted';
    }

    const hearingTemplateId = (caseRow as { hearing_template_id?: number }).hearing_template_id;
    const templateIdToUse = hearingTemplateId ?? 1;

    let templateId: string | null = null;
    let templateTitle: string | null = null;
    let questions: { id: string; question: string; type: string; required: boolean; options?: string[] }[] = [];

    const { data: template } = await supabaseAdmin
      .from('hearing_templates')
      .select('id, title, subsidy_id')
      .eq('id', templateIdToUse)
      .single();

    if (template) {
      templateId = String(template.id);
      // テンプレートにtitleがあればそれを使用、なければ補助金名を使用
      if (template.title) {
        templateTitle = `${template.title} ヒアリング`;
      } else {
        const { data: subsidy } = await supabaseAdmin
          .from('subsidies')
          .select('title')
          .eq('id', template.subsidy_id)
          .single();
        templateTitle = subsidy?.title ? `${subsidy.title} ヒアリング` : 'ヒアリングフォーム';
      }

      const { data: qRows } = await supabaseAdmin
        .from('hearing_questions')
        .select('id, question_text, field_type, is_required, display_order')
        .eq('template_id', templateIdToUse)
        .order('display_order', { ascending: true });

      if (qRows?.length) {
        const qIds = qRows.map((_, i) => `q${i + 1}`);
        const optionsByQuestion: Record<number, string[]> = {};
        const { data: optRows } = await supabaseAdmin
          .from('hearing_options')
          .select('question_id, option_text, display_order')
          .in('question_id', qRows.map((q: { id: number }) => q.id))
          .order('display_order', { ascending: true });
        for (const o of optRows ?? []) {
          const qid = o.question_id as number;
          if (!optionsByQuestion[qid]) optionsByQuestion[qid] = [];
          optionsByQuestion[qid].push(o.option_text as string);
        }
        questions = qRows.map((q: { id: number; question_text: string; field_type: string; is_required: boolean }, i: number) => ({
          id: qIds[i],
          question: q.question_text,
          type: q.field_type || 'text',
          required: !!q.is_required,
          options: optionsByQuestion[q.id]?.length ? optionsByQuestion[q.id] : undefined,
        }));

        // 旧フォーム（/hearing/[id] 申込）の payload が companyName, prefecture 等の場合は q1,q2,... に変換して表示
        const hasLegacyKeys = 'companyName' in responses || 'prefecture' in responses || 'businessDescription' in responses;
        const hasQ1 = typeof responses.q1 !== 'undefined';
        if (hasLegacyKeys && !hasQ1 && questions.length > 0) {
          const legacy = responses as Record<string, string | string[]>;
          const mapLegacyToQ = (questionText: string, i: number): string | string[] => {
            const t = (questionText ?? '').trim();
            if (/会社名|企業名/.test(t)) return (legacy.companyName as string) ?? '';
            if (/都道府県|所在地/.test(t)) return (legacy.prefecture as string) ?? '';
            if (/事業内容|主な事業|開発言語|技術/.test(t)) return (legacy.businessDescription as string) ?? '';
            if (/従業員数/.test(t)) return (legacy.employeeCount as string) ?? '';
            if (/売上/.test(t)) return (legacy.sales as string) ?? '';
            if (/支援|行政書士/.test(t)) {
              const s = legacy.supportTypes;
              return Array.isArray(s) ? s : (s ? [String(s)] : []);
            }
            return '';
          };
          const mapped: Record<string, string | string[]> = {};
          questions.forEach((q, i) => {
            mapped[q.id] = mapLegacyToQ(q.question, i);
          });
          Object.assign(responses, mapped);
        }
      }
    }

    return NextResponse.json({
      templateId,
      templateTitle,
      questions,
      responses,
      submittedAt,
      reviewedAt: reviewedAt ?? undefined,
      reviewComment: reviewComment ?? undefined,
      status,
    });
  } catch (e) {
    console.error('Cases hearing GET error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
