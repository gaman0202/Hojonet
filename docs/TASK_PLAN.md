# 타스크 문서 요약 (쉽게 설명 버전)

아래 내용은 사용자가 작성한 두 문서(**TASK_FEATURE_LIST**, **TASK_PLAN**)를 읽기 쉽게 요약한 것입니다.  
핵심은 **“전문가가 케이스(case) 안에서 타스크를 만들고, 유저/전문가가 그 타스크를 수행(업로드/폼제출/완료체크)하게 만드는 기능”**입니다.

---

## 1) 기능 요구사항 문서(TASK_FEATURE_LIST)의 핵심

### A. 타스크는 “누가 하는 일인지”를 반드시 가진다 (담당 구분)

- **유저 담당(user)**: 고객이 해야 하는 일 (서류 제출, 폼 답변, 파일 업로드 등)
- **전문가 담당(expert)**: 전문가가 해야 하는 일 (검토, 초안 작성, 제출 대행 등)

**결론:** `tasks` 테이블에 `assignee_type`(또는 `responsible_role`) 같은 컬럼이 필요합니다.

---

### B. 타스크는 “무슨 종류의 일인지”도 가진다 (타스크 타입)

타입은 3가지입니다.

1) **파일 업로드(file)**  
- 누군가 파일을 올려야 완료되는 타스크  
- 파일 확장자 제한, 용량 제한, 다중 업로드 여부 같은 옵션이 있을 수 있음  
- 파일은 **Supabase Storage**에 저장하고, DB에는 메타(경로/업로더/업로드 시간 등) 연결

2) **폼 작성(form)**  
- 질문 리스트가 있고, 답변을 제출해야 완료되는 타스크  
- 질문 정의(순서/필수여부/형식)와 답변 저장 구조가 필요

3) **일반 체크(check)**  
- 제출물 없이 그냥 “완료 버튼”만 누르면 끝나는 타스크

**결론:** `tasks`에 `task_type` 컬럼이 필요합니다. (`file | form | check`)

---

### C. 모든 타스크가 공통으로 가지는 필드

- `title`(필수), `description`(선택), `priority`(선택), `deadline`(선택)
- + `assignee_type`(필수), `task_type`(필수)

---

### D. 타입별로 추가로 필요한 DB/권한

- **file 타입**이면: `task_attachments`(또는 `task_files`) 테이블이 필요할 가능성이 큼  
  - 예: `task_id`, `file_path`, `file_name`, `uploaded_by`, `uploaded_at` …

- **form 타입**이면:
  - 질문: `task_form_questions`
  - 답변: `task_form_answers` (JSON 저장 가능)

- 그리고 **RLS/Storage 정책**이 중요:
  - “해당 케이스 유저” 또는 “해당 케이스 전문가”만 읽기/쓰기 가능해야 함

---

## 2) 구현 플랜 문서(TASK_PLAN)의 핵심 “개발 순서”

### Phase 0 — 사전 확인(선택)
- `tasks` 스키마에 `assignee_type`, `task_type`이 있는지 확인
- Storage 버킷 존재 여부 확인
- RLS 정책 대략 점검

---

### Phase 1 — DB 스키마 추가 (가장 먼저)
1) `tasks` 테이블 보강
- `assignee_type`: `user | expert`
- `task_type`: `file | form | check`
- (선택) `assignee_id`: 특정 전문가에게만 할당하고 싶을 때

2) file/form용 보조 테이블 생성(필요 시)
- attachments, questions, answers 테이블

**이 단계의 의미:** 저장할 “그릇(스키마)”부터 만든다.

---

### Phase 2 — API 만들기 (DB를 쓰게 만드는 층)
- **전문가 타스크 생성 API**
  - 예: `POST /api/expert/cases/[caseId]/tasks`
  - `tasks insert`
  - form이면 `questions insert`까지 같이 처리

- **파일 업로드 API**
  - 예: `POST /api/tasks/[taskId]/upload`
  - Storage 업로드 + attachments insert

- **폼 답변 제출 API**
  - 예: `POST /api/tasks/[taskId]/answers`
  - answers insert

- **조회/완료 토글**
  - 기존 `fetchCaseTasks`, `toggleTaskStatus` 등이 새 컬럼 포함하도록 확장

---

### Phase 3 — 전문가 화면(TaskModal)에서 “진짜로 생성되게”
- 현재 TaskModal UI가 있어도 DB에 저장이 안 되면 의미가 없음
- “タスク作成” 버튼 → 생성 API 호출 → 성공 시 목록 갱신/모달 닫기

---

### Phase 4 — 유저/전문가가 타스크를 “수행”하는 화면 연결
- 유저 케이스 상세: 본인 담당 타스크만 액션 가능  
  - file: 업로드 버튼
  - form: 폼 작성/제출
  - check: 완료 체크

- 전문가 화면도 동일하게 수행 가능(케이스 권한 있는 경우)

---

### Phase 5 — 테스트
- 전문가로 타스크 생성(file/form/check 1개씩)
- 유저로 유저 담당 타스크 수행
- 전문가로 전문가 담당 타스크 수행
- RLS로 권한이 새지 않는지 검증

---

## 3) 추천 우선순위 (가장 빠르게 완성하는 루트)

**1) DB 컬럼 추가 → 2) 전문가 타스크 생성 API → 3) TaskModal 생성 버튼 연동**  
= “전문가가 타스크 만들면 DB에 저장된다”까지를 먼저 끝내는 게 1순위.

그 다음:
- 유저 화면 표시 + check 완료 토글
- 마지막에 file/form(업로드/답변 제출) 확장

---

## 4) 가장 쉬운 MVP(최소 기능) 정의

처음부터 file/form까지 다 하면 테이블/권한이 복잡해질 수 있습니다.  
그래서 MVP를 이렇게 잡으면 빠릅니다.

1) `tasks`에 `assignee_type`, `task_type` 추가  
2) 전문가가 TaskModal로 **check 타입 타스크** 생성 가능(API 연동)  
3) 유저가 본인 담당 check 타스크를 완료 토글 가능

이 흐름이 안정적으로 돌아가면, file/form을 붙이기 쉬워집니다.

---
