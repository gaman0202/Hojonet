# 타스크 기능 갭 분석 (구현 여부 정리)

> TASK_FLOW.md / TASK_PLAN.md / TASK_FEATURE_LIST.md 기준으로 현재 구현 상태를 점검한 결과입니다.
> 
> **최종 업데이트**: 2025-02 - 필수 항목 3개 모두 구현 완료

---

## ✅ 이미 구현된 부분

| 항목 | 내용 |
|------|------|
| **담당 구분** | `assignee_role` (customer / expert / assistant), DB·API·화면 반영 |
| **타스크 타입** | `type`: file_upload, form_input, confirmation, general (DB·API 지원) |
| **전문가 타스크 생성** | `POST /api/expert/cases/[caseId]/tasks` 연동, TaskModal에서 「タスク作成」 시 DB 저장 |
| **유저 타스크 표시** | 유저 케이스 상세에서 본인 담당 타스크 포함 목록 표시 |
| **완료(체크)** | confirmation/general → `POST/DELETE /api/tasks/[id]/complete` → status `approved` |
| **제출** | confirmation/general → `POST /api/tasks/[id]/submit` → status `submitted` |
| **폼 타입** | 질문 정의 `task_form_definitions`, 답변 `task_form_responses`, GET/POST `/api/tasks/[id]/form` |
| **폼 제출 후 상태** | 폼 제출 시 `submit: true` 이면 task status → `submitted` |
| **승인/기각** | 전문가: `POST /api/tasks/[id]/approve`, `POST /api/tasks/[id]/reject` (reason 필수) |
| **기각 사유** | reject API에 `reason` 전달, 유저 화면에 `rejectionReason` 표시 |
| **재제출** | 기각 후 유저가 「再提出する」 → submit API → 다시 submitted |
| **파일 업로드 API** | `POST /api/tasks/[id]/upload` (Storage + `task_attachments` insert), GET attachments |
| **task_attachments 테이블** | `prisma/migrations/create_task_attachments.sql` 마이그레이션 추가됨 ✅ |
| **file_upload 제출 버튼** | 파일 1개 이상 업로드 후 「提出する」 버튼 노출 → submit API 호출 ✅ |
| **confirmation 타입 생성** | TaskModal에서 「確認のみ」 선택 가능 → `confirmation` 타입으로 생성 ✅ |

---

## ⏳ 선택 사항 (미구현)

### 1. **기한(마감) 정책 (선택)**

- **문서**: TASK_FLOW.md에 "기한 초과 시 기한 만료 표시", "기한 초과 시 알림" 등 정책 검토 권장.
- **현재**: `deadline`·`days_remaining` 표시는 있으나, "기한 만료" 전용 뱃지/문구나 알림 로직은 미확인.
- **권장**: 요구사항으로 "기한 만료" 표시/알림이 필요하면 별도 스토리로 구현.

---

### 2. **전문가 측 「검토 필요」 배지/알림 (선택)**

- **문서**: "전문가 화면에는 '검토 필요' 표시/알림이 발생한다"고 되어 있음.
- **현재**: 제출된 태스크는 칸반의 「確認待ち」 등으로 구분 가능하나, **"검토 필요 건수" 배지나 알림**이 명시적으로 구현돼 있는지는 추가 확인 필요.
- **권장**: "검토 필요 N건" 같은 배지를 요구하면, submitted 상태 태스크 수 집계 후 표시.

---

## 요약

| 구분 | 항목 | 상태 |
|------|------|------|
| ~~필수~~ | ~~`task_attachments` 테이블 마이그레이션 추가~~ | ✅ 완료 |
| ~~필수~~ | ~~file_upload 타스크에 「提出する」 버튼 추가 및 submit API 연동~~ | ✅ 완료 |
| ~~권장~~ | ~~전문가 TaskModal에서 confirmation 타입 생성 가능하도록 확장~~ | ✅ 완료 |
| **선택** | 기한 만료 표시·알림, 전문가 검토 필요 배지 | 미구현 |

모든 필수/권장 항목이 구현 완료되었습니다.
