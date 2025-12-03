import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import './App.css';

interface Player {
  id: string;
  name: string;
  modelName?: string;
  score: number;
}

interface MoveHistoryItem {
  player: string;
  move: string;
  fen: string;
  commentary?: string;
}

interface GameState {
  gameId: string;
  gameType: string;
  gameName: string;
  players: Player[];
  round: number;
  status: string;
  fen?: string;
  turn?: string;
  isCheck?: boolean;
  isCheckmate?: boolean;
  moveHistory?: MoveHistoryItem[];
  winnerId?: string;
}

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [commentary, setCommentary] = useState<MoveHistoryItem[]>([]);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:3000/events');

    eventSource.onopen = () => {
      console.log('✅ Connected to Arena402');
      setConnected(true);
    };

    eventSource.addEventListener('game_started', (e) => {
      const data = JSON.parse(e.data);
      console.log('🎮 Game started:', data);
      setGameState({
        ...data,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        turn: 'white',
        status: 'active'
      });
      setCommentary([]);
    });

    eventSource.addEventListener('round_result', (e) => {
      const data = JSON.parse(e.data);
      console.log('📊 Round result:', data);
    });

    eventSource.addEventListener('game_over', (e) => {
      const data = JSON.parse(e.data);
      console.log('🏆 Game over:', data);
      if (gameState) {
        setGameState({ ...gameState, status: 'finished', winnerId: data.winnerId });
      }
    });

    eventSource.onerror = (error) => {
      console.error('❌ SSE Error:', error);
      setConnected(false);
    };

    const pollGameState = setInterval(async () => {
      if (!gameState?.gameId) return;

      try {
        const response = await fetch('http://localhost:3000/health');
        const health = await response.json();

        if (health.games > 0 && gameState) {
          const stateResponse = await fetch(`http://localhost:3000/game/${gameState.gameId}`);
          if (stateResponse.ok) {
            const state = await stateResponse.json();
            setGameState(prev => ({
              ...prev!,
              ...state,
              moveHistory: state.moveHistory || prev?.moveHistory || []
            }));

            if (state.moveHistory) {
              setCommentary(state.moveHistory);
            }
          }
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    }, 1000);

    return () => {
      eventSource.close();
      clearInterval(pollGameState);
    };
  }, [gameState?.gameId]);

  const getCurrentTurnPlayer = () => {
    if (!gameState) return null;
    const turnColor = gameState.turn === 'white' ? 0 : 1;
    return gameState.players[turnColor];
  };

  return (
    <div className="app">
      <div className="background-gradient"></div>

      <header className="header">
        <h1 className="logo">
          <span className="logo-icon">♔</span>
          ARENA402
          <span className="logo-subtitle">AI Chess Battle</span>
        </h1>
        <div className={`status-badge ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '🟢 LIVE' : '🔴 DISCONNECTED'}
        </div>
      </header>

      <main className="main-content">
        {!gameState ? (
          <div className="waiting-screen">
            <div className="spinner"></div>
            <h2>Waiting for AI Gladiators...</h2>
            <p>Two agents must pay 0.001 SOL via SPL402 to start the battle</p>
          </div>
        ) : (
          <div className="game-container">
            <div className="players-section">
              <div className="player-card white-player">
                <div className="player-icon">♔</div>
                <div className="player-info">
                  <div className="player-name">{gameState.players[0]?.name || 'Player 1'}</div>
                  <div className="player-model">{gameState.players[0]?.modelName || 'Unknown Model'}</div>
                </div>
                <div className="player-score">{gameState.players[0]?.score || 0}</div>
              </div>

              <div className="vs-badge">VS</div>

              <div className="player-card black-player">
                <div className="player-icon">♚</div>
                <div className="player-info">
                  <div className="player-name">{gameState.players[1]?.name || 'Player 2'}</div>
                  <div className="player-model">{gameState.players[1]?.modelName || 'Unknown Model'}</div>
                </div>
                <div className="player-score">{gameState.players[1]?.score || 0}</div>
              </div>
            </div>

            <div className="board-section">
              <div className="board-wrapper">
                {gameState.isCheck && <div className="check-indicator">⚠️ CHECK!</div>}
                {gameState.isCheckmate && <div className="checkmate-indicator">♔ CHECKMATE! ♔</div>}

                <Chessboard
                  position={gameState.fen || 'start'}
                  boardWidth={600}
                  customDarkSquareStyle={{ backgroundColor: '#9333ea' }}
                  customLightSquareStyle={{ backgroundColor: '#e9d5ff' }}
                  customBoardStyle={{
                    borderRadius: '10px',
                    boxShadow: '0 20px 60px rgba(147, 51, 234, 0.4)'
                  }}
                />

                <div className="turn-indicator">
                  {gameState.status === 'finished' ? (
                    <div className="game-over">
                      🏆 GAME OVER! Winner: {gameState.players.find(p => p.id === gameState.winnerId)?.name}
                    </div>
                  ) : (
                    <div className="current-turn">
                      Current Turn: <span className={gameState.turn}>{getCurrentTurnPlayer()?.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="commentary-section">
              <h3 className="commentary-title">
                <span className="commentary-icon">💬</span>
                Live Commentary
              </h3>
              <div className="commentary-feed">
                {commentary.length === 0 ? (
                  <div className="no-commentary">Waiting for first move...</div>
                ) : (
                  commentary.slice().reverse().map((item, idx) => (
                    <div key={idx} className="commentary-item">
                      <div className="commentary-header">
                        <span className="commentary-player">{item.player}</span>
                        <span className="commentary-move">{item.move}</span>
                      </div>
                      {item.commentary && (
                        <div className="commentary-text">"{item.commentary}"</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="footer-content">
          <span>Powered by SPL402 on Solana</span>
          <span className="separator">•</span>
          <span>Move #{gameState?.round || 0}</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
