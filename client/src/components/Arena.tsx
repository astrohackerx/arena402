import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useSPL402 } from 'spl402';
import './Arena.css';

interface Player {
  id: string;
  name: string;
  score: number;
}

interface RoundHistory {
  roundNumber: number;
  moves: Record<string, string>;
  winnerId: string | null;
  commentary: string;
}

interface GameState {
  gameId: string;
  round: number;
  maxRounds: number;
  players: Player[];
  roundHistory: RoundHistory[];
  status: string;
  winnerId?: string;
  waitingFor: string[];
}

const ARBITER_URL = 'http://localhost:3000';

const MOVE_ICONS: Record<string, string> = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️'
};

const Arena: FC = () => {
  useWallet();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [agents, setAgents] = useState<Map<string, { name: string; status: string }>>(new Map());
  const [prize, setPrize] = useState(0);
  const [status, setStatus] = useState('Waiting for players...');
  const [connected, setConnected] = useState(false);
  const [latestRound, setLatestRound] = useState<RoundHistory | null>(null);

  const {} = useSPL402({
    network: 'devnet'
  });

  useEffect(() => {
    const eventSource = new EventSource(`${ARBITER_URL}/events`);

    eventSource.onopen = () => {
      setConnected(true);
      console.log('Connected to Arbiter');
    };

    eventSource.addEventListener('player_joined', (e) => {
      const data = JSON.parse(e.data);
      setAgents(prev => new Map(prev).set(data.agentId, {
        name: data.agentName,
        status: 'JOINED'
      }));
      setStatus(`${data.playerCount}/2 Players Joined`);
    });

    eventSource.addEventListener('game_started', (e) => {
      const data = JSON.parse(e.data);
      setStatus('⚔️ BATTLE IN PROGRESS');
      setPrize(data.entryFee * 2 * 0.95);
    });

    eventSource.addEventListener('round_complete', (e) => {
      const data = JSON.parse(e.data);
      setGameState(data.gameState);
      setLatestRound(data.round);

      // Show round result temporarily
      setTimeout(() => {
        setLatestRound(null);
      }, 3000);
    });

    eventSource.addEventListener('game_ended', (e) => {
      const data = JSON.parse(e.data);
      setGameState(data.gameState);
      setStatus('🏆 GAME OVER');
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => eventSource.close();
  }, []);

  return (
    <div className="arena">
      <div className="arena-header">
        <h1>⚔️ ARENA402</h1>
        <p className="subtitle">AI BATTLE ROYALE - ROCK PAPER SCISSORS</p>
        <div className="connection-status">
          {connected ? '🟢 LIVE' : '🔴 DISCONNECTED'}
        </div>
      </div>

      <div className="wallet-section">
        <WalletMultiButton />
      </div>

      <div className="status-banner">
        <h2>{status}</h2>
        {prize > 0 && (
          <div className="prize-pool">
            💰 Prize Pool: <span className="prize-amount">{prize.toFixed(4)} SOL</span>
          </div>
        )}
      </div>

      {gameState && (
        <div className="game-container">
          {/* Score Board */}
          <div className="scoreboard">
            <div className="round-info">
              ROUND {gameState.round}/{gameState.maxRounds} | FIRST TO 3 WINS
            </div>
            <div className="players-score">
              {gameState.players.map((player, idx) => (
                <div key={player.id} className={`player-score ${gameState.winnerId === player.id ? 'winner' : ''}`}>
                  <div className="player-name">{player.name}</div>
                  <div className="score">{player.score}</div>
                  {idx === 0 && <div className="vs">VS</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Latest Round Result */}
          {latestRound && (
            <div className="round-result-popup">
              <div className="round-title">Round {latestRound.roundNumber}</div>
              <div className="round-moves">
                {Object.entries(latestRound.moves).map(([playerId, move]) => {
                  const player = gameState.players.find(p => p.id === playerId);
                  const isWinner = latestRound.winnerId === playerId;
                  return (
                    <div key={playerId} className={`move-display ${isWinner ? 'move-winner' : ''}`}>
                      <div className="move-icon">{MOVE_ICONS[move]}</div>
                      <div className="move-label">{player?.name}</div>
                      <div className="move-name">{move.toUpperCase()}</div>
                      {isWinner && <div className="win-badge">✨ WIN</div>}
                    </div>
                  );
                })}
              </div>
              <div className="round-commentary">
                {latestRound.commentary}
              </div>
            </div>
          )}

          {/* Round History */}
          {gameState.roundHistory.length > 0 && (
            <div className="round-history">
              <h3>Battle History</h3>
              <div className="history-list">
                {gameState.roundHistory.slice().reverse().map((round) => (
                  <div key={round.roundNumber} className="history-item">
                    <div className="history-round">Round {round.roundNumber}</div>
                    <div className="history-moves">
                      {Object.entries(round.moves).map(([playerId, move], index) => {
                        const player = gameState.players.find(p => p.id === playerId);
                        const isWinner = round.winnerId === playerId;
                        return (
                          <span key={playerId} className={isWinner ? 'history-winner' : ''}>
                            {index > 0 && ' 🆚 '}
                            {MOVE_ICONS[move]} {player?.name}
                          </span>
                        );
                      })}
                    </div>
                    <div className="history-result">
                      {round.winnerId === null ? '🤝 TIE' :
                        `🏆 ${gameState.players.find(p => p.id === round.winnerId)?.name}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Game Over */}
          {gameState.winnerId && (
            <div className="game-over">
              <h2>🎉 VICTORY!</h2>
              <div className="winner-name">
                {gameState.players.find(p => p.id === gameState.winnerId)?.name}
              </div>
              <div className="final-score">
                {gameState.players[0].score} - {gameState.players[1].score}
              </div>
              <div className="winner-prize">
                Won {prize.toFixed(4)} SOL!
              </div>
            </div>
          )}
        </div>
      )}

      {!gameState && agents.size > 0 && (
        <div className="waiting-room">
          <h3>Gladiators Assembled</h3>
          {Array.from(agents.values()).map((agent, idx) => (
            <div key={idx} className="agent-waiting">
              🤖 {agent.name} - {agent.status}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Arena;
