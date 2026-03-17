-- 共通デフォルト用ヒアリングテンプレート1件 + 質問7件を登録
-- 補助金が1件以上ある場合、先頭の補助金に紐づける

-- 1. テンプレートが1件もない場合のみ、先頭の補助金にデフォルトテンプレート（id=1）を登録
INSERT INTO hearing_templates (id, subsidy_id, created_at, updated_at)
SELECT 1, (SELECT id FROM subsidies ORDER BY id ASC LIMIT 1), NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM subsidies LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM hearing_templates LIMIT 1);

-- 2. テンプレート1用の質問（id=1のテンプレートが存在する場合のみ）
INSERT INTO hearing_questions (template_id, question_text, field_type, is_required, display_order, created_at, updated_at)
SELECT 1, '会社名', 'text', true, 1, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM hearing_templates WHERE id = 1) AND NOT EXISTS (SELECT 1 FROM hearing_questions WHERE template_id = 1 AND display_order = 1);

INSERT INTO hearing_questions (template_id, question_text, field_type, is_required, display_order, created_at, updated_at)
SELECT 1, '事業所の所在地（都道府県）', 'select', true, 2, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM hearing_templates WHERE id = 1) AND NOT EXISTS (SELECT 1 FROM hearing_questions WHERE template_id = 1 AND display_order = 2);

INSERT INTO hearing_questions (template_id, question_text, field_type, is_required, display_order, created_at, updated_at)
SELECT 1, '現在の主要事業内容を簡単にご説明ください。', 'textarea', true, 3, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM hearing_templates WHERE id = 1) AND NOT EXISTS (SELECT 1 FROM hearing_questions WHERE template_id = 1 AND display_order = 3);

INSERT INTO hearing_questions (template_id, question_text, field_type, is_required, display_order, created_at, updated_at)
SELECT 1, '従業員数', 'select', true, 4, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM hearing_templates WHERE id = 1) AND NOT EXISTS (SELECT 1 FROM hearing_questions WHERE template_id = 1 AND display_order = 4);

INSERT INTO hearing_questions (template_id, question_text, field_type, is_required, display_order, created_at, updated_at)
SELECT 1, '決算年度の売上高（概算で結構です）', 'text', true, 5, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM hearing_templates WHERE id = 1) AND NOT EXISTS (SELECT 1 FROM hearing_questions WHERE template_id = 1 AND display_order = 5);

INSERT INTO hearing_questions (template_id, question_text, field_type, is_required, display_order, created_at, updated_at)
SELECT 1, '行政書士からの支援を希望されますか？', 'radio', true, 6, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM hearing_templates WHERE id = 1) AND NOT EXISTS (SELECT 1 FROM hearing_questions WHERE template_id = 1 AND display_order = 6);

INSERT INTO hearing_questions (template_id, question_text, field_type, is_required, display_order, created_at, updated_at)
SELECT 1, 'どのような支援を希望されますか？', 'checkbox', false, 7, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM hearing_templates WHERE id = 1) AND NOT EXISTS (SELECT 1 FROM hearing_questions WHERE template_id = 1 AND display_order = 7);

-- 3. 選択肢（question_id は上で挿入した質問の id に依存。display_order 2,4,6,7 が select/radio/checkbox）
-- 簡略化: 既存の hearing_options が無い場合のみ挿入するため、question_id をサブクエリで取得
INSERT INTO hearing_options (question_id, option_text, display_order, created_at)
SELECT q.id, opt.option_text, opt.display_order, NOW()
FROM hearing_questions q,
     (VALUES ('東京都', 1), ('大阪府', 2), ('愛知県', 3), ('福岡県', 4), ('その他', 5)) AS opt(option_text, display_order)
WHERE q.template_id = 1 AND q.display_order = 2
  AND NOT EXISTS (SELECT 1 FROM hearing_options ho WHERE ho.question_id = q.id LIMIT 1);

INSERT INTO hearing_options (question_id, option_text, display_order, created_at)
SELECT q.id, opt.option_text, opt.display_order, NOW()
FROM hearing_questions q,
     (VALUES ('1〜5名', 1), ('6〜10名', 2), ('11〜20名', 3), ('21〜50名', 4), ('51名以上', 5)) AS opt(option_text, display_order)
WHERE q.template_id = 1 AND q.display_order = 4
  AND NOT EXISTS (SELECT 1 FROM hearing_options ho WHERE ho.question_id = q.id LIMIT 1);

INSERT INTO hearing_options (question_id, option_text, display_order, created_at)
SELECT q.id, opt.option_text, opt.display_order, NOW()
FROM hearing_questions q,
     (VALUES ('はい', 1), ('いいえ', 2)) AS opt(option_text, display_order)
WHERE q.template_id = 1 AND q.display_order = 6
  AND NOT EXISTS (SELECT 1 FROM hearing_options ho WHERE ho.question_id = q.id LIMIT 1);

INSERT INTO hearing_options (question_id, option_text, display_order, created_at)
SELECT q.id, opt.option_text, opt.display_order, NOW()
FROM hearing_questions q,
     (VALUES ('事業計画書の作成', 1), ('申請書類の作成', 2), ('全体的なサポート', 3), ('相談のみ', 4)) AS opt(option_text, display_order)
WHERE q.template_id = 1 AND q.display_order = 7
  AND NOT EXISTS (SELECT 1 FROM hearing_options ho WHERE ho.question_id = q.id LIMIT 1);
