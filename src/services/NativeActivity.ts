import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { flushDeviceStorage } from './DeviceStorage';

let appActive = true;
let busy = false;
export const ACTIVITY_EVENT = 'puzzle-activity';
export function isNativeBusy(): boolean { return busy; }
export function isGameActive(): boolean { return appActive && !busy && document.visibilityState === 'visible'; }
export function acquireNativeActivity(): (() => void) | null {
  if (busy) return null;
  busy = true;
  window.dispatchEvent(new Event(ACTIVITY_EVENT));
  let released = false;
  return () => {
    if (released) return;
    released = true;
    busy = false;
    window.dispatchEvent(new Event(ACTIVITY_EVENT));
  };
}
export async function initializeNativeActivity(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  appActive = (await App.getState()).isActive;
  await App.addListener('appStateChange', ({ isActive }) => {
    appActive = isActive;
    window.dispatchEvent(new Event(ACTIVITY_EVENT));
    if (!isActive) void flushDeviceStorage().catch(() => { /* DeviceStorage emits the storage error notice. */ });
  });
}
