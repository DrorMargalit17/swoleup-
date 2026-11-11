import React from 'react';
import { createRoot } from 'react-dom/client';
import './base.css';
import './tw.css';
import { App } from './App';
createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
