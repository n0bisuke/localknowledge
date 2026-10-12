// 個別ページを持つ市町村。name は collector/sources.json の area と一致させる
export type Municipality = { slug: string; name: string; prefecture: string; reading?: string };

export const MUNICIPALITIES: Municipality[] = [
  { slug: 'nago', name: '名護市', prefecture: 'okinawa', reading: 'なごし' },
  { slug: 'kunigami', name: '国頭村', prefecture: 'okinawa', reading: 'くにがみそん' },
];

export const municipalityByName = (name: string) => MUNICIPALITIES.find((m) => m.name === name);
export const municipalitiesOf = (prefecture: string) =>
  MUNICIPALITIES.filter((m) => m.prefecture === prefecture);
