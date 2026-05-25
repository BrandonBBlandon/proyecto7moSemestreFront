import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.istfinal.smokemonitoring',
  appName: 'Smoke IoT',
  webDir: 'www/browser',
  bundledWebRuntime: false,
  server: {
    cleartext: true
  }
};

export default config;
