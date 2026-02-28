import { TeletextColor, PageDef } from './types';

// ─── Section configuration ────────────────────────────────────────────────────

export interface FeedSource {
  url: string;
  name: string;
}

export interface SectionConfig {
  key: string;
  page: number;       // base page number, e.g. 110
  name: string;       // display name
  shortName: string;  // ≤14 chars for header
  color: TeletextColor;
  feeds: FeedSource[];
}

export const SECTIONS: SectionConfig[] = [
  {
    key: 'breaking',
    page: 110,
    name: 'Breaking News',
    shortName: 'BREAKING NEWS',
    color: 'red',
    feeds: [
      { url: 'https://feeds.bbci.co.uk/news/rss.xml', name: 'BBC News' },
    ],
  },
  {
    key: 'world',
    page: 120,
    name: 'World News',
    shortName: 'WORLD NEWS',
    color: 'blue',
    feeds: [
      { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World' },
    ],
  },
  {
    key: 'uknews',
    page: 130,
    name: 'UK News',
    shortName: 'UK NEWS',
    color: 'yellow',
    feeds: [
      { url: 'https://feeds.bbci.co.uk/news/uk/rss.xml', name: 'BBC UK' },
    ],
  },
  {
    key: 'sport',
    page: 140,
    name: 'Sport',
    shortName: 'SPORT',
    color: 'green',
    feeds: [
      { url: 'https://feeds.bbci.co.uk/sport/rss.xml', name: 'BBC Sport' },
    ],
  },
  {
    key: 'business',
    page: 150,
    name: 'Business',
    shortName: 'BUSINESS',
    color: 'cyan',
    feeds: [
      { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', name: 'BBC Business' },
    ],
  },
  {
    key: 'culture',
    page: 160,
    name: 'Culture',
    shortName: 'CULTURE',
    color: 'magenta',
    feeds: [
      { url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', name: 'BBC Arts' },
    ],
  },
];

// ─── Color map: TeletextColor → CSS value ────────────────────────────────────

export const COLOR_CSS: Record<TeletextColor, string> = {
  black:   '#000000',
  red:     '#FF3333',
  green:   '#00FF66',
  yellow:  '#FFEE00',
  blue:    '#4488FF',
  magenta: '#FF00FF',
  cyan:    '#00FFFF',
  white:   '#FFFFFF',
  gray:    '#888888',
  dim:     '#444444',
  orange:  '#FF8800',
  pink:    '#FF66CC',
};

// ─── Section lookup helpers ───────────────────────────────────────────────────

export function getSectionByKey(key: string): SectionConfig | undefined {
  return SECTIONS.find(s => s.key === key);
}

export function getSectionByPage(page: number): SectionConfig | undefined {
  return SECTIONS.find(s => page >= s.page && page < s.page + 10);
}

// ─── Page map: page number → descriptor ─────────────────────────────────────

export function buildPageMap(): Map<number, PageDef> {
  const map = new Map<number, PageDef>();

  map.set(100, { pageNum: 100, label: 'Home' });
  map.set(199, { pageNum: 199, label: 'About / Sources' });

  for (const sec of SECTIONS) {
    map.set(sec.page,     { pageNum: sec.page,     label: `${sec.name} – Headlines`, sectionKey: sec.key, subPage: 0 });
    map.set(sec.page + 1, { pageNum: sec.page + 1, label: `${sec.name} – New Today`, sectionKey: sec.key, subPage: 1 });
    map.set(sec.page + 2, { pageNum: sec.page + 2, label: `${sec.name} – Signals`,   sectionKey: sec.key, subPage: 2 });
    map.set(sec.page + 3, { pageNum: sec.page + 3, label: `${sec.name} – Sources`,   sectionKey: sec.key, subPage: 3 });
  }

  return map;
}

// Ordered list for next/prev navigation
export const PAGE_ORDER: number[] = [
  100,
  ...SECTIONS.flatMap(s => [s.page, s.page + 1, s.page + 2, s.page + 3]),
  199,
];
