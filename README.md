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
- `/areas/<市町村>/` 市町村ページ（ナレッジ＋収集した情報）。対象の市町村は `src/data/municipalities.ts` で設定
- `/collected/` 収集した情報の一覧

## 公開（GitHub Pages）

`.github/workflows/deploy.yml` により、`main` ブランチへの push で GitHub Pages にデプロイされます。
リポジトリの Settings → Pages → Source を「GitHub Actions」に設定してください。
独自ドメインで公開する場合は `astro.config.mjs` の `site` / `base` を変更します。

## 情報の自動取得（GitHub Actions）

`.github/workflows/collect.yml` が `collector/sources.json` の情報源から情報を取得し、
`data/collected/` を `main` に直接コミットします。コミット後は `deploy.yml` が自動で走り、
サイトの「収集情報」ページ（`/collected/`）に反映されます。取得のみで、記事化は手動で行います。

- 実行タイミング: 毎日 6:47（JST）／ `collector/` を変更して `main` に入ったとき／ Actions タブから手動（Run workflow）
- 保存先:
  - `data/collected/<id>.json` … 情報源ごとの取得済み一覧（`firstSeen` = 初めて見つけた日）
  - `data/collected/reports/<日付>.md` … その日の新着一覧
- ローカル実行: `npm run collect`

### 情報源の種類

| 種類 | 設定 | 取得内容 |
| --- | --- | --- |
| 公式サイト等の Web ページ | `url` | ページ内の RSS/Atom を自動検出。なければサイト内リンクを抽出（Shift_JIS 対応） |
| RSS/Atom | `feed` | フィードの記事（Google ニュースの検索 RSS など） |
| Wikipedia | `wikipedia`（記事名） | 記事の概要文と最新版。版が更新されると新着として記録 |

### 情報源の設定（`collector/sources.json`）

| 項目 | 必須 | 内容 |
| --- | --- | --- |
| `id` | ○ | 保存ファイル名に使う ID |
| `name` / `prefecture` / `area` | ○ | 表示名・都道府県 slug・市町村名（`src/data/municipalities.ts` の `name` と一致させると市町村ページに表示） |
| `kind` | ○ | `official`（公式サイト） / `news` / `wikipedia` |
| `url` | ○ | 取得するページ（`feed` / `wikipedia` の場合は表示用リンク） |
| `feed` | | RSS/Atom の URL |
| `wikipedia` | | Wikipedia の記事名（`lang` で言語を変更可。既定: `ja`） |
| `selector` | | リンク抽出の対象範囲（CSS セレクタ。例: `#news`） |
| `include` / `exclude` | | 対象にする / 除外する URL の正規表現の配列 |
| `minTitleLength` | | これより短いリンク文字列は無視（既定: 6） |

公式サイトは初回にメニュー等のリンクも記録されます。ページでは日付のあるものを優先して表示し、
日付のないリンクは折りたたんでいます。必要に応じて `selector` や `include` で絞り込んでください。
