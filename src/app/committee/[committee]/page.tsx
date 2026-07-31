import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAllFiles } from '@/lib/files';
import CommitteeClient from './CommitteeClient';

export async function generateMetadata({ params }: { params: Promise<{ committee: string }> }): Promise<Metadata> {
  const { committee } = await params;
  const committeeName = committee.toUpperCase();
  if (!['UNHRC', 'UNSC'].includes(committeeName)) {
    return { title: 'Page Not Found' };
  }
  return {
    title: `${committeeName} Committee`,
    description: `Research materials, country guides, and resources for the ${committeeName} committee at MUN Research Hub.`,
  };
}

export async function generateStaticParams() {
  const committees = ['UNHRC', 'UNSC'];
  return committees.map(c => ({ committee: c.toLowerCase() }));
}

export default async function CommitteePage({ params }: { params: Promise<{ committee: string }> }) {
  const { committee } = await params;
  const files = getAllFiles();
  const committeeName = committee.toUpperCase();
  const validCommittees = ['UNHRC', 'UNSC'];

  if (!validCommittees.includes(committeeName)) {
    notFound();
  }

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
