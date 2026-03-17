import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { createUser } from '@/lib/admin/users';

/**
 * GET: 全ユーザーをグループ別にまとめて返す
 * - 顧客グループ: customer + member + (introducer via case_members)
 * - 専門家グループ: expert + assistant
 */
export async function GET() {
  try {
    // 全プロフィール取得
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, company_name, industry, location, user_type, group_id, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Admin customers GET profiles error:', error);
      return NextResponse.json({ error: 'データの取得に失敗しました。' }, { status: 500 });
    }

    const allProfiles = (profiles ?? []) as {
      id: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
      company_name: string | null;
      industry: string | null;
      location: string | null;
      user_type: string;
      group_id: string;
      created_at: string;
    }[];

    // 案件数をuser_group_idごとに集計
    const { data: casesData } = await supabaseAdmin
      .from('cases')
      .select('id, user_group_id, expert_group_id, status');
    const cases = (casesData ?? []) as { id: number; user_group_id: string | null; expert_group_id: string | null; status: string }[];

    const activeCasesByUserGroup: Record<string, number> = {};
    const activeCasesByExpertGroup: Record<string, number> = {};
    const activeStatuses = new Set(['draft', 'submitted', 'under_review', 'hearing', 'pending_contract', 'in_progress', 'consultation']);
    for (const c of cases) {
      if (c.user_group_id && activeStatuses.has(c.status ?? '')) {
        activeCasesByUserGroup[c.user_group_id] = (activeCasesByUserGroup[c.user_group_id] ?? 0) + 1;
      }
      if (c.expert_group_id && activeStatuses.has(c.status ?? '')) {
        activeCasesByExpertGroup[c.expert_group_id] = (activeCasesByExpertGroup[c.expert_group_id] ?? 0) + 1;
      }
    }

    // グループIDでまとめる
    const customerGroupMap = new Map<string, typeof allProfiles>();
    const expertGroupMap = new Map<string, typeof allProfiles>();

    for (const p of allProfiles) {
      const isExpertType = ['expert', 'assistant'].includes(p.user_type);
      const isAdminType = p.user_type === 'admin';
      if (isAdminType) continue; // 管理者はスキップ

      const map = isExpertType ? expertGroupMap : customerGroupMap;
      const arr = map.get(p.group_id) ?? [];
      arr.push(p);
      map.set(p.group_id, arr);
    }

    const USER_TYPE_LABELS: Record<string, string> = {
      customer: '申請者',
      member: 'メンバー',
      introducer: '紹介者',
      expert: '専門家',
      assistant: 'アシスタント',
      admin: '管理者',
    };

    function buildGroup(groupId: string, members: typeof allProfiles, type: 'customer' | 'expert') {
      // グループのリーダー（customer or expert）を先頭にソート
      const leaderType = type === 'customer' ? 'customer' : 'expert';
      const sorted = [...members].sort((a, b) => {
        if (a.user_type === leaderType && b.user_type !== leaderType) return -1;
        if (a.user_type !== leaderType && b.user_type === leaderType) return 1;
        return 0;
      });
      const leader = sorted[0];
      const activeCases = type === 'customer'
        ? (activeCasesByUserGroup[groupId] ?? 0)
        : (activeCasesByExpertGroup[groupId] ?? 0);

      return {
        groupId,
        groupName: leader?.company_name?.trim() || leader?.full_name?.trim() || leader?.email?.trim() || '（名前なし）',
        groupType: type,
        activeCases,
        members: sorted.map((m) => ({
          id: m.id,
          fullName: m.full_name?.trim() || '（名前なし）',
          email: m.email?.trim() ?? '',
          phone: m.phone?.trim() ?? '',
          companyName: m.company_name?.trim() ?? '',
          industry: m.industry?.trim() ?? '',
          location: m.location?.trim() ?? '',
          userType: m.user_type,
          userTypeLabel: USER_TYPE_LABELS[m.user_type] ?? m.user_type,
          nameInitial: (m.full_name?.trim() || m.email?.trim() || '?').charAt(0),
          createdAt: m.created_at,
        })),
      };
    }

    const customerGroups = Array.from(customerGroupMap.entries()).map(([gid, members]) =>
      buildGroup(gid, members, 'customer')
    );
    const expertGroups = Array.from(expertGroupMap.entries()).map(([gid, members]) =>
      buildGroup(gid, members, 'expert')
    );

    // 進行中案件数で降順ソート、同数なら名前順
    const sortFn = (a: { activeCases: number; groupName: string }, b: { activeCases: number; groupName: string }) =>
      b.activeCases - a.activeCases || a.groupName.localeCompare(b.groupName);
    customerGroups.sort(sortFn);
    expertGroups.sort(sortFn);

    // ユーザータブ用: 顧客・メンバー・紹介者をフラット一覧
    const userProfiles = customerGroups.flatMap((g) =>
      g.members.map((m) => ({
        ...m,
        groupId: g.groupId,
        groupName: g.groupName,
        activeCases: g.activeCases,
      }))
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 専門家タブ用: 専門家・アシスタントをフラット一覧
    const expertProfiles = expertGroups.flatMap((g) =>
      g.members.map((m) => ({
        ...m,
        groupId: g.groupId,
        groupName: g.groupName,
        activeCases: g.activeCases,
      }))
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      customerGroups,
      expertGroups,
      userProfiles,
      expertProfiles,
      totalUsers: userProfiles.length,
      totalExperts: expertProfiles.length,
    });
  } catch (e) {
    console.error('Admin customers GET error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/**
 * POST: 管理者がユーザーを新規追加（会員登録なしで）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, companyName, phone, businessType, location, industry, employees, userType, groupId } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'メールアドレスとパスワードは必須です' }, { status: 400 });
    }

    const result = await createUser(supabaseAdmin, {
      email,
      password,
      name,
      companyName,
      phone,
      businessType,
      location,
      industry,
      employees,
      userType: userType || 'customer',
      groupId,
    });

    return NextResponse.json({ success: true, user: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'サーバーエラーが発生しました。';
    if (message === 'USER_ALREADY_EXISTS') {
      return NextResponse.json({ error: 'このメールアドレスは既に登録されています。' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
