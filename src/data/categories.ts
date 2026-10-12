export type Category = { slug: string; name: string; description: string };

export const CATEGORIES: Category[] = [
  { slug: 'food', name: '食・特産品', description: '郷土料理、食材、特産品、食文化' },
  { slug: 'history', name: '歴史・文化', description: '地域の歴史、史跡、伝承、文化財' },
  { slug: 'festival', name: '祭り・行事', description: '祭り、年中行事、風習' },
  { slug: 'industry', name: '産業・仕事', description: '地場産業、伝統工芸、なりわい' },
  { slug: 'life', name: '暮らし', description: '生活の知恵、住まい、地域の仕組み' },
  { slug: 'nature', name: '自然・地理', description: '地形、気候、自然環境、防災' },
  { slug: 'language', name: '言葉・方言', description: '方言、地名の由来、言い回し' },
  { slug: 'community', name: '人・コミュニティ', description: '地域の人、団体、取り組み' },
  { slug: 'other', name: 'その他', description: '上記に当てはまらないもの' },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as [string, ...string[]];

export const categoryBySlug = (slug: string) => CATEGORIES.find((c) => c.slug === slug);
