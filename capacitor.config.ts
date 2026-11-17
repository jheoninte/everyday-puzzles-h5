import type { CapacitorConfig } from '@capacitor/cli';
import native from './config/native.json';

const config: CapacitorConfig = {
  appId: native.appId,
  appName: native.appName,
  webDir: 'dist',
  loggingBehavior: 'debug',
  ios: { contentInset: 'never', preferredContentMode: 'mobile' },
};
export default config;
