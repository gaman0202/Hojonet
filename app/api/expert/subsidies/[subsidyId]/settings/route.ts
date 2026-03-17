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
        setAll(c: { name: string; value: string; options?: object }[]) {
          c.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as { path?: string })
          );
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : user;
}

/** GET: 補助金の詳細設定（進行段階・ヒアリング質問・タスクテンプレート）を取得 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subsidyId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { subsidyId } = await params;
    const sid = parseInt(subsidyId, 10);
    if (isNaN(sid)) return NextResponse.json({ error: '補助金IDが無効です。' }, { status: 400 });

    const { data: config } = await supabaseAdmin
      .from('expert_subsidy_configs')
      .select('default_steps, default_tasks, hearing_template_id')
      .eq('expert_id', user.id)
      .eq('subsidy_id', sid)
      .maybeSingle();

    const steps: { id: number; stepName: string; subtitle: string; description: string; estimatedDays: number }[] = [];
    const rawSteps = (config?.default_steps as { stepName?: string; subtitle?: string; description?: string; estimated_days?: number }[] | null) ?? [];
    rawSteps.forEach((s, i) =>
      steps.push({
        id: i + 1,
        stepName: s.stepName ?? '',
        subtitle: s.subtitle ?? '',
        description: s.description ?? '',
        estimatedDays: typeof s.estimated_days === 'number' ? s.estimated_days : 0,
      })
    );
    if (steps.length === 0) {
      steps.push(
        { id: 1, stepName: '', subtitle: '', description: '', estimatedDays: 3 },
        { id: 2, stepName: '', subtitle: '', description: '', estimatedDays: 7 }
      );
    }

    const rawTasks = (config?.default_tasks as { title?: string }[] | null) ?? [];
    const tasks = rawTasks.map((t) => t.title ?? '').filter(Boolean);
    if (rawTasks.length > 0 && tasks.length === 0) tasks.push('');

    let hearingQuestions: string[] = [];
    const templateId = (config as { hearing_template_id?: number | null })?.hearing_template_id;
    if (templateId) {
      const { data: questions } = await supabaseAdmin
        .from('hearing_questions')
        .select('question_text')
        .eq('template_id', templateId)
        .order('display_order', { ascending: true });
      hearingQuestions = (questions ?? []).map((q: { question_text?: string }) => q.question_text ?? '');
    }
    const { data: templateBySubsidy } = await supabaseAdmin
      .from('hearing_templates')
      .select('id')
      .eq('subsidy_id', sid)
      .maybeSingle();
    if (templateBySubsidy && !templateId) {
      const { data: qs } = await supabaseAdmin
        .from('hearing_questions')
        .select('question_text')
        .eq('template_id', (templateBySubsidy as { id: number }).id)
        .order('display_order', { ascending: true });
      hearingQuestions = (qs ?? []).map((q: { question_text?: string }) => q.question_text ?? '');
    }

    return NextResponse.json({
      steps,
      hearingQuestions: hearingQuestions.length ? hearingQuestions : [],
      tasks: tasks.length ? tasks : [],
    });
  } catch (e) {
    console.error('Settings GET error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/** PUT: 補助金の詳細設定を保存 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ subsidyId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { subsidyId } = await params;
    const sid = parseInt(subsidyId, 10);
    if (isNaN(sid)) return NextResponse.json({ error: '補助金IDが無効です。' }, { status: 400 });

    const body = await request.json();
    const steps = Array.isArray(body.steps) ? body.steps : [];
    const hearingQuestions = Array.isArray(body.hearingQuestions) ? body.hearingQuestions : [];
    const tasks = Array.isArray(body.tasks) ? body.tasks : [];

    let hearingTemplateId: number | null = null;
    const { data: existingTemplate } = await supabaseAdmin
      .from('hearing_templates')
      .select('id')
      .eq('subsidy_id', sid)
      .maybeSingle();

    if (existingTemplate) {
      hearingTemplateId = (existingTemplate as { id: number }).id;
      const { error: delErr } = await supabaseAdmin
        .from('hearing_questions')
        .delete()
        .eq('template_id', hearingTemplateId);
      if (delErr) console.error('Delete hearing_questions error:', delErr);
    } else {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('hearing_templates')
        .insert({ subsidy_id: sid })
        .select('id')
        .single();
      if (insErr) {
        console.error('Insert hearing_templates error:', insErr);
        return NextResponse.json({ error: 'ヒアリングテンプレートの作成に失敗しました。' }, { status: 500 });
      }
      hearingTemplateId = (inserted as { id: number }).id;
    }

    const toInsert = hearingQuestions
      .map((q: string, i: number) => ({ q: String(q).trim(), order: i + 1 }))
      .filter((x: { q: string }) => x.q !== '');
    if (toInsert.length > 0 && hearingTemplateId != null) {
      const { error: qErr } = await supabaseAdmin.from('hearing_questions').insert(
        toInsert.map((x: { q: string; order: number }) => ({
          template_id: hearingTemplateId,
          question_text: x.q,
          field_type: 'text',
          is_required: true,
          display_order: x.order,
        }))
      );
      if (qErr) console.error('hearing_questions insert error:', qErr);
    }

    const defaultSteps = steps.map((s: { stepName?: string; subtitle?: string; description?: string; estimatedDays?: number }) => ({
      stepName: s.stepName ?? '',
      subtitle: s.subtitle ?? '',
      description: s.description ?? '',
      estimated_days: typeof s.estimatedDays === 'number' ? s.estimatedDays : 0,
    }));
    const defaultTasks = tasks.map((t: string) => ({ title: String(t).trim() })).filter((t: { title: string }) => t.title !== '');

    const { error: upsertErr } = await supabaseAdmin
      .from('expert_subsidy_configs')
      .upsert(
        {
          expert_id: user.id,
          subsidy_id: sid,
          default_steps: defaultSteps,
          default_tasks: defaultTasks,
          hearing_template_id: hearingTemplateId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'expert_id,subsidy_id' }
      );

    if (upsertErr) {
      console.error('expert_subsidy_configs upsert error:', upsertErr);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Settings PUT error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
