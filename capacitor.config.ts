import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pokeh5.game',
  appName: 'Pokeh5',
  webDir: 'dist',
  android: {
    // The game draws its own background, so letting the WebView paint one first
    // just causes a white flash on cold start.
    backgroundColor: '#0b101cff',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    backgroundColor: '#0b101cff',
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0b101cff',
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
