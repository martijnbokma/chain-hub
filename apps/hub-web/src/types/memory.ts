export type MemoryNote = {
  relativePath: string;
  name: string;
  title: string;
  content: string;
  sizeBytes: number;
  updatedAt: string;
};

export type MemorySearchResult = {
  relativePath: string;
  name: string;
  title: string;
  excerpt: string;
  updatedAt: string;
};

export type MemoryFile = {
  name: string;
  relativePath: string;
  extension: string;
  sizeBytes: number;
  updatedAt: string;
};

export type MemorySummary = {
  chainHome: string;
  memoryPath: string;
  totalFiles: number;
  totalBytes: number;
  directories: string[];
  extensions: Array<{
    extension: string;
    count: number;
  }>;
  recentFiles: MemoryFile[];
  status: "empty" | "active";
};