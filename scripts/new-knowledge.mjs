// 新しいナレッジ記事をテンプレートから作成する
// 使い方: npm run new -- <都道府県slug> <ファイル名slug> [カテゴリslug]
// 例:     npm run new -- nagano oyaki food
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [prefecture, slug, category = 'other'] = process.argv.slice(2);

if (!prefecture || !slug) {
  console.error('使い方: npm run new -- <都道府県slug> <ファイル名slug> [カテゴリslug]');
  process.exit(1);
}

const dir = join(root, 'src/content/knowledge', prefecture);
const file = join(dir, `${slug}.md`);
if (existsSync(file)) {
  console.error(`既に存在します: ${file}`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const template = readFileSync(join(root, 'src/content/knowledge/_template.md'), 'utf8')
  .replace(/^# このファイルはテンプレートです.*\n/m, '')
  .replace(/^prefecture: \S+/m, `prefecture: ${prefecture}`)
  .replace(/^category: \S+/m, `category: ${category}`)
  .replace(/^researchedAt: \S+/m, `researchedAt: ${today}`);

mkdirSync(dir, { recursive: true });
writeFileSync(file, template);
console.log(`作成しました: ${file}`);
