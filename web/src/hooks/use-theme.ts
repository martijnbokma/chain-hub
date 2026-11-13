import { useCallback, useSyncExternalStore } from 'react';

import {
  applyThemePreference,
  getStoredThemePreference,
  resolveTheme,
  setThemePreference,
  type ResolvedTheme,
  type ThemePreference
} from '@/lib/theme';

type ThemeListener = () => void;

let preferenceSnapshot = getStoredThemePreference();
let resolvedSnapshot = resolveTheme(preferenceSnapshot);
const listeners = new Set<ThemeListener>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: ThemeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getPreferenceSnapshot(): ThemePreference {
  return preferenceSnapshot;
}

function getResolvedSnapshot(): ResolvedTheme {
  return resolvedSnapshot;
}

function commitPreference(preference: ThemePreference): void {
  preferenceSnapshot = preference;
  resolvedSnapshot = setThemePreference(preference);
  emit();
}

function syncFromSystem(): void {
  if (preferenceSnapshot !== 'system') {
    return;
  }
  const next = resolveTheme('system');
  if (next === resolvedSnapshot) {
    return;
  }
  resolvedSnapshot = applyThemePreference('system');
  emit();
}

if (typeof window !== 'undefined') {
  applyThemePreference(preferenceSnapshot);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncFromSystem);
}

export function useTheme() {
  const preference = useSyncExternalStore(subscribe, getPreferenceSnapshot, getPreferenceSnapshot);
  const resolved = useSyncExternalStore(subscribe, getResolvedSnapshot, getResolvedSnapshot);

  const setPreference = useCallback((next: ThemePreference) => {
    commitPreference(next);
  }, []);

  const toggle = useCallback(() => {
    commitPreference(resolvedSnapshot === 'dark' ? 'light' : 'dark');
  }, []);

  return {
    preference,
    resolved,
    setPreference,
    toggle,
    isDark: resolved === 'dark'
  };
}
