'use client';

import React, {
  useState, useEffect, useCallback, useRef, KeyboardEvent,
} from 'react';
import TeletextScreen, { ScreenRow } from './TeletextScreen';
import {
  buildHomePage,
  buildSectionTopPage,
  buildSectionNewPage,
  buildSectionSignalsPage,
  buildSectionSourcesPage,
  buildAboutPage,
  buildNotFoundPage,
} from './pages/buildRows';
import { SECTIONS, getSectionByPage, PAGE_ORDER, COLOR_CSS } from '@/lib/feedConfig';
import { AllFeedsData } from '@/lib/types';
import { pad, padLeft, centre, seg, COLS } from '@/lib/rowBuilder';
import { RowSegment, TeletextColor } from '@/lib/types';

// ─── Page builder ─────────────────────────────────────────────────────────────

function buildPage(pageNum: number, data: AllFeedsData, now: Date): ScreenRow[] {
  if (pageNum === 100) return buildHomePage(data, now);
  if (pageNum === 199) return buildAboutPage(now);

  const sec = getSectionByPage(pageNum);
  if (!sec) return buildNotFoundPage(pageNum, now);

  const sub = pageNum - sec.page;
  if (sub === 0) return buildSectionTopPage(sec, data, now);
  if (sub === 1) return buildSectionNewPage(sec, data, now);
  if (sub === 2) return buildSectionSignalsPage(sec, data, now);
  if (sub === 3) return buildSectionSourcesPage(sec, data, now);

  return buildNotFoundPage(pageNum, now);
}

// ─── Navigation helpers ───────────────────────────────────────────────────────

function getAdjacentPages(pageNum: number): { prev: number | null; next: number | null } {
  const idx = PAGE_ORDER.indexOf(pageNum);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? PAGE_ORDER[idx - 1] : null,
    next: idx < PAGE_ORDER.length - 1 ? PAGE_ORDER[idx + 1] : null,
  };
}

// ─── Footer element ───────────────────────────────────────────────────────────

interface FooterProps {
  pageInput: string;
  prevPage: number | null;
  nextPage: number | null;
  isRefreshing: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPageInputChange: (val: string) => void;
  onPageInputSubmit: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

function Footer({
  pageInput, prevPage, nextPage, isRefreshing,
  onPrev, onNext, onPageInputChange, onPageInputSubmit,
  onKeyDown, inputRef,
}: FooterProps) {
  const prevStr  = prevPage ? `\u25c4${String(prevPage)}` : '     ';
  const nextStr  = nextPage ? `${String(nextPage)}\u25ba` : '     ';
  const leftW    = 6;
  const rightW   = 6;
  const midW     = COLS - leftW - rightW; // 28

  // "PAGE ___" with actual cursor input, centred in midW
  const prefixStr  = 'P.';
  const refreshStr = isRefreshing ? ' \u25cf' : '  ';

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100%',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      lineHeight: '1.25',
      background: '#000040',
      color: '#fff',
      whiteSpace: 'pre',
    }}>
      {/* PREV */}
      <span
        onClick={prevPage ? onPrev : undefined}
        style={{
          display: 'inline-block',
          width: `${leftW}ch`,
          background: prevPage ? '#004488' : '#000040',
          color: prevPage ? '#00FFFF' : '#333',
          cursor: prevPage ? 'pointer' : 'default',
          textAlign: 'center',
          padding: '0',
          userSelect: 'none',
        }}
        role={prevPage ? 'button' : undefined}
        tabIndex={prevPage ? 0 : undefined}
        onKeyDown={prevPage ? (e) => e.key === 'Enter' && onPrev() : undefined}
      >
        {pad(prevStr, leftW)}
      </span>

      {/* Centre: PAGE input */}
      <span style={{
        display: 'inline-flex',
        width: `${midW}ch`,
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000040',
        color: '#FFEE00',
      }}>
        <span style={{ color: '#888888' }}>{'PAGE '}</span>
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={3}
          value={pageInput}
          onChange={e => onPageInputChange(e.target.value.replace(/\D/g, '').slice(0, 3))}
          onKeyDown={onKeyDown}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#00FFFF',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
            letterSpacing: '0',
            width: '3ch',
            caretColor: '#00FFFF',
          }}
          placeholder="___"
          aria-label="Page number"
        />
        <span style={{ color: '#00FFFF' }}>{refreshStr}</span>
      </span>

      {/* NEXT */}
      <span
        onClick={nextPage ? onNext : undefined}
        style={{
          display: 'inline-block',
          width: `${rightW}ch`,
          background: nextPage ? '#004488' : '#000040',
          color: nextPage ? '#00FFFF' : '#333',
          cursor: nextPage ? 'pointer' : 'default',
          textAlign: 'center',
          userSelect: 'none',
        }}
        role={nextPage ? 'button' : undefined}
        tabIndex={nextPage ? 0 : undefined}
        onKeyDown={nextPage ? (e) => e.key === 'Enter' && onNext() : undefined}
      >
        {padLeft(nextStr, rightW)}
      </span>
    </div>
  );
}

