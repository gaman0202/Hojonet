# 기능별 화면·파일 위치

> 백엔드-프론트 연결 대상 정리 (비개발자도 “어디”인지 찾을 수 있도록)

---

## 1. 전문가 케이스 목록 / 칸반

| 구분 | URL(화면) | 해당 파일 | 현재 데이터 |
|------|-----------|-----------|-------------|
| **보조금별案件 수** | `/expert/management` (전문가 메인) | `app/expert/management/page.tsx` | 보조금 목록은 Supabase 조회. **案件 수(caseCount)** 는 `'0件の案件'` 고정값 |
| **칸반(보조금별 케이스)** | `/expert/management/[id]` (예: `/expert/management/1`) | `app/expert/management/[id]/page.tsx` | **더미** `app/expert/management/[id]/data.ts` (`kanbanColumns`, `subsidyInfo`) |

**연결 시 할 일**:  
- `[id]/page.tsx`에서 **실제 `cases` API**로 해당 보조금(subsidy_id)의 케이스 목록 조회 후, status별(consultation, hearing, doc_prep, … accepted, rejected)로 칸반 컬럼에 채우기.  
- `/expert/management`에서 보조금별 **실제 케이스 건수** API로 표시.

---

## 2. 케이스 상세(전문가)

| 구분 | URL(화면) | 해당 파일 | 현재 데이터 |
|------|-----------|-----------|-------------|
| **케이스 상세 전체** | `/expert/management/[id]/[caseId]` (예: `/expert/management/1/123`) | `app/expert/management/[id]/[caseId]/page.tsx` | **더미** `app/expert/management/[id]/[caseId]/data.ts` (진행단계, 고객정보, 메시지, 타임라인, 타스크, 문서 등) |

**연결 시 할 일**:  
- 케이스 ID(`caseId`)로 **케이스/타스크/문서/타임라인 API** 호출 후 같은 화면에 표시.

---

## 3. 히어링 → 케이스 생성

| 구분 | URL(화면) | 해당 파일 | 현재 데이터 |
|------|-----------|-----------|-------------|
| **히어링 폼 제출** | `/hearing/[id]` (id = 보조금 ID) | `app/hearing/[id]/page.tsx` | **이미 연동됨**: 제출 시 `cases` insert + `tasks` insert (Supabase). 히어링 응답 본문은 `localStorage`에만 저장 |

**연결 시 할 일**:  
- (선택) 히어링 응답을 DB 테이블(예: hearing_responses)에 저장하고, 케이스 상세에서 조회하도록 연결.

---

## 4. 문서(서류) 업로드·승인/기각

| 구분 | URL(화면) | 해당 파일 | 현재 데이터 |
|------|-----------|-----------|-------------|
| **유저: 書類 관리** | `/dashboard/cases/[id]` → 「書類管理」탭 | `app/dashboard/cases/[id]/page.tsx` (documents 탭) | **더미** `app/dashboard/cases/[id]/data.ts` 의 `documents` 배열 |
| **전문가: 문서 상태 뱃지** | `/expert/management/[id]/[caseId]` (문서/타임라인 등) | `app/expert/management/[id]/[caseId]/utils.ts` (`getDocumentStatusBadge`: approved/rejected 등) | 문서 목록·승인/기각 버튼은 케이스 상세 데이터에 따라 표시되며, 현재 상세 데이터는 더미 |

**연결 시 할 일**:  
- 문서용 테이블(예: `documents`) + Storage가 있으면, 업로드 API + 상태(approved/rejected) 업데이트 후 위 두 화면에서 해당 API로 조회·표시.

---

## 5. 알림/배지

| 구분 | URL(화면) | 해당 파일 | 현재 데이터 |
|------|-----------|-----------|-------------|
| **유저: 措置 필요** | `/dashboard/cases` (케이스 카드) | `app/dashboard/cases/page.tsx`, `app/dashboard/cases/components/CaseCard.tsx` | `needsAction` = `cases.needs_attention` 등 API에서 옴 (이미 연동 가능) |
| **유저: 케이스 상세 배지** | `/dashboard/cases/[id]` (탭 뱃지: タスク 1/6, メッセージ 3 등) | `app/dashboard/cases/[id]/page.tsx` | 탭별 뱃지 값은 **하드코딩/더미** (실제 미처리 수 아님) |
| **전문가: 措置必要** | `/expert/management/[id]` (칸반 카드) | `app/expert/management/[id]/page.tsx` (card.needsAction), `app/expert/management/[id]/data.ts` | **더미** (칸반 데이터가 더미이므로) |

**연결 시 할 일**:  
- 전문가 칸반을 실제 cases API로 바꾸면 `needs_attention` 등으로 「措置必要」 반영 가능.  
- 유저 케이스 상세 탭 뱃지는 “미완료 타스크 수” 등 **실제 집계 API**로 교체.

---

## 요약 표

| 기능 | 화면(URL) | 데이터 소스(현재) |
|------|-----------|-------------------|
| 전문가 케이스 목록/칸반 | `/expert/management`, `/expert/management/[id]` | 보조금만 API, 칸반·案件 수 더미/고정값 |
| 케이스 상세(전문가) | `/expert/management/[id]/[caseId]` | 더미 |
| 히어링→케이스 생성 | `/hearing/[id]` | **연동됨** (cases + tasks insert) |
| 문서 업로드·승인/기각 | `/dashboard/cases/[id]`(書類), 전문가 케이스 상세 | 더미 |
| 알림/배지 | `/dashboard/cases`, `/dashboard/cases/[id]`, `/expert/management/[id]` | 유저 목록은 API 가능, 상세 탭·전문가 칸반은 더미/고정 |

이 문서는 프로젝트 루트 `docs/FEATURE_SCREEN_MAP.md` 에 두었습니다. 경로나 화면이 바뀌면 이 파일만 수정하면 됩니다.
