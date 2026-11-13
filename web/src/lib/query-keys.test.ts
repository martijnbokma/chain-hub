import { describe, expect, it } from 'vitest';

import { queryKeys } from './query-keys';

describe('queryKeys', () => {
  it('keeps library keys under the library prefix so prefix invalidation hits all of them', () => {
    for (const key of [
      queryKeys.libraryDiscover,
      queryKeys.libraryDetails,
      queryKeys.libraryDetail('skills', 'a'),
      queryKeys.skillFiles('a'),
      queryKeys.skillFile('a', 'b/c.md'),
      queryKeys.skillUpdates
    ]) {
      expect(key[0]).toBe('library');
    }
  });

  it('builds detail keys from kind and name', () => {
    expect(queryKeys.libraryDetail('skills', 'my-skill')).toEqual(['library', 'detail', 'skills', 'my-skill']);
    expect(queryKeys.skillFile('my-skill', 'scripts/x.sh')).toEqual([
      'library',
      'skill-file',
      'my-skill',
      'scripts/x.sh'
    ]);
  });
});
