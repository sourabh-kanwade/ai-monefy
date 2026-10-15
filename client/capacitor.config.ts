import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aimonefy.app',
  appName: 'AI Monefy',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0E121B',
    },
    SplashScreen: {
      backgroundColor: '#0E121B',
      launchAutoHide: true,
      launchShowDuration: 1500,
      showSpinner: false,
    },
  },
};

export default config;
