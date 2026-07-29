import { getAllFiles } from '@/lib/files';
import HomeClient from './HomeClient';

export default function HomePage() {
  const files = getAllFiles();
  return <HomeClient initialFiles={files} />;
}
