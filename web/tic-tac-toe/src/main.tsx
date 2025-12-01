import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TicTacToeApp from './TicTacToeApp.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TicTacToeApp />
  </StrictMode>,
);
