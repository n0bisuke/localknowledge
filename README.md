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
