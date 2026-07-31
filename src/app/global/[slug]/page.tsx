import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAllFiles } from '@/lib/files';
import GlobalClient from './GlobalClient';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const files = getAllFiles();
  const slugName = slug.replace(/-/g, ' ');
  const exists = files.some(f =>
    f.committee === 'Global Reference' &&
    f.name.replace(/\.txt$/i, '').toLowerCase() === slugName
  );
  if (!exists) {
    return { title: 'Page Not Found' };
  }
  const title = slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
  return {
    title: `${title} — Global Reference`,
    description: `Global reference research profile for ${title}.`,
  };
}

export async function generateStaticParams() {
  const files = getAllFiles();
  const globalFiles = files.filter(f => f.committee === 'Global Reference');
  return globalFiles.map(f => ({ slug: f.name.replace(/\.txt$/i, '').toLowerCase().replace(/\s+/g, '-') }));
}

export default async function GlobalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const files = getAllFiles();
  const globalFiles = files.filter(f => f.committee === 'Global Reference');

  const slugName = slug.replace(/-/g, ' ');
  const file = globalFiles.find(f =>
    f.name.replace(/\.txt$/i, '').toLowerCase() === slugName
  );

  if (!file) {
    notFound();
  }

  return <GlobalClient initialFiles={files} fileData={{
    path: file.path,
    name: file.name,
    displayName: file.displayName,
    content: file.content,
    committee: file.committee,
    category: file.category,
    isCountry: file.isCountry,
    parts: file.parts,
  }} />;
}
