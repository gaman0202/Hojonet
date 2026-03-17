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
            cookieStore.set(name, value, options as { path?: string });
          });
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

async function checkCaseAccess(caseId: string, userId: string) {
  const { data: caseData, error: caseError } = await supabaseAdmin
    .from('cases')
    .select('id, user_group_id, expert_group_id')
    .eq('id', caseId)
    .single();

  if (caseError || !caseData) return { allowed: false as const };

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, user_type, group_id')
    .eq('id', userId)
    .single();

  if (!profile) return { allowed: false as const };

  const userType = profile.user_type ?? '';

  // 紹介者・メンバーは case_members に含まれる案件のみアクセス可
  if (userType === 'member' || userType === 'introducer') {
    const { data: memberRow } = await supabaseAdmin
      .from('case_members')
      .select('id')
      .eq('case_id', caseId)
      .eq('user_id', userId)
      .maybeSingle();
    return { allowed: !!memberRow };
  }

  const isExpertRole = ['expert', 'assistant', 'admin'].includes(userType);
  const hasAccess =
    profile.group_id === caseData.expert_group_id ||
    profile.group_id === caseData.user_group_id ||
    profile.id === caseData.user_group_id ||
    (caseData.expert_group_id == null && isExpertRole);

  return { allowed: hasAccess };
}

