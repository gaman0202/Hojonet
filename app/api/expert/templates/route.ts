// app/api/expert/templates/route.ts

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

function formatDate(d: string | null): string {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const TEMPLATE_BUCKET = 'template-files';

async function uploadTemplateFile(file: File, expertId: string): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${expertId}/${crypto.randomUUID()}_${safeName}`;
  const { data, error } = await supabaseAdmin.storage
    .from(TEMPLATE_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type || 'application/octet-stream', upsert: false });
  if (error) throw new Error(error.message);
  return data.path;
}

async function parseRequestBody(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    return {
      id: formData.get('id') as string | null,
      type: formData.get('type') as string,
      category: formData.get('category') as string | null,
      title: formData.get('title') as string,
      description: formData.get('description') as string | null,
      content: formData.get('content') as string | null,
      action_type: formData.get('action_type') as string | null,
      action_url: formData.get('action_url') as string | null,
      priority: formData.get('priority') as string | null,
      assignee_role: formData.get('assignee_role') as string | null,
      file: formData.get('file') as File | null,
    };
  }
  const body = await request.json();
  return { ...body, file: null };
}

/** POST: 템플릿 생성 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { type, category, title, description, content, action_type, action_url, priority, assignee_role, file } = await parseRequestBody(request);

    if (!type || !title?.trim()) {
      return NextResponse.json({ error: 'type と title は必須です。' }, { status: 400 });
    }

    let filePath: string | null = null;
    if (file && file.size > 0) {
      filePath = await uploadTemplateFile(file, user.id);
    }

    const { data, error } = await supabaseAdmin
      .from('templates')
      .insert({
        expert_id: user.id,
        type,
        category: category ?? null,
        title: title.trim(),
        description: description?.trim() ?? null,
        content: content?.trim() ?? null,
        action_type: filePath ? 'download' : (action_type ?? null),
        action_url: action_url?.trim() ?? null,
        file_path: filePath,
        file_name: file?.name ?? null,
        priority: priority ?? null,
        assignee_role: assignee_role ?? null,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      if (filePath) await supabaseAdmin.storage.from(TEMPLATE_BUCKET).remove([filePath]);
      console.error('Template insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: String(data.id) });
  } catch (e) {
    console.error('POST expert templates error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/** PUT: 템플릿 수정 */
export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { id, type, category, title, description, content, action_type, action_url, priority, assignee_role, file } = await parseRequestBody(request);

    if (!id) return NextResponse.json({ error: 'id は必須です。' }, { status: 400 });

    let filePath: string | null = null;
    if (file && file.size > 0) {
      // 기존 파일 삭제
      const { data: existing } = await supabaseAdmin.from('templates').select('file_path').eq('id', id).eq('expert_id', user.id).maybeSingle();
      if (existing?.file_path) {
        await supabaseAdmin.storage.from(TEMPLATE_BUCKET).remove([existing.file_path]);
      }
      filePath = await uploadTemplateFile(file, user.id);
    }

    const updatePayload: Record<string, unknown> = {
      type,
      category: category ?? null,
      title: title?.trim() ?? null,
      description: description?.trim() ?? null,
      content: content?.trim() ?? null,
      action_type: filePath ? 'download' : (action_type ?? null),
      action_url: action_url?.trim() ?? null,
      priority: priority ?? null,
      assignee_role: assignee_role ?? null,
      updated_at: new Date().toISOString(),
    };
    if (filePath) {
      updatePayload.file_path = filePath;
      updatePayload.file_name = file?.name ?? null;
    }

    const { error } = await supabaseAdmin
      .from('templates')
      .update(updatePayload)
      .eq('id', id)
      .eq('expert_id', user.id);

    if (error) {
      console.error('Template update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PUT expert templates error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/** DELETE: 템플릿 삭제 */
export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id は必須です。' }, { status: 400 });

    const { data: existing } = await supabaseAdmin
      .from('templates')
      .select('file_path')
      .eq('id', id)
      .eq('expert_id', user.id)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('expert_id', user.id);

    if (error) {
      console.error('Template delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (existing?.file_path) {
      await supabaseAdmin.storage.from(TEMPLATE_BUCKET).remove([existing.file_path]);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE expert templates error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

/** GET: 전문가의 템플릿 목록 (메시지・서류・タスク・ヒアリング) */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { data: rows, error: tError } = await supabaseAdmin
      .from('templates')
      .select('id, type, category, title, description, content, file_path, file_name, action_type, action_url, priority, assignee_role, usage_count, updated_at')
      .eq('expert_id', user.id)
      .order('created_at', { ascending: false });

    if (tError) {
      console.error('Templates fetch error:', tError);
    }

    const list = rows || [];
    let messageTemplates = list
      .filter((r: { type: string }) => r.type === 'message')
      .map((r: { id: number; category?: string | null; title?: string | null; content?: string | null }) => ({
        id: String(r.id),
        category: (r.category ?? 'general') as string,
        title: r.title?.trim() ?? '',
        content: r.content?.trim() ?? '',
        type: 'message' as const,
      }));

    const documentTemplates: { id: string; category: string; title: string; description: string; updatedDate: string; usageCount: number; iconType: 'document' | 'link'; actionType: 'download' | 'link'; actionUrl?: string; type: 'document' }[] = await Promise.all(
      list
        .filter((r: { type: string }) => r.type === 'document')
        .map(async (r: {
          id: number;
          category?: string | null;
          title?: string | null;
          description?: string | null;
          file_path?: string | null;
          file_name?: string | null;
          action_type?: string | null;
          action_url?: string | null;
          usage_count?: number | null;
          updated_at?: string | null;
        }) => {
          let actionUrl = r.action_url?.trim();
          if (r.file_path && r.action_type !== 'link') {
            const { data: signedUrl } = await supabaseAdmin.storage.from('template-files').createSignedUrl(r.file_path, 60 * 60);
            actionUrl = signedUrl?.signedUrl ?? actionUrl;
          }
          return {
            id: String(r.id),
            category: (r.category ?? 'subsidy-application') as string,
            title: r.title?.trim() ?? '',
            description: r.description?.trim() ?? '',
            updatedDate: formatDate(r.updated_at ?? null),
            usageCount: r.usage_count ?? 0,
            iconType: (r.action_type === 'link' ? 'link' : 'document') as 'document' | 'link',
            actionType: (r.action_type === 'link' ? 'link' : 'download') as 'download' | 'link',
            actionUrl,
            fileName: r.file_name ?? undefined,
            type: 'document' as const,
          };
        })
    );

    const taskTemplates: { id: string; category: string; title: string; description: string; priority: 'high' | 'medium' | 'low'; role: 'administrative-scrivener' | 'assistant'; fileName?: string; fileUrl?: string; type: 'task' }[] = await Promise.all(
      list
        .filter((r: { type: string }) => r.type === 'task')
        .map(async (r: {
          id: number;
          category?: string | null;
          title?: string | null;
          description?: string | null;
          priority?: string | null;
          assignee_role?: string | null;
          file_path?: string | null;
          file_name?: string | null;
        }) => {
          let fileUrl: string | undefined;
          if (r.file_path) {
            const { data: signedUrl } = await supabaseAdmin.storage.from('template-files').createSignedUrl(r.file_path, 60 * 60);
            fileUrl = signedUrl?.signedUrl ?? undefined;
          }
          return {
            id: String(r.id),
            category: (r.category ?? 'document') as string,
            title: r.title?.trim() ?? '',
            description: r.description?.trim() ?? '',
            priority: (r.priority === 'high' || r.priority === 'medium' || r.priority === 'low' ? r.priority : 'medium') as 'high' | 'medium' | 'low',
            role: (r.assignee_role === 'assistant' ? 'assistant' : 'administrative-scrivener') as 'administrative-scrivener' | 'assistant',
            fileName: r.file_name ?? undefined,
            fileUrl,
            type: 'task' as const,
          };
        })
    );

    const { data: htRows } = await supabaseAdmin
      .from('hearing_templates')
      .select('id, subsidy_id');

    const hearingTemplates: {
      id: string;
      title: string;
      description: string;
      subsidyType: string;
      questions: { id: string; question: string; type: string; required: boolean; options?: string[] }[];
      isActive: boolean;
    }[] = [];

    if (htRows?.length) {
      const subsidyIds = [...new Set((htRows as { subsidy_id: number }[]).map((x) => x.subsidy_id).filter(Boolean))];
      let subsidyMap: Record<number, string> = {};
      if (subsidyIds.length > 0) {
        const { data: subRows } = await supabaseAdmin
          .from('subsidies')
          .select('id, title')
          .in('id', subsidyIds);
        for (const s of subRows || []) {
          subsidyMap[(s as { id: number }).id] = (s as { title?: string }).title?.trim() ?? '';
        }
      }

      const templateIds = (htRows as { id: number }[]).map((x) => x.id);
      const { data: qRows } = await supabaseAdmin
        .from('hearing_questions')
        .select('id, template_id, question_text, field_type, is_required, display_order')
        .in('template_id', templateIds)
        .order('display_order', { ascending: true });

      const questionIds = (qRows || []).map((q: { id: number }) => q.id);
      let optionsMap: Record<number, string[]> = {};
      if (questionIds.length > 0) {
        const { data: optRows } = await supabaseAdmin
          .from('hearing_options')
          .select('question_id, option_text, display_order')
          .in('question_id', questionIds)
          .order('display_order', { ascending: true });
        for (const o of optRows || []) {
          const qid = (o as { question_id: number }).question_id;
          if (!optionsMap[qid]) optionsMap[qid] = [];
          optionsMap[qid].push((o as { option_text: string }).option_text?.trim() ?? '');
        }
      }

      for (const ht of htRows as { id: number; subsidy_id: number }[]) {
        const questions = (qRows || [])
          .filter((q: { template_id: number }) => q.template_id === ht.id)
          .map((q: { id: number; question_text?: string | null; field_type?: string | null; is_required?: boolean }) => ({
            id: `q${q.id}`,
            question: (q as { question_text?: string }).question_text?.trim() ?? '',
            type: ((q as { field_type?: string }).field_type ?? 'text') as string,
            required: !!q.is_required,
            options: optionsMap[q.id],
          }));
        const subsidyTitle = subsidyMap[ht.subsidy_id] ?? '';
        hearingTemplates.push({
          id: String(ht.id),
          title: subsidyTitle ? `${subsidyTitle}ヒアリングフォーム` : 'ヒアリングフォーム',
          description: subsidyTitle ? `${subsidyTitle}の申請に必要な基本情報を収集するフォームです。` : '',
          subsidyType: subsidyTitle,
          questions,
          isActive: true,
        });
      }
    }

    return NextResponse.json({
      messageTemplates,
      documentTemplates,
      taskTemplates,
      hearingTemplates,
    });
  } catch (e) {
    console.error('GET expert templates error:', e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
