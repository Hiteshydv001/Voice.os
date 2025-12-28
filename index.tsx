import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

// Add global error listener for unhandled rejections/exceptions
window.onerror = function(message, source, lineno, colno, error) {
  console.error("Global Error:", message, error);
  if (rootElement) {
     rootElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace;">
        <h1>CRITICAL SYSTEM FAILURE</h1>
        <p>${message}</p>
        <p>${source}:${lineno}</p>
      </div>
    `;
  }
};

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

console.log("System Initializing...");

// Prevent double root creation during HMR
let root;
if (!rootElement.hasAttribute('data-root-initialized')) {
  try {
    root = createRoot(rootElement);
    rootElement.setAttribute('data-root-initialized', 'true');
    root.render(<App />);
    console.log("Root Rendered Successfully");
  } catch (error) {
    console.error("Application failed to mount:", error);
    rootElement.innerHTML = `<div style="padding: 20px; color: red;"><h1>System Failure</h1><p>${error.message}</p></div>`;
  }
}