import { fetchAllFeeds } from '@/lib/rssUtils';
import TeletextApp from '@/components/TeletextApp';

// Revalidate server-side data every 15 minutes
export const revalidate = 900;

export default async function Home() {
  const initialData = await fetchAllFeeds();
  return <TeletextApp initialData={initialData} />;
}
