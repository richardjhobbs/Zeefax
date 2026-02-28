/**
 * Row-building utilities for the 40-column teletext grid.
 *
 * All helpers take/return plain data; JSX rendering is done in TeletextScreen.
 */

import { RowSegment, TeletextColor } from './types';

export const COLS = 40;

// ─── String padding / truncation ─────────────────────────────────────────────

/** Pad/truncate s to exactly n chars. */
export function pad(s: string, n: number, ch = ' '): string {
  if (s.length >= n) return s.slice(0, n);
  return s + ch.repeat(n - s.length);
}

/** Right-align s within n chars. */
export function padLeft(s: string, n: number, ch = ' '): string {
  if (s.length >= n) return s.slice(0, n);
  return ch.repeat(n - s.length) + s;
}

/** Centre s within n chars. */
export function centre(s: string, n: number, ch = ' '): string {
  if (s.length >= n) return s.slice(0, n);
  const total = n - s.length;
  const l = Math.floor(total / 2);
  const r = total - l;
  return ch.repeat(l) + s + ch.repeat(r);
}

/** A full-width horizontal rule using a character. */
export function hrule(ch = '─'): string {
  return ch.repeat(COLS);
}

// ─── Segment builders ─────────────────────────────────────────────────────────

/** One span that fills exactly w characters. */
export function seg(
  text: string,
  fg: TeletextColor,
  bg: TeletextColor = 'black',
  extra?: Partial<RowSegment>,
): RowSegment {
  return { text, fg, bg, ...extra };
}

/** A blank span of w spaces with the given background. */
export function blank(w: number, bg: TeletextColor = 'black'): RowSegment {
  return { text: ' '.repeat(w), fg: 'black', bg };
}

// ─── Composite row builders ───────────────────────────────────────────────────

/** Full 40-column blank row. */
export function emptyRow(): RowSegment[] {
  return [{ text: pad('', COLS), fg: 'white', bg: 'black' }];
}

/**
 * Header row – appears at row 0.
 * [ZEEFAX][   date   ][page]
 */
export function headerRow(pageNum: number, now: Date): RowSegment[] {
  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const pageStr = `P.${pageNum}`;

  // left: 8, centre: fills remainder, right: 6
  const left  = pad('ZEEFAX', 7);
  const right = padLeft(pageStr, 5);
  const mid   = centre(`${dateStr}  ${timeStr}`, COLS - left.length - right.length);

  return [
    seg(left, 'yellow', 'blue'),
    seg(mid,  'white',  'blue'),
    seg(right,'cyan',   'blue'),
  ];
}

/**
 * Section title bar – spans full 40 cols, colour-coded.
 * ▌ SECTION NAME                         NNN ▐
 */
export function sectionBar(
  label: string,
  pageNum: number,
  color: TeletextColor,
): RowSegment[] {
  const pageStr = String(pageNum);
  const inner   = COLS - 4; // 2 chars padding each side
  const title   = pad(label, inner - pageStr.length - 1);
  return [
    seg(' ', color, 'black'),           // left accent
    seg(pad(` ${title} ${pageStr} `, COLS - 1), 'black', color),
  ];
}

/**
 * Sub-section bar (thinner, used inside pages for grouping).
 */
export function subBar(label: string, color: TeletextColor): RowSegment[] {
  return [
    seg('▌', color, 'black'),
    seg(pad(` ${label} `, COLS - 2), 'black', color),
    seg('▐', color, 'black'),
  ];
}

/**
 * A headline item row pair:
 *  Row 1: "  ■ TITLE TEXT TRIMMED HERE …"
 *  Row 2: "    SOURCE   HH:MM  [OPEN]"
 *
 * Returns two RowSegment arrays plus the article link.
 */
export interface HeadlineRows {
  titleRow: RowSegment[];
  metaRow:  RowSegment[];
  link:     string;
  isNew:    boolean;
}

