import { describe, expect, it } from 'vitest';

import { fileToBase64, readBrowsedSkillFolder } from './skill-folder-upload';

/** jsdom's File has no arrayBuffer(); give the test file one backed by its text content. */
function textFile(content: string, name: string): File {
  const file = new File([content], name);
  const bytes = new TextEncoder().encode(content);
  Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer });
  return file;
}

function folderFile(relativePath: string, content: string): File {
  const file = textFile(content, relativePath.split('/').at(-1) ?? relativePath);
  Object.defineProperty(file, 'webkitRelativePath', { value: relativePath });
  return file;
}

function asFileList(files: File[]): FileList {
  return files as unknown as FileList;
}

describe('fileToBase64', () => {
  it('encodes file bytes', async () => {
    expect(await fileToBase64(textFile('hi', 'a.txt'))).toBe(btoa('hi'));
  });
});

describe('readBrowsedSkillFolder', () => {
  it('strips the picked folder name from every path', async () => {
    const result = await readBrowsedSkillFolder(
      asFileList([folderFile('demo/SKILL.md', '# Demo'), folderFile('demo/scripts/run.sh', 'echo')])
    );

    expect(result.label).toBe('demo');
    expect(result.files.map((file) => file.path)).toEqual(['SKILL.md', 'scripts/run.sh']);
  });

  it('rejects a folder without SKILL.md', async () => {
    await expect(readBrowsedSkillFolder(asFileList([folderFile('demo/notes.md', 'x')]))).rejects.toThrow(
      'Selected folder must contain SKILL.md'
    );
  });

  it('rejects an empty selection', async () => {
    await expect(readBrowsedSkillFolder(asFileList([]))).rejects.toThrow('No files selected');
  });
});
