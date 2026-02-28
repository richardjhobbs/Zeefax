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
    key: 'ai',
    page: 110,
    name: 'Generative AI',
    shortName: 'GENERATIVE AI',
    color: 'cyan',
    feeds: [
      { url: 'https://rss.arxiv.org/rss/cs.AI',           name: 'arXiv·AI'  },
      { url: 'https://rss.arxiv.org/rss/cs.CL',           name: 'arXiv·NLP' },
      { url: 'https://rss.arxiv.org/rss/cs.LG',           name: 'arXiv·ML'  },
      { url: 'https://news.ycombinator.com/rss',           name: 'HackerNews'},
      { url: 'https://www.technologyreview.com/feed/',     name: 'MIT TechRev'},
    ],
  },
  {
    key: 'fashion',
    page: 120,
    name: 'Fashion Designers',
    shortName: 'FASHION',
    color: 'magenta',
    feeds: [
      { url: 'https://www.dezeen.com/design/feed/',        name: 'Dezeen Design' },
      { url: 'https://fashionunited.com/rss',              name: 'FashionUnited' },
      { url: 'https://www.harpersbazaar.com/rss/all.xml/', name: 'Harper\'s Bazaar' },
    ],
  },
  {
    key: 'architecture',
    page: 130,
    name: 'Architecture',
    shortName: 'ARCHITECTURE',
    color: 'green',
    feeds: [
      { url: 'https://www.dezeen.com/architecture/feed/',   name: 'Dezeen'    },
      { url: 'https://feeds.feedburner.com/Archdaily',      name: 'ArchDaily' },
      { url: 'https://www.architectural-review.com/feed',   name: 'AR'        },
    ],
  },
  {
    key: 'products',
    page: 140,
    name: 'Consumer Products',
    shortName: 'CONSUMER PRODUCTS',
    color: 'yellow',
    feeds: [
      { url: 'https://design-milk.com/feed/',     name: 'Design Milk' },
      { url: 'https://www.yankodesign.com/feed/', name: 'Yanko'       },
      { url: 'https://www.dezeen.com/design/feed/', name: 'Dezeen'    },
    ],
  },
  {
    key: 'urban',
    page: 150,
    name: 'Urban Planning',
    shortName: 'URBAN PLANNING',
    color: 'white',
    feeds: [
      { url: 'https://www.dezeen.com/architecture/feed/',  name: 'Dezeen'     },
      { url: 'https://feeds.feedburner.com/Archdaily',      name: 'ArchDaily'  },
      { url: 'https://www.theurbanist.org/feed/',          name: 'Urbanist'   },
    ],
  },
  {
    key: 'digital',
    page: 160,
    name: 'Digital Design',
    shortName: 'DIGITAL DESIGN',
    color: 'blue',
    feeds: [
      { url: 'https://www.smashingmagazine.com/feed/', name: 'Smashing'    },
      { url: 'https://uxdesign.cc/feed',               name: 'UX Collect'  },
      { url: 'https://www.creativebloq.com/feeds/all.atom.xml', name: 'CreativeBloq' },
    ],
  },
  {
    key: 'frontier',
    page: 170,
    name: 'Frontier Tech',
    shortName: 'FRONTIER TECH',
    color: 'red',
    feeds: [
      { url: 'https://spectrum.ieee.org/feeds/feed.rss',    name: 'IEEE Spectrum' },
      { url: 'https://www.technologyreview.com/feed/',      name: 'MIT Tech Rev'  },
      { url: 'https://rss.arxiv.org/rss/cs.RO',            name: 'arXiv·Robotics'},
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