export function headlineRows(
  title: string,
  source: string,
  timeStr: string,
  link: string,
  sectionColor: TeletextColor,
  isNew: boolean,
  badge?: string, // e.g. 'NEW', 'HOT'
): HeadlineRows {
  const OPEN_TAG = '[OPEN]';
  const OPEN_W   = OPEN_TAG.length;
  const META_OPEN_W = 4; // "    "
  const SOURCE_MAX = COLS - META_OPEN_W - 1 - 6 - 1 - OPEN_W; // available for source + time

  // Title row: "  ■ " prefix (4 chars) + title
  const PREFIX     = '  \u25a0 ';          // "  ■ "
  const titleWidth = COLS - PREFIX.length;
  const titleTrim  = title.length > titleWidth
    ? title.slice(0, titleWidth - 1) + '\u2026' // …
    : pad(title, titleWidth);

  // Meta row: "    " + source (left) + "  " + time (right) + " [OPEN]"
  const sourceStr  = pad(source.slice(0, 12), 12);
  const timeStrP   = pad(timeStr, 5);
  const metaMid    = `${sourceStr}  ${timeStrP} `;
  const metaMidW   = META_OPEN_W + metaMid.length;
  const padMid     = metaMidW < COLS - OPEN_W
    ? ' '.repeat(COLS - OPEN_W - metaMidW)
    : '';

  const titleRow: RowSegment[] = [
    seg(PREFIX, sectionColor, 'black'),
    seg(titleTrim, 'white', 'black'),
  ];

  const metaRow: RowSegment[] = [
    seg('    ',  'black',  'black'),
    seg(sourceStr, 'gray', 'black'),
    seg('  ',   'black', 'black'),
    seg(timeStrP, 'gray', 'black'),
    seg(padMid + ' ', 'black', 'black'),
    seg(OPEN_TAG, 'red', 'black', { link }),
  ];

  if (badge && isNew) {
    // Overlay badge in title row
    const badgeStr = `[${badge}]`;
    titleRow[0] = seg(PREFIX, sectionColor, 'black');
    // Append badge at end of title segment
    const trimmed = title.slice(0, titleWidth - badgeStr.length - 1);
    titleRow[1] = seg(pad(trimmed, titleWidth - badgeStr.length) + badgeStr, 'white', 'black');
  }

  return { titleRow, metaRow, link, isNew };
}

/**
 * Footer row – appears at row 24.
 * [◄ PREV][   PAGE ___   ][NEXT ►]
 */
export function footerRow(
  prevPage: number | null,
  nextPage: number | null,
): RowSegment[] {
  const prevStr = prevPage ? `\u25c4${prevPage}` : '     ';
  const nextStr = nextPage ? `${nextPage}\u25ba` : '     ';

  const leftW   = 5;
  const rightW  = 5;
  const midW    = COLS - leftW - rightW;
  const midText = centre('PAGE ___', midW);

  return [
    seg(pad(prevStr, leftW),  'cyan',   'footer' as TeletextColor),
    seg(midText,               'yellow', 'footer' as TeletextColor),
    seg(padLeft(nextStr, rightW), 'cyan', 'footer' as TeletextColor),
  ];
}

/**
 * Navigation hint row (second footer row inside content area).
 * Shows sub-page hints and keyboard shortcuts.
 */
export function navHintRow(hints: string[]): RowSegment[] {
  const joined = hints.join('  ');
  return [seg(centre(joined, COLS), 'gray', 'black')];
}

/** Centred title block (for home page hero). */
export function titleBlock(lines: string[], bg: TeletextColor, fg: TeletextColor): RowSegment[][] {
  return lines.map(line => [seg(centre(line, COLS), fg, bg)]);
}

/** A loading / placeholder row while data is fetching. */
export function loadingRow(label: string, color: TeletextColor): RowSegment[] {
  const msg = `  ${label} LOADING\u2026`;
  return [seg(pad(msg, COLS), color, 'black')];
}

/** Separator using block characters for style. */
export function separator(char = '\u2500', fg: TeletextColor = 'dim'): RowSegment[] {
  return [seg(char.repeat(COLS), fg, 'black')];
}
