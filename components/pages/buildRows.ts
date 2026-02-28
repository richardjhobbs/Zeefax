/**
 * Page-content builders.
 * Each returns an array of ScreenRow (max 23 – header is row 0, footer is row 24).
 */

import { AllFeedsData, FeedItem, RowSegment, TeletextColor } from '@/lib/types';
import { SECTIONS, SectionConfig } from '@/lib/feedConfig';
import { formatTime, isNewToday } from '@/lib/rssUtils';
import {
  COLS, pad, padLeft, centre, seg, blank, emptyRow,
  headerRow, sectionBar, separator, subBar, loadingRow, navHintRow,
} from '@/lib/rowBuilder';
import { ScreenRow } from '@/components/TeletextScreen';

// ─── Shared header builder ────────────────────────────────────────────────────

function header(pageNum: number, now: Date): ScreenRow {
  return { segments: headerRow(pageNum, now) };
}

// ─── Headline pair ────────────────────────────────────────────────────────────

function headlinePair(
  item: FeedItem,
  color: TeletextColor,
  isNew: boolean,
): ScreenRow[] {
  const timeStr = formatTime(item);
  const BADGE   = isNew ? ' [NEW]' : '';
  const OPEN    = '[OPEN]';
  const OPEN_W  = OPEN.length;

  // Title line: "  ■ TITLE…" padded to 40
  const PREFIX   = '  \u25a0 ';
  const maxTitle = COLS - PREFIX.length - BADGE.length;
  const titleStr = item.title.length > maxTitle
    ? item.title.slice(0, maxTitle - 1) + '\u2026'
    : item.title;

  const titleSegs: RowSegment[] = [
    seg(PREFIX, color, 'black'),
    seg(pad(titleStr, maxTitle), 'white', 'black'),
  ];
  if (BADGE) titleSegs.push(seg(BADGE, 'yellow', 'black'));

  // Meta line: "    SOURCE        HH:MM  [OPEN]"
  const srcTrim = pad(item.source.slice(0, 13), 13);
  const timeTrim = pad(timeStr, 5);
  const leftW    = 4 + 13 + 2 + 5 + 1;  // "    " + src + "  " + time + " "
  const padW     = COLS - leftW - OPEN_W;

  const metaSegs: RowSegment[] = [
    seg('    ',   'black', 'black'),
    seg(srcTrim,  'gray',  'black'),
    seg('  ',     'gray',  'black'),
    seg(timeTrim, 'gray',  'black'),
    seg(' '.repeat(Math.max(0, padW)), 'black', 'black'),
    seg(OPEN,     'red',   'black', { link: item.link }),
  ];

  return [
    { segments: titleSegs },
    { segments: metaSegs, rowLink: item.link },
  ];
}

// ─── HOME PAGE (100) ──────────────────────────────────────────────────────────

export function buildHomePage(data: AllFeedsData, now: Date): ScreenRow[] {
  const rows: ScreenRow[] = [];

  // Row 0: header
  rows.push(header(100, now));

  // Rows 1-2: hero title block
  rows.push({ segments: [seg(centre('  Z E E F A X', COLS), 'yellow', 'blue')] });
  rows.push({ segments: [seg(centre('RETRO NEWS TERMINAL', COLS), 'white',  'blue')] });

  // Remaining rows: 3–22 = 20 rows for 7 sections (some get 3, some 2)
  for (let i = 0; i < SECTIONS.length; i++) {
    const sec  = SECTIONS[i];
    const feed = data[sec.key];
    const item = feed?.items?.[0];

    // Category bar
    rows.push({
      segments: sectionBar(sec.shortName, sec.page, sec.color),
    });

    if (!item) {
      rows.push({ segments: [seg(pad('  No items available', COLS), 'gray', 'black')] });
    } else {
      const isNew = isNewToday(item);
      const timeStr = formatTime(item);
      const OPEN    = '[OPEN]';
      const PREFIX  = '  ';
      const maxT    = COLS - PREFIX.length - OPEN.length - 1;
      const title   = item.title.length > maxT ? item.title.slice(0, maxT - 1) + '\u2026' : item.title;
      rows.push({
        segments: [
          seg(PREFIX, 'white',  'black'),
          seg(pad(title, maxT), sec.color, 'black'),
          seg(' ', 'black', 'black'),
          seg(OPEN, 'red',  'black', { link: item.link }),
        ],
        rowLink: item.link,
      });
    }

    // Add blank row after every section except last, if space permits
    if (i < SECTIONS.length - 1 && rows.length < 22) {
      rows.push({ segments: emptyRow() });
    }
  }

  // Fill to row 23
  while (rows.length < 23) {
    rows.push({ segments: emptyRow() });
  }

  // Row 23: navigation hint
  rows.push({ segments: [
    seg(centre('TYPE PAGE NUMBER ─ ◄ PREV   NEXT ►', COLS), 'gray', 'black'),
  ]});

  return rows.slice(0, 24);
}

