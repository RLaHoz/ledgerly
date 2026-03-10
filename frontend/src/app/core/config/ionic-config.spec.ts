import { buildIonicConfig } from './ionic-config';

describe('buildIonicConfig', () => {
  it('disables web input scroll shims on web', () => {
    expect(buildIonicConfig(false)).toEqual({
      scrollAssist: false,
      inputShims: false,
      scrollPadding: false,
      inputBlurring: false,
      hideCaretOnScroll: false,
    });
  });

  it('keeps native default config on native platform', () => {
    expect(buildIonicConfig(true)).toEqual({});
  });
});

