import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { initializeDeviceStorage } from './services/DeviceStorage';
import { initializeNativeActivity } from './services/NativeActivity';

const root = ReactDOM.createRoot(document.getElementById('root')!);
async function start() {
  root.render(<p className="p-8 text-white" role="status">Preparing your game…</p>);
  try {
    await initializeDeviceStorage();
    await initializeNativeActivity();
    root.render(<React.StrictMode><App /></React.StrictMode>);
  } catch {
    root.render(<div className="space-y-4 p-8 text-white"><p role="alert">Unable to read your saved progress. Check device storage and try again.</p><button className="primary-button" onClick={() => { void start(); }}>Try again</button></div>);
  }
}
void start();

