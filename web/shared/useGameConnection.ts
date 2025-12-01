import { useEffect, useState, useCallback } from 'react';

interface Player {
  id: string;
  name: string;
  modelName?: string;
  score: number;
}

interface GameState {
  gameId: string;
  gameType: string;
  gameName: string;
  players: Player[];
  round: number;
  status: string;
  [key: string]: any;
}

export function useGameConnection(arbiterUrl: string = 'http://localhost:3000') {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const fetchCurrentGame = async () => {
      try {
        const response = await fetch(`${arbiterUrl}/current-game`);
        if (response.ok) {
          const data = await response.json();
          if (data.gameId) {
            console.log('🔄 Fetched current game state:', data);
            setGameState(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch current game:', error);
      }
    };

    fetchCurrentGame();

    const eventSource = new EventSource(`${arbiterUrl}/events`);

    eventSource.onopen = () => {
      console.log('✅ Connected to Arena402');
      setConnected(true);
    };

    eventSource.addEventListener('game_started', (e) => {
      const data = JSON.parse(e.data);
      console.log('🎮 Game started event received:');
      console.log('   - FEN:', data.fen);
      console.log('   - Full data:', data);
      setGameState({
        ...data,
        status: 'active'
      });
    });

    eventSource.addEventListener('move_made', (e) => {
      const data = JSON.parse(e.data);
      console.log('♟️ Move made event received:');
      console.log('   - FEN:', data.fen);
      console.log('   - Turn:', data.turn);
      console.log('   - Round:', data.round);
      console.log('   - Full data:', data);

      setGameState(prev => {
        const newState = {
          ...prev,
          ...data,
          status: data.status || prev?.status || 'active'
        };
        console.log('📝 Setting new game state:', newState);
        return newState;
      });
    });

    eventSource.addEventListener('round_result', (e) => {
      const data = JSON.parse(e.data);
      console.log('📊 Round result:', data);
    });

    eventSource.addEventListener('game_over', (e) => {
      const data = JSON.parse(e.data);
      console.log('🏆 Game over:', data);
      setGameState(prev => prev ? { ...prev, status: 'finished', winnerId: data.winnerId } : null);
    });

    eventSource.onerror = (error) => {
      console.error('❌ SSE Error:', error);
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [arbiterUrl]);

  const updateGameState = useCallback(async (gameId: string) => {
    try {
      const response = await fetch(`${arbiterUrl}/game/${gameId}`);
      if (response.ok) {
        const state = await response.json();
        setGameState(prev => ({
          ...prev!,
          ...state
        }));
      }
    } catch (error) {
      console.error('Failed to fetch game state:', error);
    }
  }, [arbiterUrl]);

  return { gameState, connected, updateGameState };
}
