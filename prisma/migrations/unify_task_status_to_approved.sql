-- ==========================================
-- タスク「完了」ステータスを approved に統一
-- completed と approved を一本化（完了 = approved のみ）
-- ==========================================

-- 既存の completed を approved に変換
UPDATE tasks SET status = 'approved' WHERE status = 'completed';

-- CHECK 制約を更新（completed を削除）
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'submitted', 'review', 'approved', 'rejected'));

COMMENT ON COLUMN tasks.status IS 'ステータス（pending:要請됨, in_progress:進行中, submitted:제출됨, review:検討中, approved:承認済み, rejected:기각됨）';

-- 進捗・統計関数を approved 基準に更新
CREATE OR REPLACE FUNCTION calculate_case_progress(p_case_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    total_tasks INTEGER;
    completed_tasks INTEGER;
    progress INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'approved')
    INTO total_tasks, completed_tasks
    FROM tasks
    WHERE case_id = p_case_id;
    
    IF total_tasks = 0 THEN
        RETURN 0;
    END IF;
    
    progress := (completed_tasks * 100 / total_tasks);
    RETURN progress;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_case_statistics(p_case_id BIGINT)
RETURNS VOID AS $$
DECLARE
    v_pending_tasks INTEGER;
    v_urgent_tasks INTEGER;
    v_unread_messages INTEGER;
    v_progress INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_pending_tasks
    FROM tasks
    WHERE case_id = p_case_id AND status != 'approved';
    
    SELECT COUNT(*) INTO v_urgent_tasks
    FROM tasks
    WHERE case_id = p_case_id 
      AND status != 'approved'
      AND deadline <= CURRENT_DATE + INTERVAL '7 days';
    
    v_progress := calculate_case_progress(p_case_id);
    
    UPDATE cases SET
        pending_task_count = v_pending_tasks,
        urgent_task_count = v_urgent_tasks,
        progress_rate = v_progress,
        needs_attention = (v_urgent_tasks > 0 OR v_pending_tasks > 0),
        last_activity_at = NOW()
    WHERE id = p_case_id;
END;
$$ LANGUAGE plpgsql;