/**
 * GET: 案件のメンバー一覧（case_members + 未使用の email_invites）
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { caseId } = await params;
    const caseIdNum = parseInt(caseId, 10);
    if (isNaN(caseIdNum)) return NextResponse.json({ error: '案件IDが無効です。' }, { status: 400 });

    const { allowed } = await checkCaseAccess(caseId, user.id);
    if (!allowed) return NextResponse.json({ error: 'アクセス権限がありません。' }, { status: 403 });

    const { data: caseData } = await supabaseAdmin
      .from('cases')
      .select('user_group_id')
      .eq('id', caseIdNum)
      .single();

    const { data: rows } = await supabaseAdmin
      .from('case_members')
      .select('id, user_id, role, is_primary')
      .eq('case_id', caseIdNum)
      .order('added_at', { ascending: true });

    const userIds = [...new Set((rows || []).map((r: { user_id: string }) => r.user_id))];
    const profileMap = new Map<string, { full_name?: string; email?: string }>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      (profiles || []).forEach((p: { id: string; full_name?: string; email?: string }) => {
        profileMap.set(p.id, { full_name: p.full_name, email: p.email });
      });
    }

    const { data: invites } = await supabaseAdmin
      .from('email_invites')
      .select('id, email, role, created_at')
      .eq('case_id', caseIdNum)
      .is('used_by', null)
      .order('created_at', { ascending: false });

    const inviteEmailsUnique = [...new Set((invites || []).map((inv: { email: string }) => inv.email.trim()).filter(Boolean))];
    const registeredInviteProfiles = new Map<string, { id: string; full_name?: string; email: string }>();
    if (inviteEmailsUnique.length > 0) {
      const { data: existingProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('email', inviteEmailsUnique);
      (existingProfiles || []).forEach((p: { id: string; full_name?: string; email?: string }) => {
        if (p.email) registeredInviteProfiles.set(p.email.trim().toLowerCase(), { id: p.id, full_name: p.full_name, email: p.email });
      });
    }

    // 未使用の招待のうち、既に同メールで登録済みのユーザーがいれば DB を同期（used_by 更新 + case_members 追加）
    for (const inv of (invites || []) as { id: number; email: string; role: string }[]) {
      const emailLower = inv.email.trim().toLowerCase();
      const profile = registeredInviteProfiles.get(emailLower);
      if (!profile) continue;
      await supabaseAdmin
        .from('email_invites')
        .update({ used_by: profile.id, used_at: new Date().toISOString() })
        .eq('id', inv.id)
        .eq('case_id', caseIdNum)
        .is('used_by', null);
      const role = inv.role === 'introducer' ? 'introducer' : 'member';
      const { data: existing } = await supabaseAdmin
        .from('case_members')
        .select('id')
        .eq('case_id', caseIdNum)
        .eq('user_id', profile.id)
        .maybeSingle();
      if (!existing) {
        const { error: insertErr } = await supabaseAdmin
          .from('case_members')
          .insert({ case_id: caseIdNum, user_id: profile.id, role });
        if (insertErr) console.error('case_members sync insert error:', insertErr);
      }
    }

    const members: {
      id: string | number;
      type: 'member' | 'invite';
      name: string;
      email?: string;
      role: 'applicant' | 'introducer' | 'member';
      canDelete: boolean;
    }[] = [];

    const memberEmails = new Set<string>();
    const memberUserIds = new Set<string>();
    (rows || []).forEach((row: {
      id: number;
      user_id: string;
      role: string;
      is_primary?: boolean;
    }) => {
      memberUserIds.add(row.user_id);
      const profile = profileMap.get(row.user_id);
      if (profile?.email) memberEmails.add(profile.email.trim().toLowerCase());
      const name = profile?.full_name?.trim() || profile?.email || '（名前未設定）';
      const role = (row.role === 'introducer' ? 'introducer' : row.role === 'applicant' ? 'applicant' : 'member') as 'applicant' | 'introducer' | 'member';
      const canDelete = role !== 'applicant' && !row.is_primary;
      members.push({
        id: row.user_id,
        type: 'member',
        name,
        email: profile?.email,
        role,
        canDelete,
      });
    });

    // 申請者（案件作成者）を追加: user_group_id に対応する顧客プロフィール
    if (caseData?.user_group_id && !memberUserIds.has(caseData.user_group_id)) {
      const { data: applicantProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, group_id')
        .or(`id.eq.${caseData.user_group_id},group_id.eq.${caseData.user_group_id}`)
        .eq('user_type', 'customer')
        .limit(1)
        .maybeSingle();
      if (applicantProfile && applicantProfile.id) {
        const name = applicantProfile.full_name?.trim() || applicantProfile.email || '（名前未設定）';
        if (applicantProfile.email) memberEmails.add(applicantProfile.email.trim().toLowerCase());
        members.unshift({
          id: applicantProfile.id,
          type: 'member',
          name,
          email: applicantProfile.email,
          role: 'applicant',
          canDelete: false,
        });
      }
    }

    const seenInviteEmails = new Set<string>();
    (invites || []).forEach((inv: { id: number; email: string; role: string }) => {
      const emailLower = inv.email.trim().toLowerCase();
      if (memberEmails.has(emailLower)) return;
      if (seenInviteEmails.has(emailLower)) return;
      seenInviteEmails.add(emailLower);
      const role = (inv.role === 'introducer' ? 'introducer' : 'member') as 'introducer' | 'member';
      const registeredProfile = registeredInviteProfiles.get(emailLower);
      if (registeredProfile) {
        const name = registeredProfile.full_name?.trim() || registeredProfile.email || inv.email;
        members.push({
          id: registeredProfile.id,
          type: 'member',
          name,
          email: registeredProfile.email,
          role,
          canDelete: true,
        });
      } else {
        members.push({
          id: `invite-${inv.id}`,
          type: 'invite',
          name: `${inv.email}（招待中）`,
          email: inv.email,
          role,
          canDelete: true,
        });
      }
    });

    const { data: myProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, group_id')
      .eq('id', user.id)
      .single();
    const isApplicant =
      !!caseData?.user_group_id &&
      (myProfile?.id === caseData.user_group_id ||
        (myProfile?.group_id === caseData.user_group_id && myProfile?.id === myProfile?.group_id));

    return NextResponse.json({ members, isApplicant: !!isApplicant });
  } catch (e) {
    console.error('Members GET error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/**
 * DELETE: メンバーまたは招待を削除
 * Body: { type: 'member', userId: string } | { type: 'invite', inviteId: number }
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { caseId } = await params;
    const caseIdNum = parseInt(caseId, 10);
    if (isNaN(caseIdNum)) return NextResponse.json({ error: '案件IDが無効です。' }, { status: 400 });

    const { allowed } = await checkCaseAccess(caseId, user.id);
    if (!allowed) return NextResponse.json({ error: 'アクセス権限がありません。' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const type = body.type as string | undefined;
    const userId = body.userId as string | undefined;
    const inviteId = body.inviteId as number | undefined;

    if (type === 'member' && userId) {
      const { error } = await supabaseAdmin
        .from('case_members')
        .delete()
        .eq('case_id', caseIdNum)
        .eq('user_id', userId);
      if (error) {
        console.error('case_members delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (type === 'invite' && typeof inviteId === 'number') {
      const { error } = await supabaseAdmin
        .from('email_invites')
        .delete()
        .eq('id', inviteId)
        .eq('case_id', caseIdNum);
      if (error) {
        console.error('email_invites delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'type と userId または inviteId が必要です。' }, { status: 400 });
  } catch (e) {
    console.error('Members DELETE error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
