import { NextResponse } from 'next/server';
import { fetchAllFeeds } from '@/lib/rssUtils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await fetchAllFeeds();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
