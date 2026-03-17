'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

// サーバーサイド用のSupabaseクライアント
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export interface DashboardData {
  profile: {
    id: string
    fullName: string
    email: string
    companyName: string
    userType: string
    statsActiveCase: number
    statsTotalApplications: number
    statsAcceptedCases: number
    statsAcceptanceRate: number
  } | null
  cases: {
    id: number
    title: string
    status: string
    progressRate: number
    amount: string
    deadline: string
    assigneeName: string
    needsAttention: boolean
    unreadMessageCount: number
    pendingTaskCount: number
  }[]
  tasks: {
    id: number
    title: string
    caseTitle: string
    deadline: string
    daysRemaining: number
    status: string
    priority: string
  }[]
  stats: {
    activeCases: number
    urgentTasks: number
    unreadMessages: number
    pendingTasks: number
  }
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  try {
    // プロフィール取得
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // 同一グループの案件一覧取得（顧客・メンバー共通）
    const groupId = profile?.group_id ?? userId
    const { data: cases } = await supabaseAdmin
      .from('cases')
      .select(`
        id,
        title,
        status,
        progress_rate,
        amount,
        deadline,
        needs_attention,
        unread_message_count,
        pending_task_count,
        assignee_id,
        profiles!cases_assignee_id_fkey (full_name)
      `)
      .eq('user_group_id', groupId)
      .order('updated_at', { ascending: false })

    // 緊急タスク取得（期限が7日以内）
    const sevenDaysLater = new Date()
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
    
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select(`
        id,
        title,
        deadline,
        status,
        priority,
        case_id,
        cases (title)
      `)
      .lte('deadline', sevenDaysLater.toISOString().split('T')[0])
      .neq('status', 'approved')
      .in('case_id', (cases || []).map(c => c.id))
      .order('deadline', { ascending: true })
      .limit(5)

    // 統計計算
    const activeCases = (cases || []).filter(c => 
      !['accepted', 'rejected'].includes(c.status)
    ).length

    const urgentTasks = (tasks || []).filter(t => {
      if (!t.deadline) return false
      const deadline = new Date(t.deadline)
      const today = new Date()
      const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays <= 3
    }).length

    const totalUnreadMessages = (cases || []).reduce((sum, c) => sum + (c.unread_message_count || 0), 0)
    const totalPendingTasks = (cases || []).reduce((sum, c) => sum + (c.pending_task_count || 0), 0)

    return {
      profile: profile ? {
        id: profile.id,
        fullName: profile.full_name || '',
        email: profile.email || '',
        companyName: profile.company_name || '',
        userType: profile.user_type,
        statsActiveCase: profile.stats_active_cases || 0,
        statsTotalApplications: profile.stats_total_applications || 0,
        statsAcceptedCases: profile.stats_accepted_cases || 0,
        statsAcceptanceRate: profile.stats_acceptance_rate || 0,
      } : null,
      cases: (cases || []).map(c => ({
        id: c.id,
        title: c.title,
        status: c.status,
        progressRate: c.progress_rate || 0,
        amount: c.amount || '',
        deadline: c.deadline || '',
        assigneeName: (c.profiles as { full_name?: string })?.full_name || '未割当',
        needsAttention: c.needs_attention || false,
        unreadMessageCount: c.unread_message_count || 0,
        pendingTaskCount: c.pending_task_count || 0,
      })),
      tasks: (tasks || []).map(t => {
        const deadline = t.deadline ? new Date(t.deadline) : null
        const today = new Date()
        const daysRemaining = deadline 
          ? Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : 0
        
        return {
          id: t.id,
          title: t.title,
          caseTitle: (t.cases as { title?: string })?.title || '',
          deadline: t.deadline || '',
          daysRemaining,
          status: t.status,
          priority: t.priority,
        }
      }),
      stats: {
        activeCases,
        urgentTasks,
        unreadMessages: totalUnreadMessages,
        pendingTasks: totalPendingTasks,
      }
    }
  } catch (error) {
    console.error('Dashboard data fetch error:', error)
    return {
      profile: null,
      cases: [],
      tasks: [],
      stats: {
        activeCases: 0,
        urgentTasks: 0,
        unreadMessages: 0,
        pendingTasks: 0,
      }
    }
  }
}

