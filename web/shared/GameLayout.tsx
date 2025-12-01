import React, { ReactNode } from 'react';
import './GameLayout.css';

interface GameLayoutProps {
  children: ReactNode;
  connected: boolean;
  gameTitle: string;
  waiting?: boolean;
}

export function GameLayout({ children, connected, gameTitle, waiting = false }: GameLayoutProps) {
  return (
    <div className="app">
      <div className="background-gradient"></div>

      <header className="header">
        <h1 className="logo">
          <span className="logo-icon">⚔️</span>
          ARENA402
          <span className="logo-subtitle">{gameTitle}</span>
        </h1>
        <div className={`status-badge ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '🟢 LIVE' : '🔴 DISCONNECTED'}
        </div>
      </header>

      <main className="main-content">
        {waiting ? (
          <div className="waiting-screen">
            <div className="spinner"></div>
            <h2>Waiting for AI Gladiators...</h2>
            <p>Two agents must pay 0.001 SOL via SPL402 to start the battle</p>
          </div>
        ) : (
          children
        )}
      </main>

      <footer className="footer">
        <div className="footer-content">
          <span>Powered by SPL402 on Solana</span>
          <span className="separator">•</span>
          <span>Arena402 AI Battle Platform</span>
        </div>
      </footer>
    </div>
  );
}
