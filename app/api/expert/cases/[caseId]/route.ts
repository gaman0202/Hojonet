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
        setAll(cookiesToSet) {
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

/** GET: 案件1件 + 申請者（顧客）プロフィールを取得 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { data: caseData, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('id, title, user_group_id, expert_group_id, status, subsidy_id, amount, deadline, progress_rate, created_at, updated_at')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json({ error: '案件が見つかりません。' }, { status: 404 });
    }

    let subsidyTitle: string | null = null;
    let subsidyAmount: string | null = null;
    let regionName = '';
    const sid = caseData.subsidy_id;
    if (sid != null) {
      const { data: sub } = await supabaseAdmin
        .from('subsidies')
        .select('title, amount_description, region_id')
        .eq('id', sid)
        .maybeSingle();
      if (sub) {
        subsidyTitle = (sub as { title?: string }).title?.trim() || null;
        subsidyAmount = (sub as { amount_description?: string }).amount_description?.trim() || null;
        const regionId = (sub as { region_id?: number | null }).region_id;
        if (regionId != null) {
          const { data: region } = await supabaseAdmin
            .from('m_regions')
            .select('name')
            .eq('id', regionId)
            .maybeSingle();
          regionName = (region as { name?: string } | null)?.name?.trim() ?? '';
        }
      }
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_type, group_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません。' }, { status: 404 });
    }

    const isExpertRole = ['expert', 'assistant', 'admin'].includes(profile.user_type ?? '');
    const hasAccess =
      profile.group_id === caseData.expert_group_id ||
      profile.group_id === caseData.user_group_id ||
      (caseData.expert_group_id == null && isExpertRole);

    if (!hasAccess) {
      return NextResponse.json({ error: 'アクセスが拒否されました。' }, { status: 403 });
    }

    let customer: { full_name?: string | null; company_name?: string | null; email?: string | null; phone?: string | null; industry?: string | null; location?: string | null } | null = null;
    const uid = caseData.user_group_id;
    if (uid) {
      const byId = await supabaseAdmin
        .from('profiles')
        .select('full_name, company_name, email, phone, industry, location')
        .eq('id', uid)
        .maybeSingle();
      if (byId.data) {
        customer = byId.data;
      } else {
        const byGroup = await supabaseAdmin
          .from('profiles')
          .select('full_name, company_name, email, phone, industry, location')
          .eq('group_id', uid)
          .limit(1)
          .maybeSingle();
        if (byGroup.data) customer = byGroup.data;
      }
    }

    const displayTitle = caseData.title?.trim() || subsidyTitle || '案件';
    const displayAmount = caseData.amount?.trim() || subsidyAmount || '';
    const deadlineStr = caseData.deadline
      ? (() => {
          const d = new Date(caseData.deadline);
          return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })()
      : '';
    const createdStr = caseData.created_at
      ? (() => {
          const d = new Date(caseData.created_at);
          return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })()
      : '';
    const updatedStr = caseData.updated_at
      ? (() => {
          const d = new Date(caseData.updated_at);
          return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })()
      : '';

    return NextResponse.json({
      case: {
        id: caseData.id,
        title: caseData.title,
        user_group_id: caseData.user_group_id,
        expert_group_id: caseData.expert_group_id,
        status: caseData.status,
        subsidy_id: caseData.subsidy_id,
        amount: caseData.amount,
      },
      subsidyTitle: displayTitle,
      subsidyAmount: displayAmount,
      caseInfo: {
        deadline: deadlineStr,
        progress: caseData.progress_rate ?? 0,
        amount: displayAmount || (caseData.amount ?? ''),
        region: regionName || '全国',
        createdDate: createdStr,
        lastModified: updatedStr,
      },
      customer: customer
        ? {
            name: customer.full_name?.trim() || customer.email?.trim() || '',
            company: customer.company_name?.trim() || '',
            email: customer.email?.trim() || '',
            contact: customer.phone?.trim() || '',
            industry: customer.industry?.trim() || '',
            region: customer.location?.trim() || '',
          }
        : null,
    });
  } catch (e) {
    console.error('GET expert case error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