// 専門家向けダッシュボードデータ
export async function getExpertDashboardData(expertId: string): Promise<DashboardData> {
  try {
    // プロフィール取得
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', expertId)
      .single()

    // 専門家プロフィール取得
    const { data: expertProfile } = await supabaseAdmin
      .from('expert_profiles')
      .select('*')
      .eq('user_id', expertId)
      .single()

    // 専門家が担当する案件一覧取得
    const { data: cases } = await supabaseAdmin
      .from('cases')
      .select(`
        id,
        title,
        status,
        progress_rate,
        amount,
        deadline,
        needs_attention,
        unread_message_count,
        pending_task_count,
        user_group_id,
        profiles!cases_user_group_id_fkey (full_name, company_name)
      `)
      .eq('expert_group_id', expertId)
      .order('updated_at', { ascending: false })

    // 緊急タスク取得
    const sevenDaysLater = new Date()
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
    
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select(`
        id,
        title,
        deadline,
        status,
        priority,
        case_id,
        cases (title)
      `)
      .lte('deadline', sevenDaysLater.toISOString().split('T')[0])
      .neq('status', 'approved')
      .in('case_id', (cases || []).map(c => c.id))
      .order('deadline', { ascending: true })
      .limit(10)

    // 統計計算
    const activeCases = (cases || []).filter(c => 
      !['accepted', 'rejected'].includes(c.status)
    ).length

    const urgentTasks = (tasks || []).filter(t => {
      if (!t.deadline) return false
      const deadline = new Date(t.deadline)
      const today = new Date()
      const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays <= 3
    }).length

    const totalUnreadMessages = (cases || []).reduce((sum, c) => sum + (c.unread_message_count || 0), 0)
    const totalPendingTasks = (cases || []).reduce((sum, c) => sum + (c.pending_task_count || 0), 0)

    return {
      profile: profile ? {
        id: profile.id,
        fullName: profile.full_name || '',
        email: profile.email || '',
        companyName: expertProfile?.office_name || profile.company_name || '',
        userType: profile.user_type,
        statsActiveCase: activeCases,
        statsTotalApplications: (cases || []).length,
        statsAcceptedCases: (cases || []).filter(c => c.status === 'accepted').length,
        statsAcceptanceRate: 0,
      } : null,
      cases: (cases || []).map(c => ({
        id: c.id,
        title: c.title,
        status: c.status,
        progressRate: c.progress_rate || 0,
        amount: c.amount || '',
        deadline: c.deadline || '',
        assigneeName: (c.profiles as { full_name?: string; company_name?: string })?.full_name || 
                      (c.profiles as { full_name?: string; company_name?: string })?.company_name || '未設定',
        needsAttention: c.needs_attention || false,
        unreadMessageCount: c.unread_message_count || 0,
        pendingTaskCount: c.pending_task_count || 0,
      })),
      tasks: (tasks || []).map(t => {
        const deadline = t.deadline ? new Date(t.deadline) : null
        const today = new Date()
        const daysRemaining = deadline 
          ? Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : 0
        
        return {
          id: t.id,
          title: t.title,
          caseTitle: (t.cases as { title?: string })?.title || '',
          deadline: t.deadline || '',
          daysRemaining,
          status: t.status,
          priority: t.priority,
        }
      }),
      stats: {
        activeCases,
        urgentTasks,
        unreadMessages: totalUnreadMessages,
        pendingTasks: totalPendingTasks,
      }
    }
  } catch (error) {
    console.error('Expert dashboard data fetch error:', error)
    return {
      profile: null,
      cases: [],
      tasks: [],
      stats: {
        activeCases: 0,
        urgentTasks: 0,
        unreadMessages: 0,
        pendingTasks: 0,
      }
    }
  }
}
