import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.jsx';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  // Render a helpful message instead of a cryptic Clerk error
  const root = document.getElementById('root');
  root.innerHTML = `
    <div style="padding:2rem;font-family:sans-serif;color:#fff;background:#000;min-height:100vh">
      <h1 style="color:#1DB954">Missing Clerk Publishable Key</h1>
      <p>Create <code>client/.env</code> from <code>.env.example</code> and set <code>VITE_CLERK_PUBLISHABLE_KEY</code>.</p>
      <p>Get one free at <a href="https://clerk.com" style="color:#1DB954">clerk.com</a>.</p>
    </div>
  `;
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    </React.StrictMode>
  );
}
