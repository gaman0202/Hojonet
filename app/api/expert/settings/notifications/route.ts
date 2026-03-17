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

const DEFAULT_NOTIFICATIONS = {
  deadline_reminder: true,
  new_case_notification: true,
  document_upload_notification: true,
  message_notification: true,
  system_maintenance: true,
  new_feature_release: true,
};

function toResponse(row: Record<string, unknown> | null) {
  if (!row) {
    return {
      deadlineReminder: DEFAULT_NOTIFICATIONS.deadline_reminder,
      newCaseNotification: DEFAULT_NOTIFICATIONS.new_case_notification,
      documentUploadNotification: DEFAULT_NOTIFICATIONS.document_upload_notification,
      messageNotification: DEFAULT_NOTIFICATIONS.message_notification,
      systemMaintenance: DEFAULT_NOTIFICATIONS.system_maintenance,
      newFeatureRelease: DEFAULT_NOTIFICATIONS.new_feature_release,
    };
  }
  return {
    deadlineReminder: row.deadline_reminder ?? DEFAULT_NOTIFICATIONS.deadline_reminder,
    newCaseNotification: row.new_case_notification ?? DEFAULT_NOTIFICATIONS.new_case_notification,
    documentUploadNotification: row.document_upload_notification ?? DEFAULT_NOTIFICATIONS.document_upload_notification,
    messageNotification: row.message_notification ?? DEFAULT_NOTIFICATIONS.message_notification,
    systemMaintenance: row.system_maintenance ?? DEFAULT_NOTIFICATIONS.system_maintenance,
    newFeatureRelease: row.new_feature_release ?? DEFAULT_NOTIFICATIONS.new_feature_release,
  };
}

/** GET: 通知設定を取得 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { data: row, error } = await supabaseAdmin
      .from('notification_settings')
      .select('deadline_reminder, new_case_notification, document_upload_notification, message_notification, system_maintenance, new_feature_release')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('GET notifications error:', error);
      return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
    }

    return NextResponse.json({
      notifications: toResponse(row ?? null),
    });
  } catch (e) {
    console.error('GET notifications error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/** PATCH: 通知設定を更新 */
export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const body = await request.json();
    const {
      deadlineReminder,
      newCaseNotification,
      documentUploadNotification,
      messageNotification,
      systemMaintenance,
      newFeatureRelease,
    } = body;

    const payload = {
      user_id: user.id,
      deadline_reminder: typeof deadlineReminder === 'boolean' ? deadlineReminder : undefined,
      new_case_notification: typeof newCaseNotification === 'boolean' ? newCaseNotification : undefined,
      document_upload_notification: typeof documentUploadNotification === 'boolean' ? documentUploadNotification : undefined,
      message_notification: typeof messageNotification === 'boolean' ? messageNotification : undefined,
      system_maintenance: typeof systemMaintenance === 'boolean' ? systemMaintenance : undefined,
      new_feature_release: typeof newFeatureRelease === 'boolean' ? newFeatureRelease : undefined,
    };
    const filtered = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined)
    ) as Record<string, unknown>;

    const { error } = await supabaseAdmin
      .from('notification_settings')
      .upsert(
        { ...filtered, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('PATCH notifications error:', error);
      return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('PATCH notifications error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
