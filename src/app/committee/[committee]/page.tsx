import { notFound } from 'next/navigation';
import { getAllFiles } from '@/lib/files';
import CommitteeClient from './CommitteeClient';

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
