import { ThemeMode } from './theme.state';

const VALID_THEME_MODES: readonly ThemeMode[] = ['light', 'dark'];

export const isThemeMode = (value: string | null): value is ThemeMode =>
  value !== null && VALID_THEME_MODES.includes(value as ThemeMode);
