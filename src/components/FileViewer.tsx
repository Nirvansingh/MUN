'use client';

import React from 'react';
import { MunFile } from '@/lib/types';
import CountryTemplate from './CountryTemplate';

export default function FileViewer({ file }: { file: MunFile }) {
  if (file.isCountry) {
    return <CountryTemplate file={file} />;
  }

  return (
    <pre className="file-viewer">
      {file.content}
    </pre>
  );
}
