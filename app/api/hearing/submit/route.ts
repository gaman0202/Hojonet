import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface HearingFormPayload {
  companyName?: string;
  prefecture?: string;
  businessDescription?: string;
  employeeCount?: string;
  sales?: string;
  needsSupport?: string;
  supportTypes?: string[];
}

export interface HearingSubmitBody {
  subsidyId: number;
  expertId?: string | null;
  formData: HearingFormPayload;
}

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
 * POST: ヒアリング申込（案件作成 + 初期タスク + 回答保存）
 * Body: { subsidyId, expertId?, formData }
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = (await request.json()) as HearingSubmitBody;
    const { subsidyId, expertId: selectedExpertId, formData } = body;

    if (!subsidyId || typeof subsidyId !== 'number') {
      return NextResponse.json({ error: '補助金IDは必須です。' }, { status: 400 });
    }

    // 申請者プロフィール（専門家通知で顧客名に使用）
    // プロフィールが存在しない場合は自動生成してフローを継続する
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'プロフィールの取得に失敗しました。', error_code: 'profile_fetch_error' }, { status: 500 });
    }

    if (!profile) {
      // プロフィールが未作成の場合、最低限の情報で自動生成する
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email ?? '',
          full_name: user.user_metadata?.name ?? user.email ?? '',
          company_name: user.user_metadata?.companyName ?? null,
          business_type: user.user_metadata?.businessType ?? '',
          location: user.user_metadata?.location ?? '',
          industry: user.user_metadata?.industry ?? '',
          employees: user.user_metadata?.employees ?? '',
          user_type: 'customer',
          group_id: user.id,
        }, { onConflict: 'id' })
        .select('id, full_name')
        .single();

      if (insertError || !newProfile) {
        console.error('Profile auto-create error:', insertError);
        return NextResponse.json(
          { error: 'プロフィール情報の登録が必要です。マイページから情報を入力してください。', error_code: 'profile_missing' },
          { status: 400 }
        );
      }

      profile = newProfile;
    }

    // 補助金情報
    const { data: subsidy, error: subsidyError } = await supabaseAdmin
      .from('subsidies')
      .select('id, title, amount_description, application_period_end')
      .eq('id', subsidyId)
      .single();

    if (subsidyError || !subsidy) {
      return NextResponse.json({ error: '補助金が見つかりません。' }, { status: 404 });
    }

    // 担当専門家の解決（選択済み or 先頭1件）
    // URLで選んだ expertId があれば、そのプロフィールが存在する限り担当者にする（user_type 不問）
    let expertId: string | null = null;
    let expertGroupId: string | null = null;
    if (selectedExpertId?.trim()) {
      const { data: expertProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, group_id')
        .eq('id', selectedExpertId.trim())
        .maybeSingle();
      if (expertProfile) {
        const p = expertProfile as { id: string; group_id?: string | null };
        expertId = p.id;
        expertGroupId = p.group_id ?? p.id;
      }
    }
    if (!expertId) {
      const { data: experts } = await supabaseAdmin
        .from('profiles')
        .select('id, group_id')
        .in('user_type', ['expert', 'assistant', 'admin'])
        .limit(1);
      const first = experts?.[0] as { id: string; group_id?: string | null } | undefined;
      if (first) {
        expertId = first.id;
        expertGroupId = first.group_id ?? first.id;
      }
    }

    const title = subsidy.title || '案件';
    const amount = subsidy.amount_description || '';
    const subsidyEnd = (subsidy as { application_period_end?: string | null }).application_period_end;
    const deadline = subsidyEnd
      ? (typeof subsidyEnd === 'string' ? subsidyEnd : new Date(subsidyEnd).toISOString().split('T')[0])
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const taskDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // デフォルトヒアリングテンプレート（id=1）を取得
    const { data: defaultTemplate } = await supabaseAdmin
      .from('hearing_templates')
      .select('id')
      .eq('id', 1)
      .maybeSingle();
    const defaultTemplateId = defaultTemplate?.id ?? null;

    // 案件作成
    const { data: newCase, error: caseError } = await supabaseAdmin
      .from('cases')
      .insert({
        subsidy_id: subsidyId,
        user_group_id: profile.id,
        expert_group_id: expertGroupId ?? expertId,
        assignee_id: expertId,
        title,
        status: 'consultation',
        progress_rate: 0,
        contract_status: 'negotiating',
        amount,
        deadline,
        hearing_template_id: defaultTemplateId, // デフォルトテンプレートを自動割り当て
        needs_attention: false,
        unread_message_count: 0,
        pending_task_count: 5,
        urgent_task_count: 0,
      })
      .select('id')
      .single();

    if (caseError || !newCase) {
      console.error('Case creation error:', caseError);
      return NextResponse.json({ error: caseError?.message || '案件の作成に失敗しました。' }, { status: 500 });
    }

    const { data: subsidySteps } = await supabaseAdmin
      .from('subsidy_steps')
      .select('step_order, title, subtitle, description, estimated_days')
      .eq('subsidy_id', subsidyId)
      .order('step_order', { ascending: true });
    if (subsidySteps?.length) {
      await supabaseAdmin.from('case_steps').insert(
        subsidySteps.map((s, i) => ({
          case_id: newCase.id,
          step_order: s.step_order,
          title: s.title ?? `ステップ${s.step_order}`,
          subtitle: s.subtitle ?? '',
          description: (s as { description?: string | null }).description ?? null,
          estimated_days: (s as { estimated_days?: number | null }).estimated_days ?? null,
          status: i === 0 ? 'in_progress' : 'pending',
        }))
      );
    }

    // ヒアリング回答保存（申込時フォームのまま保存。専門家が「回答を確認」で /hearing 申込内容を表示）
    await supabaseAdmin.from('case_hearing_submissions').upsert(
      {
        case_id: newCase.id,
        payload: (formData || {}) as Record<string, string | string[]>,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'case_id' }
    );

    // 初期タスク 3 件
    const initialTasks = [
      { title: 'ヒアリング情報確認', description: 'ヒアリング内容を確認してください', priority: 'high' as const },
      { title: '必要書類の収集', description: '申請に必要な書類を準備してください', priority: 'high' as const },
      { title: '事業計画書の作成', description: '事業計画書の初案を作成してください', priority: 'medium' as const },
    ];

    for (const task of initialTasks) {
      await supabaseAdmin.from('tasks').insert({
        case_id: newCase.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: 'pending',
        deadline: taskDeadline,
      });
    }

    // 専門家へ「お客様がヒアリングフォームを提出しました」メール送信
    if (resend && expertGroupId) {
      const { data: expertProfiles } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .or(`group_id.eq.${expertGroupId},id.eq.${expertGroupId}`);
      const expertEmails = (expertProfiles ?? []).map((p) => p.email).filter((e): e is string => Boolean(e?.trim()));
      const customerName = (profile as { full_name?: string | null }).full_name || 'お客様';
      const subsidyTitle = subsidy.title || '補助金';
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hojonet.vercel.app';
      const fromRaw = process.env.RESEND_FROM_EMAIL || 'noreply@yoyaku4u.jp';
      const fromEmail = fromRaw.includes('<') ? fromRaw : `補助NET <${fromRaw}>`;
      if (expertEmails.length > 0) {
        await resend.emails.send({
          from: fromEmail,
          to: expertEmails,
          subject: `【補助NET】${customerName}様がヒアリングフォームを提出しました（${subsidyTitle}）`,
          html: `
            <p>${customerName}様が「${subsidyTitle}」のヒアリングフォームを提出しました。</p>
            <p>案件ID: ${newCase.id}</p>
            <p><a href="${baseUrl}/expert/management/${expertId}/${newCase.id}">案件画面で確認する</a></p>
          `,
        });
      }
    }

    return NextResponse.json({ caseId: newCase.id });
  } catch (e) {
    console.error('Hearing submit API error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
