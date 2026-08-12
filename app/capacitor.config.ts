import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The client is an Egret WebGL game, so the WebView is configured for a
 * full-screen canvas rather than a document: no zoom, no overscroll, portrait
 * only, and a dark background so a cold start does not flash white.
 *
 * `appId` deliberately differs from the release's `com.xulonggame.pokemon2` —
 * shipping under someone else's package name would collide with their app on
 * a device and misattribute the build. Change it to your own before signing.
 */
const config: CapacitorConfig = {
  appId: process.env.APP_ID ?? 'com.example.pokeh5',
  appName: process.env.APP_NAME ?? 'Pokemon H5',
  webDir: 'www',

  android: {
    backgroundColor: '#3d3c3cff',
    allowMixedContent: true, // The game server speaks plain HTTP by default.
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Egret renders through WebGL; hardware acceleration is what makes it
    // playable rather than a slideshow.
    useLegacyBridge: false,
  },

  ios: {
    backgroundColor: '#3d3c3cff',
    contentInset: 'never',
    limitsNavigationsToAppBoundDomains: false,
  },

  server: {
    androidScheme: 'https',
    // Without this an HTTP game server is blocked by the WebView's cleartext
    // policy. Set GAME_SERVER_HOST so only that host is exempted.
    cleartext: true,
    ...(process.env.GAME_SERVER_HOST
      ? { allowNavigation: [process.env.GAME_SERVER_HOST] }
      : {}),
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#3d3c3cff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#00000000',
    },
  },
};

export default config;
