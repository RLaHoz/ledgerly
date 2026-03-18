import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rlahoz.ledgerly',
  appName: 'Ledgerly',
  webDir: 'www',
  plugins: {
    Keyboard: {
      resize: 'none',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
