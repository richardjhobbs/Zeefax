'use client';

import React, { useEffect, useRef } from 'react';
import { RowSegment, TeletextColor } from '@/lib/types';
import { COLOR_CSS } from '@/lib/feedConfig';

// ─── Color resolver ───────────────────────────────────────────────────────────

// We need to handle the 'footer' pseudo-color used in rowBuilder
const EXTRA_COLORS: Record<string, string> = {
  footer: '#000040',
  dim:    '#333333',
};

function resolveColor(c?: TeletextColor): string {
  if (!c) return 'transparent';
  return COLOR_CSS[c] ?? EXTRA_COLORS[c] ?? 'transparent';
}

// ─── Single span ──────────────────────────────────────────────────────────────

interface SpanProps {
  seg: RowSegment;
  onLinkClick?: (link: string) => void;
  extraClass?: string;
}

function TeletextSpan({ seg, onLinkClick, extraClass }: SpanProps) {
  const style: React.CSSProperties = {
    color:           resolveColor(seg.fg),
    backgroundColor: resolveColor(seg.bg),
  };
  if (seg.bold) style.fontWeight = 'bold';

  const cls = [
    extraClass,
    seg.link ? 'open-tag' : '',
  ].filter(Boolean).join(' ');

  if (seg.link && onLinkClick) {
    return (
      <span
        className={cls}
        style={style}
        onClick={(e) => { e.stopPropagation(); onLinkClick(seg.link!); }}
        title="Open article"
        role="link"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onLinkClick(seg.link!)}
      >
        {seg.text}
      </span>
    );
  }

  return <span className={cls} style={style}>{seg.text}</span>;
}

// ─── Single row ───────────────────────────────────────────────────────────────

interface RowProps {
  segments: RowSegment[];
  onLinkClick?: (link: string) => void;
  /** If provided, clicking the row opens this URL */
  rowLink?: string;
  className?: string;
}

export function TeletextRow({ segments, onLinkClick, rowLink, className }: RowProps) {
  const handleRowClick = rowLink && onLinkClick
    ? () => onLinkClick(rowLink)
    : undefined;

  return (
    <div
      className={['tt-row', className, rowLink ? 'tt-row-link' : ''].filter(Boolean).join(' ')}
      onClick={handleRowClick}
      role={rowLink ? 'link' : undefined}
      tabIndex={rowLink ? 0 : undefined}
      onKeyDown={rowLink && onLinkClick ? (e) => e.key === 'Enter' && onLinkClick(rowLink) : undefined}
      style={{ cursor: rowLink ? 'pointer' : undefined }}
    >
      {segments.map((s, i) => (
        <TeletextSpan key={i} seg={s} onLinkClick={onLinkClick} />
      ))}
    </div>
  );
}

// ─── The full 40×25 screen ────────────────────────────────────────────────────

export interface ScreenRow {
  segments:  RowSegment[];
  rowLink?:  string;   // whole row is clickable → opens link
  className?: string;
}

interface TeletextScreenProps {
  rows: ScreenRow[];
  onLinkClick: (url: string) => void;
  flashKey?: string | number; // change to trigger flash animation
  /** The footer row (row 24) – rendered separately so it can contain the PAGE input */
  footerEl?: React.ReactNode;
}

export default function TeletextScreen({
  rows,
  onLinkClick,
  flashKey,
  footerEl,
}: TeletextScreenProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Trigger page-flash animation on page change
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.classList.remove('page-enter');
    // Force reflow
    void el.offsetWidth;
    el.classList.add('page-enter');
  }, [flashKey]);

  // Rows 0–23 = content (header is row 0, rows 1–23 = body)
  const contentRows = rows.slice(0, 24);

  return (
    <div className="tt-screen">
      <div className="tt-content" ref={contentRef}>
        {contentRows.map((row, i) => (
          <TeletextRow
            key={i}
            segments={row.segments}
            onLinkClick={onLinkClick}
            rowLink={row.rowLink}
            className={row.className}
          />
        ))}
        {/* Fill remaining rows if fewer than 24 provided */}
        {contentRows.length < 24 && Array.from({ length: 24 - contentRows.length }).map((_, i) => (
          <div key={`fill-${i}`} className="tt-row">
            <span style={{ color: 'transparent', background: '#000' }}>{''.padEnd(40)}</span>
          </div>
        ))}
      </div>
      {/* Row 24: footer */}
      <div className="tt-row" style={{ background: '#000040', flexShrink: 0 }}>
        {footerEl}
      </div>
    </div>
  );
}
