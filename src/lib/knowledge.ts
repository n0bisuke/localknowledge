import { getCollection, type CollectionEntry } from 'astro:content';

export type Knowledge = CollectionEntry<'knowledge'>;

/** 公開対象（draft 以外）のナレッジを新しい順で取得 */
export async function getPublishedKnowledge(): Promise<Knowledge[]> {
  const entries = await getCollection('knowledge', ({ data }) => data.status !== 'draft');
  return entries.sort((a, b) => dateOf(b).getTime() - dateOf(a).getTime());
}

export const dateOf = (k: Knowledge) => k.data.updatedAt ?? k.data.researchedAt;

/** base を考慮した内部リンクを作る */
export const url = (path: string) =>
  `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

export const formatDate = (d: Date) =>
  `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;

export const STATUS_LABEL = {
  draft: '下書き',
  researching: '調査中',
  done: 'まとめ済み',
} as const;

export const SOURCE_TYPE_LABEL = {
  web: 'Web',
  book: '文献',
  interview: '聞き取り',
  fieldwork: '現地調査',
  other: 'その他',
} as const;
