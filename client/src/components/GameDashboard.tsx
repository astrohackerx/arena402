import { FC, useState, useEffect } from 'react';
import './GameDashboard.css';

interface Player {
  name: string;
  wallet: string;
  score: number;
  paid: boolean;
  transactionId?: string;
}

interface RoundResult {
  round: number;
  agent1Move: string;
  agent2Move: string;
  winner: string;
  score: { agent1: number; agent2: number };
}

interface LogEntry {
  timestamp: number;
  type: string;
  message: string;
  data?: any;
}

const GameDashboard: FC = () => {
  const [players, setPlayers] = useState<Map<string, Player>>(new Map());
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [winner, setWinner] = useState<string>('');
  const [prizeInfo, setPrizeInfo] = useState<{ amount: string; tx: string }>({ amount: '', tx: '' });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);

  const MOVE_ICONS: Record<string, string> = {
    rock: '🪨',
    paper: '📄',
    scissors: '✂️'
  };

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:3000/events');
    setConnected(true);

    const handleEvent = (eventName: string) => (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        const now = new Date();
        const timeStr = now.toLocaleTimeString();

        // Log the event
        const logEntry: LogEntry = {
          timestamp: Date.now(),
          type: eventName,
          message: `[${timeStr}] ${eventName.toUpperCase()}`,
          data
        };
        setLogs(prev => [logEntry, ...prev].slice(0, 50));

        // Handle different event types
        switch (eventName) {
          case 'player_joined':
            setPlayers(prev => {
              const updated = new Map(prev);
              updated.set(data.name, {
                name: data.name,
                wallet: data.wallet,
                score: 0,
                paid: true,
                transactionId: data.transactionId
              });
              return updated;
            });
            break;

          case 'game_started':
            setGameStarted(true);
            setGameEnded(false);
            setRoundResults([]);
            setCurrentRound(0);
            setWinner('');
            setPrizeInfo({ amount: '', tx: '' });
            break;

          case 'round_result':
            setCurrentRound(data.round);
            setRoundResults(prev => [
              ...prev,
              {
                round: data.round,
                agent1Move: data.agent1Move,
                agent2Move: data.agent2Move,
                winner: data.winner,
                score: data.score
              }
            ]);

            // Update player scores
            if (data.score) {
              setPlayers(prev => {
                const updated = new Map(prev);
                const players_array = Array.from(updated.values());
                if (players_array.length >= 1) {
                  players_array[0].score = data.score.agent1;
                }
                if (players_array.length >= 2) {
                  players_array[1].score = data.score.agent2;
                }
                players_array.forEach(p => updated.set(p.name, p));
                return updated;
              });
            }
            break;

          case 'game_over':
            setGameEnded(true);
            setWinner(data.winner);
            setPrizeInfo({
              amount: data.prize || '0',
              tx: data.transactionId || ''
            });
            break;
        }
      } catch (error) {
        console.error('Error parsing event:', error);
      }
    };

    eventSource.addEventListener('player_joined', handleEvent('player_joined'));
    eventSource.addEventListener('game_started', handleEvent('game_started'));
    eventSource.addEventListener('round_result', handleEvent('round_result'));
    eventSource.addEventListener('game_over', handleEvent('game_over'));
    
    eventSource.onerror = () => {
      console.error('SSE connection error');
      setConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, []);

  const getExplorerLink = (txId: string) => {
    return `https://explorer.solana.com/tx/${txId}?cluster=devnet`;
  };

  const getTxLink = (txId?: string) => {
    if (!txId || txId === 'pending') return null;
    return getExplorerLink(txId);
  };

  const formatSol = (amount: string) => {
    const num = parseFloat(amount);
    return num.toFixed(6);
  };

  const playersArray = Array.from(players.values());
  const agent1 = playersArray[0];
  const agent2 = playersArray[1];

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="logo-section">
          <h1>⚔️ ARENA402</h1>
          <p className="tagline">Agent-to-Agent Economy on SPL402</p>
        </div>
        <div className="status-badge">
          <div className={`connection-dot ${connected ? 'connected' : 'disconnected'}`}></div>
          <span>{connected ? 'Live' : 'Disconnected'}</span>
        </div>
      </header>

      <div className="dashboard-container">
        {/* SPL402 Payment Verification Section */}
        <section className="spl402-section">
          <h2>💳 SPL402 Payment Verification</h2>
          <div className="spl402-info">
            <p className="spl402-desc">
              Both agents have verified their participation through SPL402 micropayment protocol.
              Entry fee validates participation without traditional payment gateways.
            </p>
            <div className="payments-grid">
              {agent1 ? (
                <div className="payment-card">
                  <div className="agent-name">{agent1.name}</div>
                  <div className="payment-status">
                    <span className="status-check">✅</span>
                    <span className="status-text">Payment Verified</span>
                  </div>
                  <div className="payment-amount">0.001 SOL</div>
                  <div className="wallet-display">
                    <span className="label">Wallet:</span>
                    <code>{agent1.wallet.slice(0, 8)}...{agent1.wallet.slice(-8)}</code>
                  </div>
                  {agent1.transactionId && agent1.transactionId !== 'pending' && getTxLink(agent1.transactionId) && (
                    <a 
                      href={getTxLink(agent1.transactionId)!} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="explorer-link"
                    >
                      🔗 View on Solana Explorer
                    </a>
                  )}
                </div>
              ) : (
                <div className="payment-card waiting">
                  <div className="waiting-text">Waiting for Agent 1...</div>
                </div>
              )}

              {agent2 ? (
                <div className="payment-card">
                  <div className="agent-name">{agent2.name}</div>
                  <div className="payment-status">
                    <span className="status-check">✅</span>
                    <span className="status-text">Payment Verified</span>
                  </div>
                  <div className="payment-amount">0.001 SOL</div>
                  <div className="wallet-display">
                    <span className="label">Wallet:</span>
                    <code>{agent2.wallet.slice(0, 8)}...{agent2.wallet.slice(-8)}</code>
                  </div>
                  {agent2.transactionId && agent2.transactionId !== 'pending' && getTxLink(agent2.transactionId) && (
                    <a 
                      href={getTxLink(agent2.transactionId)!} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="explorer-link"
                    >
                      🔗 View on Solana Explorer
                    </a>
                  )}
                </div>
              ) : (
                <div className="payment-card waiting">
                  <div className="waiting-text">Waiting for Agent 2...</div>
                </div>
              )}
            </div>
            <div className="registration-counter">
              Registered: <span className={`counter ${playersArray.length === 2 ? 'complete' : ''}`}>
                {playersArray.length}/2
              </span>
              {gameStarted && <span className="game-active">Game Active ⚡</span>}
            </div>
          </div>
        </section>

        {/* Agent Decision Making Section */}
        {gameStarted && !gameEnded && (
          <section className="decision-section">
            <h2>🧠 Agent Decision Making</h2>
            <div className="decision-info">
              <p className="decision-desc">
                Agents analyze game state and make autonomous decisions. Each move is timestamped and verified on blockchain.
              </p>
              {roundResults.length > 0 && (
                <div className="current-round">
                  <h3>Round {currentRound}</h3>
                  <div className="moves-display">
                    <div className="agent-move">
                      <div className="agent-label">{agent1?.name}</div>
                      <div className="move-icon">{MOVE_ICONS[roundResults[roundResults.length - 1]?.agent1Move?.toLowerCase()] || '❓'}</div>
                      <div className="move-text">{roundResults[roundResults.length - 1]?.agent1Move}</div>
                    </div>
                    <div className="vs-divider">VS</div>
                    <div className="agent-move">
                      <div className="agent-label">{agent2?.name}</div>
                      <div className="move-icon">{MOVE_ICONS[roundResults[roundResults.length - 1]?.agent2Move?.toLowerCase()] || '❓'}</div>
                      <div className="move-text">{roundResults[roundResults.length - 1]?.agent2Move}</div>
                    </div>
                  </div>
                  <div className="round-result">
                    {roundResults[roundResults.length - 1]?.winner === 'TIE' 
                      ? '🤝 TIE' 
                      : `🏆 ${roundResults[roundResults.length - 1]?.winner} WINS!`}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Scoreboard & Results */}
        {gameStarted && (
          <section className="scoreboard-section">
            <h2>📊 Scoreboard</h2>
            <div className="scoreboard">
              <div className={`score-card ${agent1?.score > agent2?.score ? 'leading' : ''}`}>
                <div className="agent-name">{agent1?.name || 'Agent 1'}</div>
                <div className="score-display">{agent1?.score || 0}</div>
                <div className="score-label">Wins</div>
              </div>
              <div className="divider-text">vs</div>
              <div className={`score-card ${agent2?.score > agent1?.score ? 'leading' : ''}`}>
                <div className="agent-name">{agent2?.name || 'Agent 2'}</div>
                <div className="score-display">{agent2?.score || 0}</div>
                <div className="score-label">Wins</div>
              </div>
            </div>
          </section>
        )}

        {/* Game Over & Prize Distribution */}
        {gameEnded && (
          <section className="game-over-section">
            <h2>🎉 Game Over</h2>
            <div className="winner-display">
              <h3 className="winner-name">🏆 {winner} WINS! 🏆</h3>
              <div className="prize-section">
                <h4>Prize Distribution</h4>
                <div className="prize-info">
                  <div className="prize-amount">
                    <span className="currency">SOL</span>
                    <span className="amount">{formatSol(prizeInfo.amount)}</span>
                  </div>
                  {prizeInfo.tx && prizeInfo.tx !== '' && (
                    <a 
                      href={getExplorerLink(prizeInfo.tx)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="explorer-link prize-link"
                    >
                      🔗 View Prize Payout on Solana Explorer
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Round History */}
        {roundResults.length > 0 && (
          <section className="history-section">
            <h2>📜 Round History</h2>
            <div className="history-list">
              {roundResults.slice().reverse().map((result, idx) => (
                <div key={idx} className={`history-entry ${result.winner === 'TIE' ? 'tie' : ''}`}>
                  <div className="round-num">Round {result.round}</div>
                  <div className="moves">
                    <span className="move">{MOVE_ICONS[result.agent1Move?.toLowerCase()] || '❓'} {result.agent1Move}</span>
                    <span className="vs">vs</span>
                    <span className="move">{MOVE_ICONS[result.agent2Move?.toLowerCase()] || '❓'} {result.agent2Move}</span>
                  </div>
                  <div className={`result ${result.winner === 'TIE' ? 'tie' : 'win'}`}>
                    {result.winner === 'TIE' ? '🤝 TIE' : `🏆 ${result.winner} wins`}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Event Log */}
        <section className="log-section">
          <h2>📋 Event Log</h2>
          <div className="log-entries">
            {logs.length === 0 ? (
              <div className="log-placeholder">Waiting for events...</div>
            ) : (
              logs.map((entry, idx) => (
                <div key={idx} className={`log-entry log-${entry.type}`}>
                  <span className="log-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  <span className="log-type">[{entry.type}]</span>
                  <span className="log-message">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default GameDashboard;