// ─── SECTION PAGE – sub-page 0 (top headlines) ───────────────────────────────

export function buildSectionTopPage(
  sec: SectionConfig,
  data: AllFeedsData,
  now: Date,
): ScreenRow[] {
  const rows: ScreenRow[] = [];
  const feed  = data[sec.key];
  const items = feed?.items ?? [];

  rows.push(header(sec.page, now));
  rows.push({ segments: sectionBar(`${sec.shortName}  ─  TOP HEADLINES`, sec.page, sec.color) });
  rows.push({ segments: separator() });

  if (items.length === 0) {
    rows.push({ segments: [seg(pad('  NO FEEDS LOADED — REFRESH TO RETRY', COLS), 'red', 'black')] });
  } else {
    for (const item of items) {
      if (rows.length >= 22) break;
      const isNew = isNewToday(item);
      const pairs = headlinePair(item, sec.color, isNew);
      for (const p of pairs) {
        if (rows.length >= 22) break;
        rows.push(p);
      }
    }
  }

  while (rows.length < 23) rows.push({ segments: emptyRow() });

  // Sub-page nav hint
  rows.push({ segments: [
    seg(centre(`${sec.page + 1}:NEW  ${sec.page + 2}:SIGNALS  ${sec.page + 3}:SOURCES`, COLS), 'gray', 'black'),
  ]});

  return rows.slice(0, 24);
}

// ─── SECTION PAGE – sub-page 1 (new today, < 24h) ────────────────────────────

export function buildSectionNewPage(
  sec: SectionConfig,
  data: AllFeedsData,
  now: Date,
): ScreenRow[] {
  const rows: ScreenRow[] = [];
  const feed  = data[sec.key];
  const all   = feed?.items ?? [];
  const items = all.filter(isNewToday);

  rows.push(header(sec.page + 1, now));
  rows.push({ segments: sectionBar(`${sec.shortName}  ─  NEW TODAY`, sec.page + 1, sec.color) });
  rows.push({ segments: separator() });

  if (items.length === 0) {
    rows.push({ segments: [seg(pad('  NOTHING NEW IN THE LAST 24 HOURS', COLS), 'gray', 'black')] });
  } else {
    for (const item of items) {
      if (rows.length >= 22) break;
      const pairs = headlinePair(item, sec.color, true);
      for (const p of pairs) {
        if (rows.length >= 22) break;
        rows.push(p);
      }
    }
  }

  while (rows.length < 23) rows.push({ segments: emptyRow() });

  rows.push({ segments: [
    seg(centre(`${sec.page}:ALL  ${sec.page + 2}:SIGNALS  ${sec.page + 3}:SOURCES`, COLS), 'gray', 'black'),
  ]});

  return rows.slice(0, 24);
}

// ─── SECTION PAGE – sub-page 2 (signals / trend bullets) ────────────────────

