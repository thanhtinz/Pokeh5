import type { CapacitorConfig } from '@capacitor/cli';

// The game is a full-screen portrait canvas of panels, so the WebView is set
// up to behave like an app rather than a document: no zoom, no overscroll, and
// a dark ground so a cold start never flashes white.
const config: CapacitorConfig = {
  appId: 'com.example.vandao',
  appName: 'Vấn Đạo Tu Tiên',
  webDir: 'dist',
  android: {
    backgroundColor: '#20241fff',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    backgroundColor: '#20241fff',
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: { launchAutoHide: false, backgroundColor: '#20241fff' },
  },
};

export default config;
