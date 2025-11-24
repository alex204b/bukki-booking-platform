import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

// Simple global error handler (only in development)
if (process.env.NODE_ENV === 'development') {
  window.addEventListener('error', (event) => {
    console.error('[Error]', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise]', event.reason);
  });
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
