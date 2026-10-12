// collector（GitHub Actions）が data/collected/ に保存した取得結果を読み込む

export type CollectedItem = {
  title: string;
  url: string;
  date?: string;
  publisher?: string;
  firstSeen: string;
};

export type CollectedSource = {
  source: {
    id: string;
    name: string;
    kind: 'official' | 'news' | 'wikipedia' | 'other';
    prefecture: string;
    area: string;
    url: string;
  };
  method: string;
  summary?: { text: string; url: string; license: string };
  lastFetchedAt: string;
  items: CollectedItem[];
};

const files = import.meta.glob<CollectedSource>('/data/collected/*.json', {
  eager: true,
  import: 'default',
});

export const collectedSources: CollectedSource[] = Object.values(files);

/** 地域（市町村）ごとにまとめる。順序は最初に出てきた順 */
export function groupByArea(sources = collectedSources) {
  const map = new Map<string, CollectedSource[]>();
  for (const s of sources) {
    const list = map.get(s.source.area) ?? [];
    list.push(s);
    map.set(s.source.area, list);
  }
  return [...map];
}

/** 日付（なければ初回取得日）の新しい順 */
export const sortByDate = (items: CollectedItem[]) =>
  [...items].sort((a, b) => (b.date ?? b.firstSeen).localeCompare(a.date ?? a.firstSeen));
