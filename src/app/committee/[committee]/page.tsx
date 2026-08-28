import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAllFiles } from '@/lib/files';
import CommitteeClient from './CommitteeClient';

function resolveCommitteeName(slug: string): string | null {
  const s = slug.toLowerCase();
  if (s === 'unhrc') return 'UNHRC';
  if (s === 'unsc') return 'UNSC';
  if (s === 'unwomen' || s === 'un-women') return 'UN Women';
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ committee: string }> }): Promise<Metadata> {
  const { committee } = await params;
  const committeeName = resolveCommitteeName(committee);
  if (!committeeName) {
    return { title: 'Page Not Found' };
  }
  return {
    title: `${committeeName} Committee`,
    description: `Research materials, country guides, and resources for the ${committeeName} committee at MUN Research Hub.`,
  };
}

export async function generateStaticParams() {
  return [
    { committee: 'unhrc' },
    { committee: 'unsc' },
    { committee: 'unwomen' },
    { committee: 'un-women' },
  ];
}

export default async function CommitteePage({ params }: { params: Promise<{ committee: string }> }) {
  const { committee } = await params;
  const committeeName = resolveCommitteeName(committee);

  if (!committeeName) {
    notFound();
  }

  const files = getAllFiles();
  const committeeFiles = files.filter(f => f.committee === committeeName);
  const countries = committeeFiles.filter(f => f.isCountry);
  const otherFiles = committeeFiles.filter(f => !f.isCountry);

  return (
    <CommitteeClient
      committeeName={committeeName}
      initialFiles={files}
      countries={countries.map(f => ({
        path: f.path,
        displayName: f.displayName,
        content: f.content,
      }))}
      otherFiles={otherFiles.map(f => ({
        path: f.path,
        displayName: f.displayName,
        category: f.category,
      }))}
    />
  );
}
