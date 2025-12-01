import { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { GameLayout } from '../../shared/GameLayout';
import { useGameConnection } from '../../shared/useGameConnection';
import './ChessApp.css';

interface MoveHistoryItem {
  player: string;
  move: string;
  fen: string;
  commentary?: string;
}

function ChessApp() {
  const { gameState, connected } = useGameConnection();
  const [currentFen, setCurrentFen] = useState('start');
  const commentaryListRef = useRef<HTMLDivElement>(null);

  // Update FEN when gameState changes
  useEffect(() => {
    console.log('🎮 GameState changed:', {
      hasFen: !!gameState?.fen,
      fen: gameState?.fen,
      round: gameState?.round,
      turn: gameState?.turn,
      fullState: gameState
    });

    if (gameState?.fen) {
      console.log('✅ Updating board to FEN:', gameState.fen);
      setCurrentFen(gameState.fen);
    }
  }, [gameState]);


  if (!gameState) {
    return (
      <GameLayout
        connected={connected}
        gameTitle="Chess Battle"
        waiting={true}
      >
        <></>
      </GameLayout>
    );
  }

  const whitePlayer = gameState.players[0];
  const blackPlayer = gameState.players[1];
  const moveHistory: MoveHistoryItem[] = gameState.moveHistory || [];

  const isWhiteTurn = gameState.turn === 'white';
  const currentPlayer = isWhiteTurn ? whitePlayer : blackPlayer;
  const currentColor = isWhiteTurn ? 'White' : 'Black';

  const getPlayerColor = (playerName: string): 'white' | 'black' | null => {
    if (playerName === whitePlayer?.name) return 'white';
    if (playerName === blackPlayer?.name) return 'black';
    return null;
  };

  return (
    <GameLayout
      connected={connected}
      gameTitle="Chess Battle"
      waiting={false}
    >
      <div className="chess-container">
        {/* Top: Player Info Section */}
        <div className="players-info-bar">
          <div className="player-info-card white-card">
            <div className="player-badge">
              <span className="badge-icon">♔</span>
              <span className="badge-label">WHITE</span>
            </div>
            <div className="player-meta">
              <div className="player-name">{whitePlayer?.name || 'Player 1'}</div>
              <div className="player-model">{whitePlayer?.modelName || whitePlayer?.model || 'Unknown Model'}</div>
            </div>
          </div>

          <div className="vs-divider">VS</div>

          <div className="player-info-card black-card">
            <div className="player-badge">
              <span className="badge-icon">♚</span>
              <span className="badge-label">BLACK</span>
            </div>
            <div className="player-meta">
              <div className="player-name">{blackPlayer?.name || 'Player 2'}</div>
              <div className="player-model">{blackPlayer?.modelName || blackPlayer?.model || 'Unknown Model'}</div>
            </div>
          </div>
        </div>

        {/* Main Content: Board + Sidebar */}
        <div className="game-content">
          {/* Left: Chess Board */}
          <div className="board-section">
            <div className="board-wrapper">
              {gameState.isCheck && (
                <div className="check-indicator">⚠️ CHECK!</div>
              )}
              {gameState.isCheckmate && (
                <div className="checkmate-indicator">♔ CHECKMATE! ♔</div>
              )}

              <Chessboard
                position={currentFen}
                arePiecesDraggable={false}
                animationDuration={500}
                boardOrientation="white"
                customDarkSquareStyle={{ backgroundColor: '#8b5cf6' }}
                customLightSquareStyle={{ backgroundColor: '#f5f5f5' }}
                customBoardStyle={{
                  borderRadius: '10px',
                  boxShadow: '0 20px 60px rgba(139, 92, 246, 0.3)'
                }}
              />

              {/* Debug Info */}
              <div style={{
                marginTop: '0.5rem',
                padding: '0.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontFamily: 'monospace',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                FEN: {currentFen}
              </div>
            </div>

            {gameState.status === 'finished' && (
              <div className="game-result">
                <div className="winner-banner">
                  🏆 GAME OVER! 🏆
                  <br />
                  <span className="winner-name">
                    {gameState.players.find((p: any) => p.id === gameState.winnerId)?.name}
                  </span> wins!
                </div>
              </div>
            )}
          </div>

          {/* Right: Turn Info + Commentary */}
          <div className="sidebar-section">
            {/* Current Turn Status */}
            <div className={`turn-status-box ${isWhiteTurn ? 'white-turn' : 'black-turn'}`}>
              <div className="turn-header">
                <span className="turn-icon">{isWhiteTurn ? '♔' : '♚'}</span>
                <div className="turn-details">
                  <div className="turn-label">{currentColor}'s Turn</div>
                  <div className="turn-player-name">{currentPlayer?.name}</div>
                  <div className="turn-model-name">{currentPlayer?.modelName || currentPlayer?.model || 'Unknown Model'}</div>
                </div>
                <div className="move-counter">Move {gameState.round || 0}</div>
              </div>

              {gameState.status === 'active' && (
                <div className="thinking-status">
                  <span className="thinking-dot"></span>
                  <span className="thinking-text">AI is thinking...</span>
                </div>
              )}
            </div>

            {/* Commentary Feed */}
            <div className="commentary-container">
              <h3 className="commentary-header">
                <span className="header-icon">💭</span>
                Move History
                <span className="moves-count">({moveHistory.length} moves)</span>
              </h3>
              <div className="commentary-list" ref={commentaryListRef}>
                {moveHistory.length === 0 ? (
                  <div className="no-moves">Waiting for first move...</div>
                ) : (
                  [...moveHistory].reverse().map((item, idx) => {
                    const playerColor = getPlayerColor(item.player);
                    const isLatest = idx === 0;
                    const moveNumber = moveHistory.length - idx;
                    return (
                      <div
                        key={moveHistory.length - idx - 1}
                        className={`move-card ${playerColor}-move ${isLatest ? 'latest-move' : ''}`}
                      >
                        {isLatest && (
                          <div className="latest-badge">
                            ⚡ LATEST MOVE
                          </div>
                        )}
                        <div className="move-header">
                          <div className="move-number-badge">#{moveNumber}</div>
                          <div className="move-player-info">
                            <span className={`color-indicator ${playerColor}-indicator`}></span>
                            <div className="move-player-details">
                              <span className="move-player-name">
                                {item.player}
                              </span>
                              <span className="move-player-model">
                                {playerColor === 'white'
                                  ? (whitePlayer?.modelName || whitePlayer?.model || 'Unknown')
                                  : (blackPlayer?.modelName || blackPlayer?.model || 'Unknown')}
                              </span>
                            </div>
                            <span className="move-color-tag">
                              {playerColor === 'white' ? '♔ White' : '♚ Black'}
                            </span>
                          </div>
                          <span className="move-notation">{item.move}</span>
                        </div>
                        {item.commentary && (
                          <div className="move-commentary">"{item.commentary}"</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}

export default ChessApp;
