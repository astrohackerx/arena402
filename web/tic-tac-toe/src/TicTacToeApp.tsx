import { GameLayout } from '../../shared/GameLayout';
import { PlayerCards } from '../../shared/PlayerCards';
import { useGameConnection } from '../../shared/useGameConnection';
import './TicTacToeApp.css';

function TicTacToeApp() {
  const { gameState, connected } = useGameConnection();

  const renderBoard = () => {
    if (!gameState?.board) return null;

    const board = gameState.board;
    const winner = gameState.status === 'finished' ? gameState.winnerId : null;

    return (
      <div className="board-grid">
        {board.map((cell: string, index: number) => (
          <div
            key={index}
            className={`cell ${cell ? 'filled' : ''} ${
              winner && gameState.winningLine?.includes(index) ? 'winning' : ''
            }`}
          >
            {cell === 'X' && <span className="x-mark">X</span>}
            {cell === 'O' && <span className="o-mark">O</span>}
          </div>
        ))}
      </div>
    );
  };

  const getCurrentPlayer = () => {
    if (!gameState) return null;
    return gameState.players.find((p: any) => p.id === gameState.currentTurn);
  };

  const getPlayerSymbol = (playerId: string) => {
    if (!gameState) return '';
    const index = gameState.players.findIndex((p: any) => p.id === playerId);
    return index === 0 ? 'X' : 'O';
  };

  return (
    <GameLayout
      connected={connected}
      gameTitle="Tic-Tac-Toe Battle"
      waiting={!gameState}
    >
      {gameState && (
        <>
          <PlayerCards
            players={gameState.players}
            icons={['❌', '⭕']}
          />

          <div className="game-container">
            <div className="game-info">
              <div className="round-info">
                Round {gameState.round}/{gameState.maxRounds}
              </div>

              {gameState.status === 'active' && (
                <div className="turn-indicator">
                  Current Turn: <span className="current-player">
                    {getCurrentPlayer()?.name} ({getPlayerSymbol(gameState.currentTurn)})
                  </span>
                </div>
              )}

              {gameState.status === 'finished' && (
                <div className="game-over">
                  {gameState.winnerId ? (
                    <>
                      🏆 Winner: {gameState.players.find((p: any) => p.id === gameState.winnerId)?.name}
                    </>
                  ) : (
                    <>🤝 Draw!</>
                  )}
                </div>
              )}
            </div>

            <div className="board-section">
              {renderBoard()}
            </div>

            {gameState.history && gameState.history.length > 0 && (
              <div className="history-section">
                <h3>Move History</h3>
                <div className="history-feed">
                  {gameState.history.slice().reverse().map((round: any, idx: number) => (
                    <div key={idx} className="history-item">
                      <div className="history-round">Round {gameState.history.length - idx}</div>
                      {round.moves.map((move: any, moveIdx: number) => (
                        <div key={moveIdx} className="move-item">
                          <span className="player-name">{move.player}</span>
                          <span className="move-value">→ Position {move.move}</span>
                        </div>
                      ))}
                      {round.winner && (
                        <div className="round-result">
                          Winner: {round.winner}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </GameLayout>
  );
}

export default TicTacToeApp;