export function buildSectionSignalsPage(
  sec: SectionConfig,
  data: AllFeedsData,
  now: Date,
): ScreenRow[] {
  const rows: ScreenRow[] = [];
  const feed  = data[sec.key];
  const items = (feed?.items ?? []).slice(0, 20);

  rows.push(header(sec.page + 2, now));
  rows.push({ segments: sectionBar(`${sec.shortName}  ─  SIGNALS`, sec.page + 2, sec.color) });
  rows.push({ segments: separator() });
  rows.push({ segments: [seg(pad('  AUTO-EXTRACTED TREND SIGNALS:', COLS), sec.color, 'black')] });
  rows.push({ segments: emptyRow() });

  // Extract word-frequency signal keywords from titles
  const signals = extractSignals(items);

  for (const s of signals.slice(0, 14)) {
    if (rows.length >= 22) break;
    rows.push({
      segments: [
        seg('  \u25b6 ', sec.color, 'black'),
        seg(pad(s, COLS - 4), 'white', 'black'),
      ],
    });
  }

  if (signals.length === 0) {
    rows.push({ segments: [seg(pad('  NOT ENOUGH DATA YET', COLS), 'gray', 'black')] });
  }

  while (rows.length < 23) rows.push({ segments: emptyRow() });

  rows.push({ segments: [
    seg(centre(`${sec.page}:ALL  ${sec.page + 1}:NEW  ${sec.page + 3}:SOURCES`, COLS), 'gray', 'black'),
  ]});

  return rows.slice(0, 24);
}

// ─── SECTION PAGE – sub-page 3 (sources) ─────────────────────────────────────

