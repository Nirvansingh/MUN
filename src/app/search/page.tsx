import { getAllFiles } from '@/lib/files';
import SearchClient from './SearchClient';

export default function SearchPage() {
  const files = getAllFiles();
  return <SearchClient initialFiles={files} fileCount={files.length} />;
}
