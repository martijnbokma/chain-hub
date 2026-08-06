import path from "node:path";
import { promises as fs } from "node:fs";

import type {
  CreateMemoryNoteInput,
  MemoryFile,
  MemoryNote,
  MemorySearchResult,
  MemorySummary
} from "@chain-hub/contracts";

import { initializeHub, resolveChainHome } from "./core.js";
import { ensureDir, makeExcerpt, pathExists } from "./shared.js";

async function collectMemoryFiles(
  chainHome: string,
  currentDir: string,
  directories: Set<string>,
  files: MemoryFile[]
): Promise<void> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    const relativePath = path.relative(chainHome, absolutePath);

    if (entry.isDirectory()) {
      directories.add(relativePath);
      await collectMemoryFiles(chainHome, absolutePath, directories, files);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const stats = await fs.stat(absolutePath);
    const extension = path.extname(entry.name).replace(/^\./, "") || "none";

    files.push({
      name: entry.name,
      relativePath,
      extension,
      sizeBytes: stats.size,
      updatedAt: stats.mtime.toISOString()
    });
  }
}

export async function getMemorySummary(chainHomeInput?: string): Promise<MemorySummary> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const memoryPath = path.join(chainHome, "memory");
  const directories = new Set<string>(["memory"]);
  const files: MemoryFile[] = [];

  if (await pathExists(memoryPath)) {
    await collectMemoryFiles(chainHome, memoryPath, directories, files);
  }

  const sortedFiles = [...files].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const totalBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);
  const extensionMap = files.reduce<Map<string, number>>((accumulator, file) => {
    accumulator.set(file.extension, (accumulator.get(file.extension) ?? 0) + 1);
    return accumulator;
  }, new Map<string, number>());

  return {
    chainHome,
    memoryPath,
    totalFiles: files.length,
    totalBytes,
    directories: [...directories].sort((left, right) => left.localeCompare(right)),
    extensions: [...extensionMap.entries()]
      .map(([extension, count]) => ({ extension, count }))
      .sort((left, right) => right.count - left.count || left.extension.localeCompare(right.extension)),
    recentFiles: sortedFiles.slice(0, 8),
    status: files.length === 0 ? "empty" : "active"
  };
}

function noteNameToFilename(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractTitle(content: string, fallbackName: string): string {
  const firstLine = content.split("\n").find((line) => line.trim().length > 0) ?? "";
  const headingMatch = /^#{1,6}\s+(.+)$/.exec(firstLine.trim());

  return headingMatch ? headingMatch[1].trim() : fallbackName;
}

async function collectAllMemoryNotes(chainHome: string): Promise<MemoryNote[]> {
  const memoryPath = path.join(chainHome, "memory");
  const directories = new Set<string>();
  const files: MemoryFile[] = [];

  if (!(await pathExists(memoryPath))) {
    return [];
  }

  await collectMemoryFiles(chainHome, memoryPath, directories, files);

  const mdFiles = files.filter((file) => file.extension === "md");
  const notes: MemoryNote[] = [];

  for (const file of mdFiles) {
    const absolutePath = path.join(chainHome, file.relativePath);
    const content = await fs.readFile(absolutePath, "utf8").catch(() => "");
    notes.push({
      relativePath: file.relativePath,
      name: file.name.replace(/\.md$/, ""),
      title: extractTitle(content, file.name.replace(/\.md$/, "")),
      content,
      sizeBytes: file.sizeBytes,
      updatedAt: file.updatedAt
    });
  }

  return notes.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function listMemoryNotes(chainHomeInput?: string): Promise<MemoryNote[]> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);
  return collectAllMemoryNotes(chainHome);
}

export async function getMemoryNote(chainHomeInput: string | undefined, relativePath: string): Promise<MemoryNote> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const absolutePath = path.join(chainHome, relativePath);

  if (!(await pathExists(absolutePath))) {
    throw new Error(`Memory note not found: ${relativePath}`);
  }

  const content = await fs.readFile(absolutePath, "utf8");
  const stats = await fs.stat(absolutePath);
  const name = path.basename(relativePath, ".md");

  return {
    relativePath,
    name,
    title: extractTitle(content, name),
    content,
    sizeBytes: stats.size,
    updatedAt: stats.mtime.toISOString()
  };
}

export async function createMemoryNote(
  chainHomeInput: string | undefined,
  input: CreateMemoryNoteInput
): Promise<MemoryNote> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const safeName = noteNameToFilename(input.name);

  if (!safeName) {
    throw new Error("Note name cannot be empty");
  }

  const dir = input.subdirectory
    ? path.join(chainHome, "memory", noteNameToFilename(input.subdirectory))
    : path.join(chainHome, "memory");

  await ensureDir(dir);

  const filePath = path.join(dir, `${safeName}.md`);

  if (await pathExists(filePath)) {
    throw new Error(`Memory note already exists: ${path.relative(chainHome, filePath)}`);
  }

  const content = input.content || `# ${input.name}\n\n`;
  await fs.writeFile(filePath, content, "utf8");

  return getMemoryNote(chainHome, path.relative(chainHome, filePath));
}

export async function updateMemoryNote(
  chainHomeInput: string | undefined,
  relativePath: string,
  content: string
): Promise<MemoryNote> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const absolutePath = path.join(chainHome, relativePath);

  if (!(await pathExists(absolutePath))) {
    throw new Error(`Memory note not found: ${relativePath}`);
  }

  await fs.writeFile(absolutePath, content, "utf8");

  return getMemoryNote(chainHome, relativePath);
}

export async function deleteMemoryNote(chainHomeInput: string | undefined, relativePath: string): Promise<void> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const absolutePath = path.join(chainHome, relativePath);

  if (!(await pathExists(absolutePath))) {
    return;
  }

  await fs.unlink(absolutePath);
}

export async function searchMemoryNotes(chainHomeInput: string | undefined, query: string): Promise<MemorySearchResult[]> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  if (!query.trim()) {
    const notes = await collectAllMemoryNotes(chainHome);
    return notes.map((note) => ({
      relativePath: note.relativePath,
      name: note.name,
      title: note.title,
      excerpt: makeExcerpt(note.content),
      updatedAt: note.updatedAt
    }));
  }

  const lower = query.toLowerCase();
  const notes = await collectAllMemoryNotes(chainHome);

  return notes
    .filter((note) => note.name.toLowerCase().includes(lower) || note.title.toLowerCase().includes(lower) || note.content.toLowerCase().includes(lower))
    .map((note) => {
      const contentLower = note.content.toLowerCase();
      const idx = contentLower.indexOf(lower);
      let excerpt: string;

      if (idx !== -1) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(note.content.length, idx + lower.length + 80);
        const raw = note.content.slice(start, end).replace(/\n+/g, " ").trim();
        excerpt = (start > 0 ? "…" : "") + raw + (end < note.content.length ? "…" : "");
      } else {
        excerpt = makeExcerpt(note.content);
      }

      return {
        relativePath: note.relativePath,
        name: note.name,
        title: note.title,
        excerpt,
        updatedAt: note.updatedAt
      };
    });
}
