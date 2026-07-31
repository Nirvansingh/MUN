'use client';

import React from 'react';
import { MunFile } from '@/lib/types';
import CountryTemplate from './CountryTemplate';
import DocumentTemplate from './DocumentTemplate';

export default function FileViewer({ file }: { file: MunFile }) {
  if (file.isCountry) {
    return <CountryTemplate file={file} />;
  }

  return <DocumentTemplate file={file} />;
}
