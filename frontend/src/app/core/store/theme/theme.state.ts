export type ThemeMode = 'dark' | 'light';

export interface ThemeState {
  mode: ThemeMode;
}

export const initialThemeState: ThemeState = {
  mode: 'light',
};
