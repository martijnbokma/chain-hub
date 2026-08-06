import { z } from "zod";

export const memoryFileSchema = z.object({
  name: z.string(),
  relativePath: z.string(),
  extension: z.string(),
  sizeBytes: z.number(),
  updatedAt: z.string()
});

export const memorySummarySchema = z.object({
  chainHome: z.string(),
  memoryPath: z.string(),
  totalFiles: z.number(),
  totalBytes: z.number(),
  directories: z.array(z.string()),
  extensions: z.array(
    z.object({
      extension: z.string(),
      count: z.number()
    })
  ),
  recentFiles: z.array(memoryFileSchema),
  status: z.enum(["empty", "active"])
});

export const memoryNoteSchema = z.object({
  relativePath: z.string(),
  name: z.string(),
  title: z.string(),
  content: z.string(),
  sizeBytes: z.number(),
  updatedAt: z.string()
});

export const createMemoryNoteInputSchema = z.object({
  name: z.string().min(1),
  subdirectory: z.string().optional(),
  content: z.string()
});

export const updateMemoryNoteInputSchema = z.object({
  content: z.string()
});

export const memorySearchResultSchema = z.object({
  relativePath: z.string(),
  name: z.string(),
  title: z.string(),
  excerpt: z.string(),
  updatedAt: z.string()
});

export type MemoryFile = z.infer<typeof memoryFileSchema>;
export type MemorySummary = z.infer<typeof memorySummarySchema>;
export type MemoryNote = z.infer<typeof memoryNoteSchema>;
export type CreateMemoryNoteInput = z.infer<typeof createMemoryNoteInputSchema>;
export type UpdateMemoryNoteInput = z.infer<typeof updateMemoryNoteInputSchema>;
export type MemorySearchResult = z.infer<typeof memorySearchResultSchema>;