export function buildSectionSourcesPage(
  sec: SectionConfig,
  data: AllFeedsData,
  now: Date,
): ScreenRow[] {
  const rows: ScreenRow[] = [];
  const feed = data[sec.key];

  rows.push(header(sec.page + 3, now));
  rows.push({ segments: sectionBar(`${sec.shortName}  ─  SOURCES`, sec.page + 3, sec.color) });
  rows.push({ segments: separator() });
  rows.push({ segments: [seg(pad('  FEEDS POWERING THIS SECTION:', COLS), sec.color, 'black')] });
  rows.push({ segments: emptyRow() });

  for (const f of sec.feeds) {
    rows.push({
      segments: [
        seg('  \u25cf ', sec.color, 'black'),
        seg(pad(f.name, 15), 'white', 'black'),
        seg('  ', 'black', 'black'),
        seg(pad(f.url.replace(/^https?:\/\//, '').slice(0, 21), 21), 'gray', 'black'),
      ],
    });
  }

  rows.push({ segments: emptyRow() });

  // Fetch status
  const fetchedAt = feed?.fetchedAt;
  if (fetchedAt) {
    try {
      const d = new Date(fetchedAt);
      const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      rows.push({ segments: [seg(pad(`  LAST FETCHED: ${timeStr}`, COLS), 'gray', 'black')] });
    } catch {/* ignore */}
  }
  rows.push({ segments: [seg(pad('  CACHE: 15 MIN  HEADLINE+LINK ONLY', COLS), 'gray', 'black')] });
  rows.push({ segments: emptyRow() });

  if (feed?.error) {
    rows.push({ segments: [seg(pad(`  ERROR: ${feed.error.slice(0, 30)}`, COLS), 'red', 'black')] });
  }

  while (rows.length < 23) rows.push({ segments: emptyRow() });

  rows.push({ segments: [
    seg(centre(`${sec.page}:ALL  ${sec.page + 1}:NEW  ${sec.page + 2}:SIGNALS`, COLS), 'gray', 'black'),
  ]});

  return rows.slice(0, 24);
}

// ─── ABOUT PAGE (199) ─────────────────────────────────────────────────────────

export function buildAboutPage(now: Date): ScreenRow[] {
  const rows: ScreenRow[] = [];

  rows.push(header(199, now));
  rows.push({ segments: [seg(centre('ABOUT ZEEFAX', COLS), 'yellow', 'blue')] });
  rows.push({ segments: separator() });

  const lines = [
    '',
    '  ZEEFAX IS A RETRO TELETEXT-STYLE',
    '  NEWS AGGREGATOR. NO ALGORITHMS.',
    '  NO TRACKING. JUST HEADLINES.',
    '',
    '  NAVIGATE WITH PAGE NUMBERS:',
    '  100  HOME',
    '  110  GENERATIVE AI',
    '  120  FASHION DESIGNERS',
    '  130  ARCHITECTURE',
    '  140  CONSUMER PRODUCTS',
    '  150  URBAN PLANNING',
    '  160  DIGITAL DESIGN',
    '  170  FRONTIER TECH',
    '',
    '  ADD +1 FOR NEW TODAY',
    '  ADD +2 FOR SIGNALS',
    '  ADD +3 FOR SOURCES',
    '',
    '  HEADLINES ONLY. CLICK [OPEN] TO',
    '  READ THE ORIGINAL ARTICLE.',
    '',
  ];

  for (const line of lines) {
    if (rows.length >= 23) break;
    rows.push({ segments: [seg(pad(line, COLS), 'white', 'black')] });
  }

  while (rows.length < 23) rows.push({ segments: emptyRow() });

  rows.push({ segments: [
    seg(centre('100:HOME  110:AI  120:FASHION', COLS), 'gray', 'black'),
  ]});

  return rows.slice(0, 24);
}

// ─── NOT FOUND page ───────────────────────────────────────────────────────────

export function buildNotFoundPage(pageNum: number, now: Date): ScreenRow[] {
  const rows: ScreenRow[] = [];

  rows.push(header(pageNum, now));
  rows.push({ segments: [seg(centre('PAGE NOT FOUND', COLS), 'red', 'black')] });
  rows.push({ segments: separator() });
  rows.push({ segments: emptyRow() });
  rows.push({ segments: [seg(centre(`PAGE ${pageNum} DOES NOT EXIST`, COLS), 'yellow', 'black')] });
  rows.push({ segments: emptyRow() });
  rows.push({ segments: [seg(centre('VALID PAGES:', COLS), 'white', 'black')] });
  rows.push({ segments: emptyRow() });
  rows.push({ segments: [seg(centre('100  HOME', COLS), 'cyan', 'black')] });
  rows.push({ segments: [seg(centre('110  GENERATIVE AI', COLS), 'cyan', 'black')] });
  rows.push({ segments: [seg(centre('120  FASHION', COLS), 'magenta', 'black')] });
  rows.push({ segments: [seg(centre('130  ARCHITECTURE', COLS), 'green', 'black')] });
  rows.push({ segments: [seg(centre('140  CONSUMER PRODUCTS', COLS), 'yellow', 'black')] });
  rows.push({ segments: [seg(centre('150  URBAN PLANNING', COLS), 'white', 'black')] });
  rows.push({ segments: [seg(centre('160  DIGITAL DESIGN', COLS), 'blue', 'black')] });
  rows.push({ segments: [seg(centre('170  FRONTIER TECH', COLS), 'red', 'black')] });
  rows.push({ segments: [seg(centre('199  ABOUT', COLS), 'gray', 'black')] });

  while (rows.length < 23) rows.push({ segments: emptyRow() });
  rows.push({ segments: [seg(centre('TYPE A 3-DIGIT PAGE NUMBER', COLS), 'gray', 'black')] });

  return rows.slice(0, 24);
}

// ─── Signal extraction helper ─────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might',
  'this','that','these','those','it','its','as','not','no','new','how',
  'what','which','who','when','where','why','all','also','into','about',
  'up','out','use','using','used','via','can','over','after','more','than',
  'large','model','models','paper','research','based','using','through',
]);

function extractSignals(items: FeedItem[]): string[] {
  const freq = new Map<string, number>();

  for (const item of items) {
    const words = item.title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w));

    for (const w of words) {
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }

  const sorted = [...freq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  return sorted.map(([word, count]) => {
    const bar = '\u2588'.repeat(Math.min(count, 8));
    const label = word.toUpperCase();
    return pad(`${label}`, 20) + `  ${bar} (${count})`;
  });
}
