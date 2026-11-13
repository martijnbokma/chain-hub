import { afterEach, describe, expect, it, vi } from 'vitest';

import { libraryApi } from './domains';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch() {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      calls.push(url);
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    })
  );
  return calls;
}

describe('libraryApi URL encoding', () => {
  it('encodes kind and name in detail paths', async () => {
    const calls = stubFetch();
    await libraryApi.getByKindAndName('skills', 'my skill #1');
    expect(calls[0]).toBe('/api/library/skills/my%20skill%20%231');
  });

  it('encodes each skill-file path segment separately', async () => {
    const calls = stubFetch();
    await libraryApi.getSkillFile('my skill', 'scripts/setup.sh');
    expect(calls[0]).toBe('/api/library/skills/my%20skill/files/scripts/setup.sh');
  });
});
