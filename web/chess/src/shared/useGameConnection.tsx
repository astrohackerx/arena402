import { useState, useEffect } from 'react';

export interface Player {
  id: string;
  name: string;
  score: number;
  model?: string;
  modelName?: string;
}

export interface GameState {
  gameId: string;
  gameType: string;
  status: string;
  round: number;
  maxRounds?: number;
  players: Player[];
  currentTurn?: string;
  turn?: string;
  winnerId?: string | null;
  fen?: string;
  isCheck?: boolean;
  isCheckmate?: boolean;
  moveHistory?: any[];
  history?: any[];
  [key: string]: any;
}

export function useGameConnection(arbiterUrl: string = 'http://localhost:3000') {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<Array<{type: string; data: any}>>([]);

  useEffect(() => {
    const eventSource = new EventSource(`${arbiterUrl}/events`);

    eventSource.onopen = () => {
      console.log('Connected to game server');
      setConnected(true);
    };

    eventSource.addEventListener('game_started', (e) => {
      const data = JSON.parse(e.data);
      console.log('Game started:', data);
      setGameState(data);
      setEvents(prev => [...prev, { type: 'game_started', data }]);
    });

    eventSource.addEventListener('move_made', (e) => {
      const data = JSON.parse(e.data);
      console.log('Move made:', data);
      setGameState(data);
      setEvents(prev => [...prev, { type: 'move_made', data }]);
    });

    eventSource.addEventListener('payment_made', (e) => {
      const data = JSON.parse(e.data);
      console.log('Payment made:', data);
      setEvents(prev => [...prev, { type: 'payment_made', data }]);

      if (gameState) {
        const updatedPlayers = gameState.players.map(p => {
          if (p.id === data.agentId) {
            return {
              ...p,
              balance: data.agentBalance,
              totalSpent: data.agentTotalSpent
            };
          }
          return p;
        });

        setGameState({
          ...gameState,
          players: updatedPlayers,
          prizePool: data.prizePool
        });
      }
    });

    eventSource.addEventListener('round_result', (e) => {
      const data = JSON.parse(e.data);
      console.log('Round result:', data);
      setEvents(prev => [...prev, { type: 'round_result', data }]);
    });

    eventSource.addEventListener('game_over', (e) => {
      const data = JSON.parse(e.data);
      console.log('Game over:', data);
      setEvents(prev => [...prev, { type: 'game_over', data }]);
      if (gameState) {
        setGameState({
          ...gameState,
          status: 'finished',
          winnerId: data.winnerId
        });
      }
    });

    eventSource.onerror = () => {
      console.log('SSE connection error');
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [arbiterUrl]);

  return { gameState, connected, events };
}
