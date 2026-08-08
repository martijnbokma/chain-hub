import type { Hono } from "hono";

import {
  createMemoryNoteInputSchema,
  updateMemoryNoteInputSchema
} from "@chain-hub/contracts";
import {
  createHubMemoryNote,
  deleteHubMemoryNote,
  getHubMemory,
  getHubMemoryNote,
  listHubMemoryNotes,
  searchHubMemoryNotes,
  updateHubMemoryNote
} from "@chain-hub/domain";

import type { RouteOptions } from "./options.js";

export function registerMemoryRoutes(app: Hono, options: RouteOptions): void {
  app.get("/api/memory", async (context) => {
    const memory = await getHubMemory(options.chainHome);
    return context.json(memory);
  });

  app.get("/api/memory/notes", async (context) => {
    const notes = await listHubMemoryNotes(options.chainHome);
    return context.json(notes);
  });

  app.get("/api/memory/search", async (context) => {
    const query = context.req.query("q") ?? "";
    const results = await searchHubMemoryNotes(options.chainHome, query);
    return context.json(results);
  });

  app.post("/api/memory/notes", async (context) => {
    const payload = createMemoryNoteInputSchema.parse(await context.req.json());
    const note = await createHubMemoryNote(options.chainHome, payload);
    return context.json(note, 201);
  });

  app.get("/api/memory/note", async (context) => {
    const relativePath = context.req.query("path") ?? "";
    const note = await getHubMemoryNote(options.chainHome, relativePath);
    return context.json(note);
  });

  app.put("/api/memory/note", async (context) => {
    const relativePath = context.req.query("path") ?? "";
    const payload = updateMemoryNoteInputSchema.parse(await context.req.json());
    const note = await updateHubMemoryNote(options.chainHome, relativePath, payload.content);
    return context.json(note);
  });

  app.delete("/api/memory/note", async (context) => {
    const relativePath = context.req.query("path") ?? "";
    await deleteHubMemoryNote(options.chainHome, relativePath);
    return context.json({ ok: true });
  });
}
