import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The game is a static bundle with no network calls, so the native shell is
 * only there to give it an icon, a splash and real storage.
 */
const config: CapacitorConfig = {
  appId: 'com.broketoboss.game',
  appName: 'Broke to Boss',
  webDir: 'dist',
  android: {
    // The palette runs dark at every point on the climb; a white flash between
    // the splash and the first frame would be the only bright thing in it.
    backgroundColor: '#0c0507',
  },
  ios: {
    backgroundColor: '#0c0507',
  },
};

export default config;