// ─── Scale hook ───────────────────────────────────────────────────────────────

function useScale(screenRef: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function update() {
      const el = screenRef.current;
      if (!el) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const sw = el.offsetWidth;
      const sh = el.offsetHeight;
      if (!sw || !sh) return;
      const s = Math.min((vw - 8) / sw, (vh - 8) / sh);
      setScale(Math.min(s, 2)); // cap at 2× for very large screens
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [screenRef]);

  return scale;
}

// ─── Clock ────────────────────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ─── Main App ─────────────────────────────────────────────────────────────────

interface TeletextAppProps {
  initialData: AllFeedsData;
}

export default function TeletextApp({ initialData }: TeletextAppProps) {
  const [data,         setData]         = useState<AllFeedsData>(initialData);
  const [currentPage,  setCurrentPage]  = useState(100);
  const [pageInput,    setPageInput]    = useState('');
  const [flashKey,     setFlashKey]     = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const screenRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const scale      = useScale(screenRef);
  const now        = useClock();

  // ── Navigate to a page number ─────────────────────────────────────────────
  const navigateTo = useCallback((page: number) => {
    setCurrentPage(page);
    setPageInput('');
    setFlashKey(k => k + 1);
  }, []);

  // ── Refresh data from API ─────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/feeds');
      if (res.ok) {
        const fresh: AllFeedsData = await res.json();
        setData(fresh);
        setFlashKey(k => k + 1);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // ── Next / Prev ───────────────────────────────────────────────────────────
  const { prev, next } = getAdjacentPages(currentPage);

  const goNext = useCallback(() => { if (next) navigateTo(next); }, [next, navigateTo]);
  const goPrev = useCallback(() => { if (prev) navigateTo(prev); }, [prev, navigateTo]);

  // ── Page input handling ───────────────────────────────────────────────────
  const handlePageInput = useCallback((val: string) => {
    setPageInput(val);
    if (val.length === 3) {
      navigateTo(parseInt(val, 10));
    }
  }, [navigateTo]);

  const handlePageInputSubmit = useCallback(() => {
    if (pageInput.length > 0) navigateTo(parseInt(pageInput, 10));
  }, [pageInput, navigateTo]);

  // ── Global keyboard handler ───────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (!isInput) { goNext(); return; }
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (!isInput) { goPrev(); return; }
      }
      if (e.key === 'r' || e.key === 'R') {
        if (!isInput) { refresh(); return; }
      }
      if (e.key === 'h' || e.key === 'H') {
        if (!isInput) { navigateTo(100); return; }
      }
      // digit → focus input
      if (/^[0-9]$/.test(e.key) && !isInput) {
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, refresh, navigateTo]);

  // ── Input keydown (inside PAGE input) ────────────────────────────────────
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { handlePageInputSubmit(); return; }
    if (e.key === 'Escape') { setPageInput(''); inputRef.current?.blur(); return; }
    if (e.key === 'ArrowRight') { goNext(); return; }
    if (e.key === 'ArrowLeft')  { goPrev(); return; }
  }

  // ── Open article link ─────────────────────────────────────────────────────
  const handleLinkClick = useCallback((url: string) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  // ── Build page content ────────────────────────────────────────────────────
  const rows = buildPage(currentPage, data, now);

  return (
    <div className="zeefax-wrapper" onClick={() => inputRef.current?.focus()}>
      <div
        className="zeefax-scaler"
        style={{ transform: `scale(${scale})` }}
      >
        <div ref={screenRef} style={{ display: 'inline-block' }}>
          <TeletextScreen
            rows={rows}
            onLinkClick={handleLinkClick}
            flashKey={flashKey}
            footerEl={
              <Footer
                pageInput={pageInput}
                prevPage={prev}
                nextPage={next}
                isRefreshing={isRefreshing}
                onPrev={goPrev}
                onNext={goNext}
                onPageInputChange={handlePageInput}
                onPageInputSubmit={handlePageInputSubmit}
                onKeyDown={handleInputKeyDown}
                inputRef={inputRef}
              />
            }
          />
        </div>
      </div>

      {/* Keyboard shortcuts overlay (desktop hint, invisible offscreen) */}
      <div style={{
        position: 'fixed', bottom: 4, left: 0, right: 0,
        textAlign: 'center', fontSize: 10,
        color: '#333', fontFamily: 'monospace',
        pointerEvents: 'none', userSelect: 'none',
      }}>
        ◄► navigate  |  type 3 digits to jump  |  R refresh  |  H home
      </div>
    </div>
  );
}
