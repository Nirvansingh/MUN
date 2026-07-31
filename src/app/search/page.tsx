import type { Metadata } from 'next';
import { getAllFiles } from '@/lib/files';
import SearchClient from './SearchClient';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search across all MUN research files and content.',
};

export default function SearchPage() {
  const files = getAllFiles();
  return <SearchClient initialFiles={files} fileCount={files.length} />;
}
