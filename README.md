# ローカルナレッジ

地方のナレッジ（食・歴史・祭り・産業・暮らし・方言など）を調査し、出典とともにまとめていくサイトです。
[Astro](https://astro.build/) による静的サイトで、記事は Markdown で管理します。

## セットアップ

```sh
npm install
npm run dev      # http://localhost:4321/localknowledge/ で確認
npm run build    # dist/ に静的ファイルを出力
```

## 記事の追加

```sh
npm run new -- <都道府県slug> <ファイル名slug> [カテゴリslug]
# 例: npm run new -- nagano oyaki food
```

`src/content/knowledge/<都道府県slug>/<ファイル名slug>.md` がテンプレートから作成されます。
作成直後は `status: draft`（非公開）なので、書き終えたら `researching` か `done` に変更してください。

### フロントマター

| 項目 | 必須 | 内容 |
| --- | --- | --- |
| `title` | ○ | タイトル |
| `summary` | ○ | 一行要約（一覧に表示） |
| `prefecture` | ○ | 都道府県 slug（`src/data/prefectures.ts`） |
| `area` | | 市区町村・地区など |
| `category` | ○ | カテゴリ slug（`src/data/categories.ts`） |
| `tags` | | タグの配列 |
| `researchedAt` | ○ | 調査日 |
| `updatedAt` | | 更新日 |
| `status` | | `draft`（非公開） / `researching`（調査中） / `done`（まとめ済み） |
| `sources` | | 出典の配列（`title`, `url`, `type`: web/book/interview/fieldwork/other, `note`） |

フロントマターの値が不正な場合（存在しない都道府県 slug など）はビルドエラーになります。

## ページ構成

- `/` トップ（新着・地域別・カテゴリ別）
- `/knowledge/` 一覧、`/knowledge/<都道府県>/<slug>/` 記事
- `/regions/`、`/regions/<都道府県>/` 地域別
- `/categories/`、`/categories/<カテゴリ>/` カテゴリ別
- `/tags/`、`/tags/<タグ>/` タグ別

## 公開（GitHub Pages）

`.github/workflows/deploy.yml` により、`main` ブランチへの push で GitHub Pages にデプロイされます。
リポジトリの Settings → Pages → Source を「GitHub Actions」に設定してください。
独自ドメインで公開する場合は `astro.config.mjs` の `site` / `base` を変更します。

## 情報の自動取得（GitHub Actions）

`.github/workflows/collect.yml` が毎日 6:47（JST）に `collector/sources.json` の情報源から新着情報を取得し、
差分があれば PR（ブランチ `collect/auto`）を作成します。Actions タブから手動実行（Run workflow）もできます。
取得のみで、記事化（`src/content/knowledge/`）は手動で行います。

- 取得方式: `feed`（RSS/Atom の URL）があればそれを読み、なければページ内の RSS/Atom を自動検出、
  見つからなければページ内のサイト内リンクを抽出します。Shift_JIS のページにも対応しています。
- 保存先:
  - `data/collected/<id>.json` … 情報源ごとの取得済み一覧（`firstSeen` = 初めて見つけた日）
  - `data/collected/reports/<日付>.md` … その日の新着一覧
- ローカル実行: `npm run collect`

### 情報源の追加・調整（`collector/sources.json`）

| 項目 | 必須 | 内容 |
| --- | --- | --- |
| `id` | ○ | 保存ファイル名に使う ID |
| `name` / `prefecture` / `area` | ○ | 表示名・都道府県 slug・市町村名 |
| `url` | ○ | 取得するページ |
| `feed` | | RSS/Atom の URL（分かっている場合） |
| `selector` | | リンク抽出の対象範囲（CSS セレクタ。例: `#news`） |
| `include` / `exclude` | | 対象にする / 除外する URL の正規表現の配列 |
| `minTitleLength` | | これより短いリンク文字列は無視（既定: 6） |

初回はトップページのメニュー等も含めて記録されるため、結果を見て `selector` や `include` で絞り込んでください。

### 初回の準備

リポジトリの Settings → Actions → General → Workflow permissions で
「Allow GitHub Actions to create and approve pull requests」を有効にしてください。
