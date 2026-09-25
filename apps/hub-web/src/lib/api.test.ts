import { afterEach, describe, expect, it, vi } from 'vitest';

import { errorMessage, getJson, libraryApi, sendJson } from './api';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('sendJson', () => {
  it('sends JSON and returns the parsed body', async () => {
    const fetchMock = vi.fn(async () => Response.json({ id: 'rules:a' }, { status: 201 }));
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(sendJson('/api/library', 'POST', { name: 'a' })).resolves.toEqual({ id: 'rules:a' });
    expect(fetchMock).toHaveBeenCalledWith('/api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"a"}'
    });
  });

  it("throws the hub's error message", async () => {
    globalThis.fetch = vi.fn(async () => Response.json({ error: 'Asset already exists: rules/a' }, { status: 409 })) as typeof fetch;

    await expect(sendJson('/api/library', 'POST', {})).rejects.toThrow('Asset already exists: rules/a');
  });

  it('falls back to the status when the body is not JSON', async () => {
    globalThis.fetch = vi.fn(async () => new Response('Bad gateway', { status: 502 })) as typeof fetch;

    await expect(sendJson('/api/integrations/setup', 'POST')).rejects.toThrow('Request failed: 502');
  });
});

describe('library URLs', () => {
  it('encodes asset names', async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    globalThis.fetch = fetchMock as typeof fetch;

    await getJson('/x').catch(() => undefined);
    await libraryApi.getByKindAndName('rules', 'my rule#1');

    expect(fetchMock).toHaveBeenLastCalledWith('/api/library/rules/my%20rule%231');
  });
});

describe('errorMessage', () => {
  it('returns the message of an Error', () => {
    expect(errorMessage(new Error('Disk full'), 'Unable to save')).toBe('Disk full');
  });

  it('falls back for non-Error values and empty messages', () => {
    expect(errorMessage('boom', 'Unable to save')).toBe('Unable to save');
    expect(errorMessage(new Error(''), 'Unable to save')).toBe('Unable to save');
  });
});
