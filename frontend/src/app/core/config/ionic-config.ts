import type { IonicConfig } from '@ionic/core/components';

export function buildIonicConfig(isNativePlatform: boolean): IonicConfig {
  if (isNativePlatform) {
    return {};
  }

  return {
    // Prevent web input shims from auto-scrolling Ionic content on focus.
    scrollAssist: false,
    inputShims: false,
    scrollPadding: false,
    inputBlurring: false,
    hideCaretOnScroll: false,
  };
}

