import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.5c3dc5bf0e654f2d866c24c9d9b4a40c',
  appName: 'fityourself',
  webDir: 'dist',
  server: {
    url: 'https://5c3dc5bf-0e65-4f2d-866c-24c9d9b4a40c.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'always'
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    }
  }
};

export default config;
