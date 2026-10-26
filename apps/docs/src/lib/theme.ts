export const THEME_KEY = 'chain-hub-theme';

/** theme-color meta values — the meta tag cannot reference CSS vars, so these mirror the token hex. */
export const THEME_META_COLORS = { dark: '#1C1D1F', light: '#F2F0EB' } as const;

export function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.add('theme-switching');
  root.classList.toggle('dark', theme === 'dark');
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_META_COLORS[theme]);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => root.classList.remove('theme-switching')),
  );
}
