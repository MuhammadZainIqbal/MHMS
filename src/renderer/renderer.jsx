/**
 * Renderer Process Entry Point
 * This file loads the React application
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.log('[RENDERER] Initializing React application...');

// Get the root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Create React root and render the app
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('[RENDERER] React application mounted successfully');

