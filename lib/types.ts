// ─── Core data types ─────────────────────────────────────────────────────────

export interface FeedItem {
  title: string;
  link: string;
  pubDate?: string;
  isoDate?: string;
  source: string;
  sectionKey: string;
}

export interface SectionData {
  key: string;
  items: FeedItem[];
  fetchedAt: string; // ISO string
  error?: string;
}

export interface AllFeedsData {
  [sectionKey: string]: SectionData;
}

// ─── Teletext rendering types ─────────────────────────────────────────────────

export type TeletextColor =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'gray'
  | 'dim'
  | 'orange'
  | 'pink';

export interface RowSegment {
  text: string;
  fg?: TeletextColor;
  bg?: TeletextColor;
  bold?: boolean;
  blink?: boolean;
  link?: string; // if set, this segment is clickable
}

export type TeletextRow = RowSegment[];

// ─── Page navigation ──────────────────────────────────────────────────────────

export interface PageDef {
  pageNum: number;
  label: string;
  sectionKey?: string; // which section's data to use
  subPage?: number;    // 0=headlines, 1=new today, 2=signals, 3=sources
}
