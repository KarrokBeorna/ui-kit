// main.tsx — точка входа (Vite index.html со <div id="root"> и <script type="module" src="/main.tsx">).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);