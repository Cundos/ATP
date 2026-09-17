import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cundolabs.atilioplants',
  appName: 'Atilio Plants',
  webDir: 'public',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://app-iota-three-66.vercel.app',
    cleartext: process.env.NODE_ENV !== 'production' && !!process.env.CAPACITOR_SERVER_URL?.startsWith('http://'),
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== 'production',
  },
};

export default config;
