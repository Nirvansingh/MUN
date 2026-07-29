import { MunFile } from './types';

export function getFileByPath(files: MunFile[], filePath: string): MunFile | undefined {
  return files.find(f => f.path === filePath);
}

export function getFilesByCommittee(files: MunFile[], committee: string): MunFile[] {
  if (committee === 'all') return files;
  return files.filter(f => f.committee === committee || f.committee === 'General Guide');
}

export function getCountryFiles(files: MunFile[], countryName: string, committee: string): MunFile[] {
  const cName = countryName.toLowerCase();
  return files.filter(f => {
    const fName = f.displayName.toLowerCase();
    return f.isCountry && fName.includes(cName) && f.committee === committee;
  });
}

export function getFileMap(files: MunFile[]): Map<string, MunFile> {
  const map = new Map<string, MunFile>();
  files.forEach(f => map.set(f.path, f));
  return map;
}
