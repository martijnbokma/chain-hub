import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Trash2, FileText, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Eyebrow } from '@/components/common/Eyebrow';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { memoryApi } from '@/lib/api';
import type { MemoryNote } from '@/types';

export function MemoryPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftSubdir, setDraftSubdir] = useState('');
  const [draftContent, setDraftContent] = useState('');

  const isSearching = searchQuery.trim().length > 0;

  const notesList = useQuery({
    queryKey: ['memory-notes'],
    queryFn: () => memoryApi.getNotes()
  });

  const searchResults = useQuery({
    queryKey: ['memory-search', searchQuery],
    queryFn: () => memoryApi.searchNotes(searchQuery),
    enabled: isSearching
  });

  const selectedNote = useQuery({
    queryKey: ['memory-note', selectedPath],
    queryFn: async () => {
      if (!selectedPath) return null;
      return memoryApi.getNoteByPath(selectedPath);
    },
    enabled: selectedPath !== null
  });

  useEffect(() => {
    if (selectedNote.data) {
      setEditorContent(selectedNote.data.content);
    }
  }, [selectedNote.data]);

  const saveNote = useMutation({
    mutationFn: async () => {
      if (!selectedPath) throw new Error('No note selected');
      const response = await memoryApi.updateNote(selectedPath, { content: editorContent });
      if (!response.ok) throw new Error('Failed to save note');
      return response.json() as Promise<MemoryNote>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['memory-notes'] });
      void queryClient.invalidateQueries({ queryKey: ['memory-note', selectedPath] });
      void queryClient.invalidateQueries({ queryKey: ['memory-search'] });
      toast.success('Note saved');
    },
    onError: () => toast.error('Unable to save note')
  });

  const createNote = useMutation({
    mutationFn: async () => {
      const response = await memoryApi.createNote({
        name: draftName,
        subdirectory: draftSubdir || undefined,
        content: draftContent
      });
      if (!response.ok) throw new Error('Failed to create note');
      return response.json() as Promise<MemoryNote>;
    },
    onSuccess: (note) => {
      void queryClient.invalidateQueries({ queryKey: ['memory-notes'] });
      void queryClient.invalidateQueries({ queryKey: ['memory-search'] });
      setCreateOpen(false);
      setDraftName('');
      setDraftSubdir('');
      setDraftContent('');
      setSelectedPath(note.relativePath);
      toast.success('Note created');
    },
    onError: () => toast.error('Unable to create note')
  });

  const deleteNote = useMutation({
    mutationFn: async () => {
      if (!selectedPath) throw new Error('No note selected');
      const response = await memoryApi.deleteNote(selectedPath);
      if (!response.ok) throw new Error('Failed to delete note');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['memory-notes'] });
      void queryClient.invalidateQueries({ queryKey: ['memory-search'] });
      setDeleteOpen(false);
      setSelectedPath(null);
      setEditorContent('');
      toast.success('Note deleted');
    },
    onError: () => toast.error('Unable to delete note')
  });

  const displayNotes: Array<{ relativePath: string; title: string; updatedAt: string; excerpt?: string }> = isSearching
    ? (searchResults.data ?? []).map((r) => ({ relativePath: r.relativePath, title: r.title, updatedAt: r.updatedAt, excerpt: r.excerpt }))
    : (notesList.data ?? []).map((n) => ({ relativePath: n.relativePath, title: n.title, updatedAt: n.updatedAt }));

  const isLoading = isSearching ? searchResults.isLoading : notesList.isLoading;

  if (notesList.isLoading && !isSearching) {
    return <PageSkeleton variant="workspace" />;
  }

  return (
    <section className="grid gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <Eyebrow>Memory</Eyebrow>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Notes</h2>
          <p className="max-w-2xl text-sm leading-5 text-muted-foreground">
            Keep local markdown context close to the hub.
          </p>
        </div>
        <Button className="w-fit shrink-0" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New note
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
        <div className={cn('grid gap-3', selectedPath && 'hidden lg:grid')}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search notes"
              className="pl-9"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes…"
              value={searchQuery}
            />
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle>Index</CardTitle>
              <Badge>{displayNotes.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="grid gap-3 p-4" aria-busy="true" aria-label="Loading notes">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : displayNotes.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted-foreground">
                  {isSearching ? 'No results found.' : 'No notes yet. Create your first note.'}
                </p>
              ) : (
                <ul>
                  {displayNotes.map((note) => (
                    <li key={note.relativePath}>
                      <button
                        className={cn(
                          'w-full border-t border-border px-4 py-3 text-left transition-colors hover:bg-muted',
                          selectedPath === note.relativePath && 'bg-muted'
                        )}
                        onClick={() => setSelectedPath(note.relativePath)}
                        type="button"
                      >
                        <div className="flex items-start gap-2">
                          <FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{note.title}</p>
                            {note.excerpt ? (
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{note.excerpt}</p>
                            ) : null}
                            <p className="mt-1 text-xs text-muted-foreground">
                              {new Date(note.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className={cn(!selectedPath && 'hidden lg:block')}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {selectedPath ? (
                  <Button
                    className="lg:hidden"
                    onClick={() => setSelectedPath(null)}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <ArrowLeft className="size-4" />
                    <span className="sr-only">Back to notes</span>
                  </Button>
                ) : null}
                <div className="grid min-w-0 gap-1">
                  <CardTitle>
                    {selectedNote.data ? selectedNote.data.title : 'No note selected'}
                  </CardTitle>
                  {selectedNote.data ? (
                    <CardDescription className="break-all font-mono text-xs">
                      {selectedNote.data.relativePath}
                    </CardDescription>
                  ) : null}
                </div>
              </div>
              {selectedNote.data ? <Badge variant="accent">md</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {selectedNote.isLoading ? (
              <div className="grid gap-3" aria-busy="true" aria-label="Loading note">
                <Skeleton className="h-120 w-full" />
                <div className="flex gap-3">
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>
            ) : selectedNote.data ? (
              <>
                <Textarea
                  className="min-h-120 font-mono text-xs leading-6"
                  onChange={(e) => setEditorContent(e.target.value)}
                  rows={20}
                  value={editorContent}
                />
                <div className="flex flex-wrap gap-3">
                  <Button className="w-fit" disabled={saveNote.isPending} onClick={() => saveNote.mutate()}>
                    {saveNote.isPending ? 'Saving…' : 'Save note'}
                  </Button>
                  <Button
                    className="w-fit"
                    disabled={deleteNote.isPending}
                    onClick={() => setDeleteOpen(true)}
                    variant="secondary"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm leading-5 text-muted-foreground">
                Select a note from the index or create a new one.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog onOpenChange={setCreateOpen} open={createOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New memory note</DialogTitle>
            <DialogDescription>Create a local markdown note inside the hub memory folder.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">Name</span>
              <Input onChange={(e) => setDraftName(e.target.value)} placeholder="e.g. project-context" value={draftName} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">Subdirectory (optional)</span>
              <Input onChange={(e) => setDraftSubdir(e.target.value)} placeholder="e.g. projects" value={draftSubdir} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">Initial content</span>
              <Textarea onChange={(e) => setDraftContent(e.target.value)} rows={8} value={draftContent} />
            </label>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setCreateOpen(false)} variant="secondary">Cancel</Button>
            <Button
              disabled={createNote.isPending || draftName.trim().length === 0}
              onClick={() => createNote.mutate()}
            >
              {createNote.isPending ? 'Creating…' : 'Create note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setDeleteOpen} open={deleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete note</DialogTitle>
            <DialogDescription>This permanently removes the note file from the memory folder.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              {selectedNote.data ? `${selectedNote.data.relativePath} will be permanently deleted.` : 'No note is selected.'}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setDeleteOpen(false)} variant="secondary">Cancel</Button>
            <Button disabled={deleteNote.isPending} onClick={() => deleteNote.mutate()} variant="destructive">
              {deleteNote.isPending ? 'Deleting…' : 'Confirm delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
