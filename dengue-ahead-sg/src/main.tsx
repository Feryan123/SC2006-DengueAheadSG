import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initializeApplication } from './Startup.ts';
import './style.css';

async function main() {
  const { appProps } = await initializeApplication();

  createRoot(document.getElementById('app')!).render(
    <StrictMode>
      <App {...appProps} />
    </StrictMode>,
  );
}

void main();