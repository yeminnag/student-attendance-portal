# 出席率パンネル

読売理工医療福祉専門学校の学生向け出席確認アプリです。教員用出席管理システムと**同じ Supabase データベース**を共有し、学生が自分の出席率・今日の授業・月別の出席履歴を閲覧できます。

**Live:** https://student-attendance-portal-six.vercel.app/

## 機能

- **ログイン** — 学籍番号 + 管理者が設定したパスワード
- **ホーム** — 総合出席率、今日の授業（出席取り中 / 開始待ち / 終了）、授業別出席率
- **出席詳細** — 月別フィルター、科目ごとの記録一覧
- **出席率の計算** — 遅刻 3 回 = 欠席 1 回として換算
- **複数限の科目** — 同じ科目名（`course_name`）の授業は出席率を合算して表示

## 技術スタック

- React 19 + Vite
- React Router
- Supabase（Auth / PostgreSQL / RLS）
- Vercel（ホスティング）

## 関連プロジェクト

| プロジェクト | 用途 | URL |
|-------------|------|-----|
| **出席率パンネル**（本リポジトリ） | 学生向け閲覧 | https://student-attendance-portal-mu.vercel.app/ |
| **出席管理パンネル**（`attendance-taking-app`） | 教員・管理者向け出席管理 | — |

## ローカル開発

### 1. クローン & 依存関係

```bash
git clone <repository-url>
cd student-attendance-portal
npm install
```

### 2. 環境変数

```bash
cp .env.example .env
```

`.env` に教員アプリと同じ Supabase の値を設定します。

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. 開発サーバー

```bash
npm run dev
```

### 4. ビルド

```bash
npm run build
npm run preview
```

## データベース設定（必須）

Supabase SQL Editor で、教員アプリ側の `fix-profiles-rls.sql` を実行した**後**に、本リポジトリの SQL を実行してください。

| 順番 | ファイル | 内容 |
|------|---------|------|
| 1 | 教員アプリ `supabase/fix-profiles-rls.sql` | 基本 RLS・プロフィール |
| 2 | `supabase/student-portal-setup.sql` | 学生ロール、`student_id`、学生用 RLS |
| 3 | 教員アプリ `supabase/subject-course-group.sql` | 複数限の科目をまとめて集計（任意） |

## 学生アカウント

学生ログインは教員アプリの **学生管理 → 学生を追加 / 編集** から管理者が作成します。

- **ログイン ID:** 学籍番号
- **パスワード:** 管理者が設定
- **Auth メール:** `{学籍番号}@students.internal`（内部用、学生は入力不要）

## Vercel デプロイ

教員アプリとは**別の Vercel プロジェクト**としてデプロイします。

1. GitHub リポジトリを Vercel に接続
2. Framework Preset: **Vite**
3. 環境変数を設定:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

`SUPABASE_SERVICE_ROLE_KEY` は本アプリでは不要です（学生パスワードの作成・更新は教員アプリ側で行います）。

## プロジェクト構成

```
student-attendance-portal/
├── public/              # favicon など
├── src/
│   ├── components/      # Layout, ProtectedRoute
│   ├── context/         # AuthContext
│   ├── pages/           # Login, Dashboard, AttendanceHistory
│   └── utils/           # 出席計算、Supabase データ取得
├── supabase/
│   └── student-portal-setup.sql
├── supabase.js
└── vite.config.js
```

## ライセンス

Private — 学校内部利用
