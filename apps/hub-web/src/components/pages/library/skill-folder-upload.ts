import type { InstallSkillBundleInput } from '@/types';

// Turns a folder picked in the browser (webkitdirectory) into an install-bundle payload.

export type BrowsedSkillFolder = {
  label: string;
  files: InstallSkillBundleInput['files'];
};

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export async function readBrowsedSkillFolder(fileList: FileList): Promise<BrowsedSkillFolder> {
  const files = Array.from(fileList);
  if (files.length === 0) {
    throw new Error('No files selected');
  }

  const relativePaths = files.map((file) => file.webkitRelativePath || file.name);
  const rootName = relativePaths[0]?.split('/')[0] || 'skill';
  const payloadFiles: InstallSkillBundleInput['files'] = [];

  for (const file of files) {
    const relative = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
    const withoutRoot = relative.startsWith(`${rootName}/`) ? relative.slice(rootName.length + 1) : relative;
    if (!withoutRoot || withoutRoot.endsWith('/')) {
      continue;
    }
    payloadFiles.push({
      path: withoutRoot,
      contentBase64: await fileToBase64(file)
    });
  }

  if (!payloadFiles.some((file) => file.path === 'SKILL.md' || file.path.endsWith('/SKILL.md'))) {
    throw new Error('Selected folder must contain SKILL.md');
  }

  return { label: rootName, files: payloadFiles };
}
