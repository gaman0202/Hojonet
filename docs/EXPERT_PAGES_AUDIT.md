# 전문가(Expert) 페이지 점검 결과

전문가 영역 페이지별로 **구현 여부**, **더미 데이터 사용**, **버튼 동작**을 점검한 결과입니다.

---

## 1. 대시보드 (`/expert/dashboard`)

| 항목 | 상태 |
|------|------|
| 통계(진행 중인案件, 緊急タスク 등) | ✅ API + Supabase 사용 (`/api/expert/dashboard/cases` 등) |
| 未読メッセージ | ✅ `/api/expert/dashboard/messages` |
| 今週の予定 | ✅ 실제案件 deadline 기반 생성 |
| 더미 데이터 | ❌ 없음 |

**결론:** 구현 완료.

---

## 2. 고객 관리 (`/expert/customers`, `/expert/customers/[id]`)

### 2-1. 고객 목록 (`/expert/customers`)

| 항목 | 상태 |
|------|------|
| 목록 데이터 | ✅ `/api/expert/customers` |
| 검색/필터 | ✅ 클라이언트 필터링 |
| 더미 | ❌ 사용 안 함 (customers/data.ts는 이 페이지에서 미사용) |

**결론:** 구현 완료.

### 2-2. 고객 상세 (`/expert/customers/[id]`)

| 항목 | 상태 |
|------|------|
| 고객/案件/活動履歴 | ✅ `/api/expert/customers/[id]` |
| **メモ 저장 버튼** | ⚠️ **미구현** – `handleSaveMemo`가 `console.log`만 수행, 저장 API 없음 |
| **メッセージを送る** | ⚠️ **미구현** – `onClick` 없음 |
| **新規案件を作成** | ⚠️ **미구현** – `onClick` 없음 |

**권장:**  
- 메모: `PATCH /api/expert/customers/[id]` 등으로 메모 저장 API 추가 후 연동  
- 메ッセージ: 해당 고객의 진행 중인案件 메시지 페이지로 이동 (예: `/expert/management/[subsidyId]/[caseId]`)  
- 新規案件: 案件 생성 플로우(검색 → 補助金 선택 → 案件作成)로 이동

---

## 3. 紹介者 관리 (`/expert/introducers`, `/expert/introducers/[id]`)

### 3-1. 紹介者 목록 (`/expert/introducers`)

| 항목 | 상태 |
|------|------|
| 목록 | ✅ `/api/expert/introducers` |
| 더미 | ❌ 사용 안 함 |

**결론:** 구현 완료.

### 3-2. 紹介者 상세 (`/expert/introducers/[id]`)

| 항목 | 상태 |
|------|------|
| **상세 데이터** | ❌ **전부 더미** – `introducers`, `customers` from `../data`, `../../customers/data` |
| 案件 요약/案件 카드 | ❌ 하드코딩 (`caseSummary`, `caseItems`, `referredList`) |
| **メモ 저장** | ⚠️ **미구현** – `handleSaveMemo`가 `console.log`만 |
| **メッセージを送る** | ⚠️ **미구현** – `onClick` 없음 |
| **新規案件を作成** | ⚠️ **미구현** – `onClick` 없음 |

**권장:**  
- `GET /api/expert/introducers/[id]` (또는 기존 introducers API 확장)로 紹介者 상세 + 案件 목록 조회 후 이 페이지에서 API 데이터 사용  
- 메모/메시지/新規案件 버튼은 고객 상세와 동일하게 실제 동작 구현

---

## 4. 補助金・案件 관리 (`/expert/management`, `/expert/management/[id]`, `/expert/management/[id]/[caseId]`)

### 4-1. 管理 메인 (`/expert/management`)

| 항목 | 상태 |
|------|------|
| 補助金 목록 | ✅ `/api/expert/subsidies` |
| 카드/통계 | ✅ API 데이터 기반 |

**결론:** 구현 완료.

### 4-2. 補助金별 案件 칸반 (`/expert/management/[id]`)

| 항목 | 상태 |
|------|------|
| 칸반 데이터 | ✅ `lib/expert/cases` + API |
| 契約・拒否 버튼 | ✅ API 연동 (`/api/expert/cases/[caseId]/contract`, `reject`) |

**결론:** 구현 완료.

### 4-3. 案件 상세 (`/expert/management/[id]/[caseId]`)

