import Parser from 'rss-parser';
import https from 'https';
import { FeedItem, SectionData, AllFeedsData } from './types';
import { SECTIONS, SectionConfig } from './feedConfig';

// Allow self-signed / revocation-check failures for public RSS endpoints
// (Windows Schannel is strict about OCSP; many academic/news hosts don't support it)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const parser = new Parser({
  timeout: 9000,
  headers: {
    'User-Agent': 'ZEEFAX/1.0 (news aggregator; headline-only)',
    'Accept': 'application/rss+xml, application/atom+xml, text/xml, application/xml',
  },
  requestOptions: { agent: httpsAgent },
});

// ─── Simple in-process cache ──────────────────────────────────────────────────

interface CacheEntry {
  data: SectionData;
  expiresAt: number;
}

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ─── Single feed fetch ────────────────────────────────────────────────────────

async function fetchOneFeed(
  url: string,
  sourceName: string,
  sectionKey: string,
): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items ?? []).slice(0, 20).map(item => ({
      title:      cleanTitle(item.title ?? 'Untitled'),
      link:       item.link ?? item.guid ?? '',
      pubDate:    item.pubDate,
      isoDate:    item.isoDate,
      source:     sourceName,
      sectionKey,
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[rss] failed ${url}: ${msg}`);
    return [];
  }
}

// ─── Section fetch with cache ─────────────────────────────────────────────────

async function fetchSection(sec: SectionConfig): Promise<SectionData> {
  const cached = CACHE.get(sec.key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const results = await Promise.allSettled(
    sec.feeds.map(f => fetchOneFeed(f.url, f.name, sec.key)),
  );

  const allItems: FeedItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') allItems.push(...r.value);
  }

  // Deduplicate by link, sort newest-first
  const seen = new Set<string>();
  const unique = allItems.filter(item => {
    if (!item.link || seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  unique.sort((a, b) => {
    const ta = a.isoDate ? new Date(a.isoDate).getTime() : 0;
    const tb = b.isoDate ? new Date(b.isoDate).getTime() : 0;
    return tb - ta;
  });

  const data: SectionData = {
    key: sec.key,
    items: unique.slice(0, 30),
    fetchedAt: new Date().toISOString(),
  };

  CACHE.set(sec.key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

// ─── Fetch all sections ───────────────────────────────────────────────────────

export async function fetchAllFeeds(): Promise<AllFeedsData> {
  const results = await Promise.allSettled(
    SECTIONS.map(sec => fetchSection(sec)),
  );

  const out: AllFeedsData = {};
  for (let i = 0; i < SECTIONS.length; i++) {
    const sec = SECTIONS[i];
    const r = results[i];
    if (r.status === 'fulfilled') {
      out[sec.key] = r.value;
    } else {
      out[sec.key] = {
        key: sec.key,
        items: [],
        fetchedAt: new Date().toISOString(),
        error: String(r.reason),
      };
    }
  }

  return out;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanTitle(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, '')        // strip HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatTime(item: FeedItem): string {
  const raw = item.isoDate || item.pubDate;
  if (!raw) return '??:??';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '??:??';
    const now = new Date();
    const diffH = (now.getTime() - d.getTime()) / 3_600_000;
    if (diffH < 24) {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    if (diffH < 24 * 7) {
      return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase();
    }
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
  } catch {
    return '??:??';
  }
}

export function isNewToday(item: FeedItem): boolean {
  const raw = item.isoDate || item.pubDate;
  if (!raw) return false;
  try {
    const d = new Date(raw);
    const now = new Date();
    return (now.getTime() - d.getTime()) < 24 * 3_600_000;
  } catch {
    return false;
  }
}
