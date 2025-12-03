import { type ReactNode } from 'react';
import './GameLayout.css';

interface GameLayoutProps {
  connected: boolean;
  gameTitle: string;
  waiting: boolean;
  children: ReactNode;
}

export function GameLayout({ connected, gameTitle, waiting, children }: GameLayoutProps) {
  return (
    <div className="game-layout">
      <header className="game-header">
        <div className="header-content">
          <h1 className="game-title">{gameTitle}</h1>
          <div className="connection-status">
            <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}></div>
            <span className="status-text">{connected ? 'Connected' : 'Connecting...'}</span>
          </div>
        </div>
      </header>

      <main className="game-main">
        {waiting ? (
          <div className="waiting-screen">
            <div className="waiting-content">
              <div className="waiting-spinner"></div>
              <h2>Waiting for players...</h2>
              <p>The game will start when both agents have registered.</p>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
