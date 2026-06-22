# 学生出席ポータル

教員用出席管理アプリ（`attendance-taking-app`）と**同じ Supabase データベース**を使い、学生が自分の出席率・今日の授業・出席履歴を確認するための別プロジェクトです。

## 機能

- **ホーム** — 総合出席率、今日の授業（出席取り中 / これから / 終了・休講）、授業別出席率
- **出席詳細** — 授業ごとの記録一覧（遅刻 3 回 = 欠席 1 回換算）

## セットアップ

### 1. 依存関係

```bash
npm install
```

### 2. 環境変数

教員アプリと同じ Supabase プロジェクトの値を `.env` に設定します。

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. データベース（必須）

Supabase SQL Editor で、教員アプリの `fix-profiles-rls.sql` の**後**に以下を実行してください。

```
supabase/student-portal-setup.sql
```

これにより `profiles.student_id` が追加され、学生は**自分のデータのみ**読み取れる RLS に更新されます。

### 4. 学生アカウントの作成

教員用アプリ（`attendance-taking-app`）の **学生管理 → 学生を追加** から、管理者が学籍番号とパスワードを設定します（教員追加と同じ流れ）。

学生は **学籍番号 + 管理者が設定したパスワード** で本ポータルにログインします。

### 5. 開発サーバー

```bash
npm run dev
```

## デプロイ

Vercel などに**教員アプリとは別プロジェクト**としてデプロイしてください。環境変数は Supabase の 2 つだけで足ります。

## 関連リポジトリ

| プロジェクト | 用途 |
|-------------|------|
| `attendance-taking-app` | 教員・管理者向け出席管理 |
| `student-attendance-portal` | 学生向け閲覧ポータル（本リポジトリ） |
