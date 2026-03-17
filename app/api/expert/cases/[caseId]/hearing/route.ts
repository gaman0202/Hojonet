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
        getAll() { return cookieStore.getAll(); },
        setAll(c: { name: string; value: string; options?: object }[]) {
          c.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : user;
}

/**
 * GET: 専門家向け - 案件のヒアリング回答・テンプレート情報を取得（確認モード用・1回分のみ）
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const caseIdNum = parseInt(caseId, 10);
    if (isNaN(caseIdNum)) {
      return NextResponse.json({ error: '案件IDが無効です。' }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id, user_type')
      .eq('id', user.id)
      .single();
    if (!profile) return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });

    const { data: caseRow, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('id, subsidy_id, user_group_id, expert_group_id, hearing_template_id')
      .eq('id', caseIdNum)
      .single();
    if (caseError || !caseRow) {
      return NextResponse.json({ error: '案件が見つかりません。' }, { status: 404 });
    }

    const isExpert =
      profile.group_id === caseRow.expert_group_id ||
      profile.id === caseRow.expert_group_id ||
      (['expert', 'assistant', 'admin'].includes(profile.user_type ?? '') && caseRow.expert_group_id == null);
    if (!isExpert) {
      return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });
    }

    const { data: submission } = await supabaseAdmin
      .from('case_hearing_submissions')
      .select('payload, submitted_at, status')
      .eq('case_id', caseIdNum)
      .maybeSingle();

    const payload = (submission?.payload as Record<string, string | string[]> | undefined) ?? {};
    const submittedAt = submission?.submitted_at ?? null;
    // status 컬럼으로만 제출 여부 판단（ユーザーAPIと同一ロジックで表示を揃える）
    const dbStatus = submission?.status as string | undefined;
    const status = dbStatus === 'submitted' ? 'submitted' : 'pending';

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
    
    // reviewed 상태는 reviewed_at이 있을 때만
    const finalStatus = reviewedAt ? 'reviewed' : status;

    let customerName = '';
    if (caseRow.user_group_id) {
      const { data: cust } = await supabaseAdmin
        .from('profiles')
        .select('full_name, company_name')
        .or(`id.eq.${caseRow.user_group_id},group_id.eq.${caseRow.user_group_id}`)
        .limit(1)
        .maybeSingle();
      customerName = cust?.company_name || cust?.full_name || '';
    }

    // /hearing/[id] 申込時のフォーム回答（companyName, prefecture 等）の場合は申込時ヒアリングとして表示
    const isInitialFormPayload = typeof payload.companyName !== 'undefined' || typeof payload.prefecture !== 'undefined';
    const INITIAL_FORM_QUESTIONS = [
      { id: 'companyName', question: '会社名', type: 'text' },
      { id: 'prefecture', question: '事業所の所在地（都道府県）', type: 'text' },
      { id: 'businessDescription', question: '現在の主要事業内容を簡単にご説明ください', type: 'text' },
      { id: 'employeeCount', question: '従業員数', type: 'text' },
      { id: 'sales', question: '決算年度の売上高（概算で結構です）', type: 'text' },
      { id: 'needsSupport', question: '行政書士からの支援を希望されますか？', type: 'text' },
      { id: 'supportTypes', question: '行政書士からの支援内容（事業計画書の作成・申請書類の作成等）', type: 'text' },
    ];

    let templateTitle = 'ヒアリングフォーム';
    let questions: { id: string; question: string; type: string; required: boolean }[] = [];

    if (isInitialFormPayload) {
      templateTitle = '補助金ヒアリング（申込時）';
      questions = INITIAL_FORM_QUESTIONS.map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        required: false,
      }));
    } else {
      const templateIdToUse = (caseRow as { hearing_template_id?: number }).hearing_template_id ?? 1;
      const { data: template } = await supabaseAdmin
        .from('hearing_templates')
        .select('id, title, subsidy_id')
        .eq('id', templateIdToUse)
        .single();

      if (template?.title) {
        templateTitle = `${template.title} ヒアリング`;
      } else if (template?.subsidy_id) {
        const { data: subsidy } = await supabaseAdmin
          .from('subsidies')
          .select('title')
          .eq('id', template.subsidy_id)
          .single();
        if (subsidy?.title) templateTitle = `${subsidy.title} ヒアリング`;
      }

      const { data: qRows } = await supabaseAdmin
        .from('hearing_questions')
        .select('id, question_text, field_type, is_required, display_order')
        .eq('template_id', templateIdToUse)
        .order('display_order', { ascending: true });

      questions = (qRows ?? []).map((q: { id: number; question_text: string; field_type: string }, i: number) => ({
        id: `q${i + 1}`,
        question: q.question_text,
        type: (q.field_type || 'text') as string,
        required: false,
      }));
    }

    return NextResponse.json({
      id: `case-${caseIdNum}-hearing`,
      templateTitle,
      customerName,
      status: finalStatus,
      questions,
      responses: payload,
      submittedAt,
      reviewedAt: reviewedAt ?? undefined,
      reviewComment: reviewComment ?? undefined,
    });
  } catch (e) {
    console.error('Expert hearing GET error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