| 항목 | 상태 |
|------|------|
| 顧客情報/案件情報/進行段階 | ✅ API 사용. 미수신 시 **폴백**으로 `data.ts`의 `progressSteps`, `defaultCustomerInfo` 사용 |
| 書類 탭 | ✅ `dbDocs` = `/api/cases/[caseId]/documents` (더미 `documents` import는 미사용에 가깝습니다) |
| メッセージ/タスク/タイムライン等 | ✅ 각 API 연동 |
| 더미 그대로만 쓰는 부분 | ❌ 없음 (폴백만 data 사용) |

**참고:**  
- `progressStepsFromApi ?? progressSteps` → API 없을 때만 data 사용.  
- `documents` from `./data`는 현재 코드에서 사용처 없음. 제거해도 됨.

**결론:** 구현 완료. (폴백용 data만 유지)

---

## 5. 補助金検索 (`/expert/search`, `/expert/search/[id]`)

### 5-1. 검색 목록 (`/expert/search`)

| 항목 | 상태 |
|------|------|
| 목록 | ✅ `/api/subsidies` |
| 필터/검색 | ✅ 클라이언트 필터링 |
| data.ts | ✅ `regionOptions`, `amountOptions` 등 옵션용만 사용 |

**결론:** 구현 완료.

### 5-2. 補助金 상세 (`/expert/search/[id]`)

| 항목 | 상태 |
|------|------|
| **상세 내용** | ❌ **전부 더미** – `grantDetails` 하드코딩 (id 무관 동일 내용) |
| **この補助金に参加する** | ✅ 구현됨 – `POST /api/expert/subsidies/[subsidyId]/participate` |

**권장:**  
- `GET /api/subsidies/[id]`로 상세 조회 후, 응답을 `grantDetails` 형식에 맞게 매핑하여 표시  
- 이미 `app/api/subsidies/[id]/route.ts`에 상세 API 있음

---

## 6. 設定 (`/expert/settings`)

| 항목 | 상태 |
|------|------|
| プロフィール | ✅ `GET/PATCH /api/expert/settings/profile` |
| 通知設定 | ✅ `/api/expert/settings/notifications` (저장 로직 확인 권장) |
| チーム管理 | ✅ `/api/expert/settings/team`, 권한 `permissions` API |
| セキュリティ | ✅ 비밀번호 등 API 존재 |

**결론:** API 연동된 것으로 보임. 버튼/폼 전부 동작 확인하면 좋음.

---

## 7. テンプレート (`/expert/templates`)

| 항목 | 상태 |
|------|------|
| メッセージ/書類/タスク/ヒアリング 템플릿 | ✅ `/api/expert/templates` |
| data.ts | ✅ 필터 카테고리 등 UI 옵션만 사용 |

**결론:** 구현 완료.

---

## 요약: 미구현·더미 사용 목록

| 페이지 | 구분 | 내용 |
|--------|------|------|
| **고객 상세** | 미구현 | 메모 저장, 「メッセージを送る」, 「新規案件を作成」 버튼 |
| **紹介者 상세** | 더미 + 미구현 | 전부 data.ts 더미. 메모/メッセージ/新規案件 버튼 미구현 |
| **補助金 상세(検索)** | 더미 | 상세 내용이 하드코딩. `GET /api/subsidies/[id]`로 교체 권장 |
| **案件 상세** | 정리 | `documents` import from data 미사용 → 제거 가능 |

---

## 권장 작업 순서

1. **検索 상세 (`/expert/search/[id]`)**  
   - `useEffect`에서 `GET /api/subsidies/[id]` 호출  
   - 응답을 현재 `grantDetails`/`tableRows` 구조에 맞게 매핑해 표시  

2. **紹介者 상세 (`/expert/introducers/[id]`)**  
   - `GET /api/expert/introducers/[id]` (또는 기존 API 확장) 추가  
   - 상세·案件 목록을 API로 교체, data.ts 의존 제거  

3. **고객 상세 (`/expert/customers/[id]`)**  
   - 메모 저장 API 추가 후 `handleSaveMemo` 연동  
   - 「メッセージを送る」→ 해당案件 채팅 링크  
   - 「新規案件を作成」→ 案件 생성 플로우 링크 또는 모달  

4. **案件 상세**  
   - `./data`의 `documents` import 제거 (사용처 없음)

이 순서로 적용하면 전문가 페이지의 미구현/더미 사용이 정리됩니다.
