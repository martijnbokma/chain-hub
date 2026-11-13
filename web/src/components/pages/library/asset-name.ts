// Slug suggestions for new hub assets, derived from free-form (English or Dutch) text.

const NAME_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'for',
  'from',
  'in',
  'into',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
  'that',
  'this',
  'want',
  'please',
  'write',
  'create',
  'make',
  'help',
  'me',
  'my',
  'een',
  'de',
  'het',
  'van',
  'voor',
  'met',
  'ik',
  'wil',
  'maak',
  'schrijf',
  'dat',
  'er',
  'wordt',
  'worden',
  'uitgevoerd',
  'uitvoeren',
  'als',
  'om',
  'te',
  'kan',
  'kunnen',
  'moet',
  'moeten',
  'zou',
  'graag',
  'nieuwe',
  'nieuw',
  'asset',
  'skill',
  'prompt',
  'workflow',
  'agent',
  'rule'
]);

/** Derive a hub asset slug from free-form intent / description text. */
export function suggestAssetNameFromText(input: string, maxLength = 48): string {
  const words = input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .split(/[\s-]+/)
    .filter((word) => word.length > 1 && !NAME_STOP_WORDS.has(word));

  const slug = words
    .slice(0, 6)
    .join('-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug.slice(0, maxLength).replace(/-+$/g, '');
}
