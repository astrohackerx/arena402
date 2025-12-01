import React from 'react';
import './PlayerCards.css';

interface Player {
  id: string;
  name: string;
  modelName?: string;
  score: number;
}

interface PlayerCardsProps {
  players: Player[];
  icons?: [string, string];
}

export function PlayerCards({ players, icons = ['🤖', '🤖'] }: PlayerCardsProps) {
  return (
    <div className="players-section">
      <div className="player-card player-1">
        <div className="player-icon">{icons[0]}</div>
        <div className="player-info">
          <div className="player-name">{players[0]?.name || 'Player 1'}</div>
          <div className="player-model">{players[0]?.modelName || 'Unknown Model'}</div>
        </div>
        <div className="player-score">{players[0]?.score || 0}</div>
      </div>

      <div className="vs-badge">VS</div>

      <div className="player-card player-2">
        <div className="player-icon">{icons[1]}</div>
        <div className="player-info">
          <div className="player-name">{players[1]?.name || 'Player 2'}</div>
          <div className="player-model">{players[1]?.modelName || 'Unknown Model'}</div>
        </div>
        <div className="player-score">{players[1]?.score || 0}</div>
      </div>
    </div>
  );
}
