# プロジェクト構造・保守ガイド

このドキュメントは、hojonet のフォルダ構成と「どこに何を書くか」のルールをまとめたものです。新規追加・修正時に参照してください。

---

## 1. ルート直下のフォルダ役割

| フォルダ | 役割 | 例 |
|----------|------|-----|
| **app/** | Next.js App Router（ページ・API・レイアウト） | `app/dashboard/page.tsx`, `app/api/tasks/...` |
| **components/** | 複数画面で使う共通 UI コンポーネント | `components/layout/Sidebar.tsx`, `components/icons/` |
| **lib/** | サーバー／ドメインロジック・ヘルパー | `lib/auth.ts`, `lib/expert/cases.ts` |
| **utils/** | インフラ・クライアント（Supabase 等） | `utils/supabase/client.ts`, `utils/supabaseAdmin.ts` |
| **hooks/** | 共通カスタムフック | `hooks/useProfile.ts` |
| **store/** | グローバル状態（Zustand 等） | `store/useProfileStore.ts` |
| **types/** | アプリ全体で使う型定義 | `types/auth.ts` |
| **prisma/** | DB スキーマ・マイグレーション（参照用） | `prisma/schema.prisma`, `prisma/migrations/` |
| **docs/** | 設計・手順・仕様ドキュメント | 本ファイル含む |

---

## 2. app/ の構成ルール

### 2.1 ページ（ルート）

- 1 ルート = 1 ディレクトリ + `page.tsx`（必要なら `layout.tsx`）。
- 画面専用の**データ取得・状態**は、そのルート内の `data.ts` にまとめる。
- 画面専用の**型**は、そのルート内の `types.ts` に定義する。

```
app/
  dashboard/
    page.tsx
    layout.tsx
    data.ts
    types.ts
  dashboard/cases/
    page.tsx
    data.ts
    types.ts
  dashboard/cases/[id]/
    page.tsx
    data.ts
    types.ts
    components/   # この画面だけのコンポーネント
```

### 2.2 API ルート

- `app/api/` 以下に置く。リソース単位でディレクトリを切る。
- 認証が必要な API は、先頭でユーザー取得・権限チェックを行う。
- サーバー側 DB 操作は **`@/utils/supabaseAdmin`** を使う（anon key ではなく service role）。

```
app/api/
  expert/cases/[caseId]/
    route.ts      # GET/POST 案件
    tasks/route.ts
  tasks/[taskId]/
    route.ts
    form/route.ts
    upload/route.ts
    attachments/route.ts
```

### 2.3 コンポーネントの置き場所

- **複数ルートで使う** → `components/`（例: `components/layout/Sidebar.tsx`, `components/ui/Button.tsx`）。
- **1 ルート（または 1 機能）だけで使う** → そのルート内の `components/`（例: `app/dashboard/cases/[id]/components/`）。
- 同じ名前のコンポーネント（例: CaseCard）が **dashboard / expert で別仕様**の場合は、それぞれの `components/` に分けておいてよい。必要になったら共通化を検討する。

---

## 3. Supabase クライアントの使い分け

| 用途 | インポート | 備考 |
|------|------------|------|
| クライアント（ブラウザ・Cookie 利用） | `import { createClient } from '@/utils/supabase/client'` | 認証付き。SSR 対応の createBrowserClient 使用。 |
| レガシー（既存コード互換） | `import { supabase } from '@/utils/supabaseClient'` | 内部で `createClient()` を 1 回呼んだものを export。新規は上を推奨。 |
| サーバー（API ルート・RSC） | `import { supabaseAdmin } from '@/utils/supabaseAdmin'` | Service Role。RLS を超えた操作に使用。 |

- **新規実装では** クライアント用は `@/utils/supabase/client` の `createClient()` を利用することを推奨。

---

## 4. 型（types/ と app 内 types.ts）

- **アプリ全体で参照する型**（認証・共通 DTO など）→ `types/` に定義し、必要なら `types/index.ts` から re-export。
- **特定画面・機能専用の型** → そのルートの `types.ts`（例: `app/dashboard/types.ts`, `app/dashboard/cases/[id]/types.ts`）。
- API のリクエスト／レスポンス型は、その API の `route.ts` の近くで定義するか、`lib/` の該当モジュールにまとめてもよい。

---

## 5. データ取得・API 呼び出し

- **ページ用の fetch や Supabase 呼び出し**は、そのページの `data.ts` に関数としてまとめる（例: `fetchCaseDetails`, `fetchCaseTasks`）。
- **複数画面で使う**データ取得やビジネスロジックは `lib/` に置く（例: `lib/expert/cases.ts`）。

---

## 6. 命名・ファイル規則

- **コンポーネント**: PascalCase（例: `CaseCard.tsx`, `HearingTab.tsx`）。
- **ユーティリティ・hooks**: camelCase（例: `data.ts`, `useProfile.ts`）。
- **定数**: 必要に応じて UPPER_SNAKE または camelCase（プロジェクト内で統一）。
- **API ルート**: `route.ts` のみ。GET/POST 等は 1 ファイル内で export する。

---

## 7. 大きなページの分割

- 1 つの `page.tsx` が 500 行を超える場合は、以下を検討する。
  - タブやセクションごとに `components/` へ分割（例: `TodoTab.tsx`, `HearingTab.tsx`）。
  - フォームやモーダルを別コンポーネントに切り出す。
  - データ取得・副作用を `data.ts` やカスタムフックに移す。

---

## 8. よく使うパス一覧

```
@/components          # 共通コンポーネント
@/components/icons    # アイコン
@/components/layout   # レイアウト（Sidebar 等）
@/components/ui       # 汎用 UI（Button, Card 等）
@/lib                 # ドメイン・サーバー用ロジック
@/utils/supabase/client   # ブラウザ用 Supabase
@/utils/supabaseAdmin     # API 用 Supabase（Service Role）
@/hooks
@/store
@/types
```

---

このルールに沿うと、**「ページは app のルート単位」「共通は components / lib / utils / types」** で整理され、保守しやすくなります。新規機能追加時は、まずこのドキュメントで置き場所を確認してください。
