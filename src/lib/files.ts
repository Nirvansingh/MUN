import fs from 'fs';
import path from 'path';
import { MunFile } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

export function getAllFiles(): MunFile[] {
  const files: MunFile[] = [];

  function walkDir(dirPath: string, committee: string) {
    if (!fs.existsSync(dirPath)) return;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relPath = path.relative(DATA_DIR, fullPath);

      if (entry.isDirectory()) {
        walkDir(fullPath, committee);
      } else if (entry.isFile() && (entry.name.endsWith('.txt') || entry.name.endsWith('.md'))) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const parts = relPath.split(path.sep);

        const committeeName = parts.length > 1 ? 
          (parts[0] === 'unhrc' ? 'UNHRC' : parts[0] === 'unsc' ? 'UNSC' : parts[0] === 'global' ? 'Global Reference' : parts[0] === 'basics' ? 'General Guide' : parts[0]) 
          : 'General Guide';

        const isCountry =
          (parts.length >= 3 && parts[1] === 'Countries') ||
          (parts[0] === 'global' && parts.length === 2);
        const category = isCountry ? 'Country' :
          parts[1] === 'Speeches' ? 'Speech' :
          parts[1] === 'Resolutions' ? 'Resolution' :
          parts[1] === 'Resources' ? 'Resource' :
          parts[1] === 'Countries' ? 'Country' :
          parts[0] === 'basics' ? 'Guide' :
          /handbook|agenda/i.test(parts[1]) ? 'Agenda' :
          parts.length >= 2 ? parts[1] : 'Guide';

        files.push({
          path: relPath.replace(/\\/g, '/'),
          name: entry.name,
          displayName: entry.name.replace(/\.txt$/i, '').replace(/\.md$/i, ''),
          committee: committeeName,
          category,
          content,
          isCountry,
          parts: parts.map(p => p.replace(/\\/g, '/')),
        });
      }
    }
  }

  walkDir(DATA_DIR, '');
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}
