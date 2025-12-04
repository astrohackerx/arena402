import { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { GameLayout } from './shared/GameLayout';
import { useGameConnection } from './shared/useGameConnection';
import { AnimatedRobot } from './AnimatedRobot';
import './ChessApp.css';

interface MoveHistoryItem {
  player: string;
  move: string;
  fen: string;
  commentary?: string;
}

interface AgentMessage {
  type: 'move' | 'commentary';
  text: string;
  timestamp: number;
  move?: string;
}

function getModelColor(modelName: string): string {
  const model = modelName.toLowerCase();
  if (model.includes('gpt')) return '#10a37f';
  if (model.includes('grok')) return '#1d9bf0';
  if (model.includes('claude')) return '#d97757';
  if (model.includes('llama')) return '#0467df';
  if (model.includes('gemini')) return '#8e75ff';
  if (model.includes('deepseek')) return '#00d4ff';
  return '#8b5cf6';
}

interface CoinAnimation {
  id: string;
  fromAgent: string;
  startTime: number;
}

interface PrizePing {
  id: string;
  timestamp: number;
}

interface PaymentNotification {
  id: string;
  agentName: string;
  amount: number;
  timestamp: number;
}

interface WinnerCoinAnimation {
  id: string;
  toAgent: string;
  startTime: number;
}

interface GameOverData {
  winnerId: string | null;
  draw?: boolean;
  winner?: string;
  prize?: string;
  players?: Array<{ id: string; name: string; prize: number }>;
  transactionId?: string;
  transactionIds?: string[];
}

function ChessApp() {
  const { gameState, connected, events } = useGameConnection();
  const [currentFen, setCurrentFen] = useState('start');
  const [agentMessages, setAgentMessages] = useState<Map<string, AgentMessage[]>>(new Map());
  const [coinAnimations, setCoinAnimations] = useState<CoinAnimation[]>([]);
  const [prizePings, setPrizePings] = useState<PrizePing[]>([]);
  const [paymentNotifications, setPaymentNotifications] = useState<PaymentNotification[]>([]);
  const [winnerCoinAnimations, setWinnerCoinAnimations] = useState<WinnerCoinAnimation[]>([]);
  const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);
  const [processedEventCount, setProcessedEventCount] = useState(0);
  const agent1MessagesRef = useRef<HTMLDivElement>(null);
  const agent2MessagesRef = useRef<HTMLDivElement>(null);
  const prizePoolRef = useRef<HTMLDivElement>(null);
  const agent1Ref = useRef<HTMLDivElement>(null);
  const agent2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameState?.fen) {
      setCurrentFen(gameState.fen);
    }
  }, [gameState]);

  useEffect(() => {
    if (!gameState?.moveHistory) return;

    const newMessages = new Map<string, AgentMessage[]>();

    gameState.moveHistory.forEach((item: MoveHistoryItem) => {
      const playerId = gameState.players.find((p: any) => p.name === item.player)?.id || item.player;
      const messages = newMessages.get(playerId) || [];

      messages.push({
        type: 'move',
        text: item.move,
        timestamp: Date.now(),
        move: item.move
      });

      if (item.commentary) {
        messages.push({
          type: 'commentary',
          text: item.commentary,
          timestamp: Date.now()
        });
      }

      newMessages.set(playerId, messages);
    });

    setAgentMessages(newMessages);
  }, [gameState?.moveHistory, gameState?.players]);

  useEffect(() => {
    if (agent1MessagesRef.current) {
      agent1MessagesRef.current.scrollTop = agent1MessagesRef.current.scrollHeight;
    }
    if (agent2MessagesRef.current) {
      agent2MessagesRef.current.scrollTop = agent2MessagesRef.current.scrollHeight;
    }
  }, [agentMessages]);

  useEffect(() => {
    if (!events || events.length === 0) return;
    if (events.length <= processedEventCount) return;

    // Process all new unprocessed events
    const unprocessedEvents = events.slice(processedEventCount);
    console.log(`ChessApp - Processing ${unprocessedEvents.length} new events from ${processedEventCount} to ${events.length}`);

    unprocessedEvents.forEach((event, index) => {
      console.log(`ChessApp - Event ${processedEventCount + index}:`, event.type, event);

      if (event.type === 'payment_made') {
        console.log('ChessApp - Creating payment notification for:', event.data);

        const coinId = `coin-${Date.now()}-${Math.random()}-${index}`;
        setCoinAnimations(prev => [...prev, {
          id: coinId,
          fromAgent: event.data.agentId,
          startTime: Date.now()
        }]);

        const agent = gameState?.players?.find((p: any) => p.id === event.data.agentId);
        const notificationId = `payment-${Date.now()}-${index}`;

        console.log('ChessApp - Agent found:', agent);

        setPaymentNotifications(prev => {
          const newNotifications = [...prev, {
            id: notificationId,
            agentName: agent?.name || 'Agent',
            amount: event.data.amount,
            timestamp: Date.now()
          }];
          console.log('ChessApp - Payment notifications:', newNotifications);
          return newNotifications;
        });

        setTimeout(() => {
          setPaymentNotifications(prev => prev.filter(n => n.id !== notificationId));
        }, 3000);

        // Add prize pool ping effect after coin arrives
        setTimeout(() => {
          const pingId = `ping-${Date.now()}-${index}`;
          setPrizePings(prev => [...prev, { id: pingId, timestamp: Date.now() }]);

          setTimeout(() => {
            setPrizePings(prev => prev.filter(p => p.id !== pingId));
          }, 600);
        }, 1200);

        setTimeout(() => {
          setCoinAnimations(prev => prev.filter(c => c.id !== coinId));
        }, 1500);
      }

      if (event.type === 'game_over') {
        console.log('ChessApp - Game over event:', event.data);
        setGameOverData(event.data);

        // Trigger coin animations from prize pool to winner(s)
        setTimeout(() => {
          if (event.data.draw && event.data.players) {
            // Draw: send coins to both players
            event.data.players.forEach((player: any, idx: number) => {
              const coinId = `winner-coin-${Date.now()}-${idx}`;
              setWinnerCoinAnimations(prev => [...prev, {
                id: coinId,
                toAgent: player.id,
                startTime: Date.now()
              }]);

              setTimeout(() => {
                setWinnerCoinAnimations(prev => prev.filter(c => c.id !== coinId));
              }, 2000);
            });
          } else if (event.data.winnerId) {
            // Winner: send coins to winner
            const coinId = `winner-coin-${Date.now()}`;
            setWinnerCoinAnimations(prev => [...prev, {
              id: coinId,
              toAgent: event.data.winnerId,
              startTime: Date.now()
            }]);

            setTimeout(() => {
              setWinnerCoinAnimations(prev => prev.filter(c => c.id !== coinId));
            }, 2000);
          }
        }, 500);
      }
    });

    setProcessedEventCount(events.length);
  }, [events, gameState, processedEventCount]);

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

  const isWhiteTurn = gameState.turn === 'white';

  const agent1Messages = agentMessages.get(whitePlayer?.id) || [];
  const agent2Messages = agentMessages.get(blackPlayer?.id) || [];

  const renderAgentPanel = (player: any, messages: AgentMessage[], isLeft: boolean, messagesRef: React.RefObject<HTMLDivElement>, agentRef: React.RefObject<HTMLDivElement>) => {
    const modelName = player?.modelName || player?.model || 'AI';
    const color = getModelColor(modelName);
    const isActive = gameState.status === 'active' &&
                     ((player?.id === whitePlayer?.id && isWhiteTurn) ||
                      (player?.id === blackPlayer?.id && !isWhiteTurn));

    const lastMessage = messages[messages.length - 1];
    const isSpeaking = lastMessage && (Date.now() - lastMessage.timestamp) < 3000;

    return (
      <div ref={agentRef} className={`agent-panel ${isLeft ? 'agent-left' : 'agent-right'} ${isActive ? 'active' : ''}`}>
        <div className="agent-header" style={{ borderColor: color }}>
          <div className="agent-avatar">
            <AnimatedRobot
              modelName={modelName}
              isThinking={isActive}
              isSpeaking={isSpeaking}
              size={120}
            />
          </div>
          <div className="agent-info">
            <h3 className="agent-name">{player?.name || 'Agent'} <span className="agent-model" style={{ color: color }}>{modelName}</span></h3>
            <div className="agent-color-badge" style={{ background: isLeft ? '#fff' : '#1a1a1a', color: isLeft ? '#000' : '#fff' }}>
              {isLeft ? '♔ White' : '♚ Black'}
            </div>
          </div>
        </div>

        <div className="agent-messages" ref={messagesRef}>
          {messages.length === 0 ? (
            <div className="no-messages">Waiting for first move...</div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.type}`} style={{ borderLeftColor: color }}>
                {msg.type === 'move' ? (
                  <div className="message-move">
                    <span className="move-label">Move:</span>
                    <span className="move-notation" style={{ background: `${color}22`, color: color }}>
                      {msg.text}
                    </span>
                  </div>
                ) : (
                  <div className="message-commentary">
                    <span className="commentary-icon">💭</span>
                    <span className="commentary-text">{msg.text}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="agent-stats">
          <div className="stat balance-stat">
            <span className="stat-label">💰 Balance</span>
            <span className="stat-value balance-value">{(player?.balance || 0).toFixed(4)} SOL</span>
          </div>
          <div className="stat spent-stat">
            <span className="stat-label">💸 Total Spent</span>
            <span className="stat-value spent-value">{(player?.totalSpent || 0).toFixed(4)} SOL</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <GameLayout
      connected={connected}
      gameTitle="Chess Battle"
      waiting={false}
    >
      <div className="chess-arena">
        {renderAgentPanel(whitePlayer, agent1Messages, true, agent1MessagesRef, agent1Ref)}

        <div className="board-center">
          <div className="board-status">
            <div className="round-info">
              <span className="round-label">Move</span>
              <span className="round-number">{gameState.round || 0}</span>
            </div>

            <div ref={prizePoolRef} className={`prize-pool ${prizePings.length > 0 ? 'prize-ping' : ''}`}>
              <span className="prize-label">🏆 Prize Pool</span>
              <span className="prize-amount">{(gameState.prizePool || 0).toFixed(4)} SOL</span>
            </div>

            <div className="turn-info" style={{
              background: isWhiteTurn ? 'rgba(255, 255, 255, 0.1)' : 'rgba(139, 92, 246, 0.2)',
              borderColor: isWhiteTurn ? 'rgba(255, 255, 255, 0.3)' : 'rgba(139, 92, 246, 0.4)'
            }}>
              <span className="turn-icon">{isWhiteTurn ? '♔' : '♚'}</span>
              <span className="turn-text">{isWhiteTurn ? 'White' : 'Black'}'s Turn</span>
            </div>
          </div>

          {coinAnimations.map(coin => {
            const isFromWhite = gameState.players[0]?.id === coin.fromAgent;

            // Calculate dynamic positions
            let translateX = 0;
            let translateY = 0;

            if (prizePoolRef.current && (isFromWhite ? agent1Ref.current : agent2Ref.current)) {
              const prizePoolRect = prizePoolRef.current.getBoundingClientRect();
              const agentRect = (isFromWhite ? agent1Ref.current : agent2Ref.current)!.getBoundingClientRect();

              // Calculate the distance from agent to prize pool
              translateX = prizePoolRect.left + prizePoolRect.width / 2 - agentRect.left - agentRect.width / 2;
              translateY = prizePoolRect.top + prizePoolRect.height / 2 - agentRect.top - 250; // 250 is the initial top offset
            }

            return (
              <div
                key={coin.id}
                className={`coin-animation ${isFromWhite ? 'from-left' : 'from-right'}`}
                style={{
                  textShadow: '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.6)',
                  '--target-x': `${translateX}px`,
                  '--target-y': `${translateY}px`
                } as React.CSSProperties}
              >
                🪙
              </div>
            );
          })}

          {winnerCoinAnimations.map(coin => {
            const isToWhite = gameState.players[0]?.id === coin.toAgent;
            const isToBlack = gameState.players[1]?.id === coin.toAgent;

            // Calculate dynamic positions
            let translateX = 0;
            let translateY = 0;

            if (prizePoolRef.current && ((isToWhite && agent1Ref.current) || (isToBlack && agent2Ref.current))) {
              const prizePoolRect = prizePoolRef.current.getBoundingClientRect();
              const agentRect = (isToWhite ? agent1Ref.current : agent2Ref.current)!.getBoundingClientRect();

              // Calculate the distance from prize pool to agent
              translateX = agentRect.left + agentRect.width / 2 - prizePoolRect.left - prizePoolRect.width / 2;
              translateY = agentRect.top + 100 - prizePoolRect.top - prizePoolRect.height / 2;
            }

            return (
              <div
                key={coin.id}
                className={`winner-coin-animation ${isToWhite ? 'to-left' : 'to-right'}`}
                style={{
                  textShadow: '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.6)',
                  '--target-x': `${translateX}px`,
                  '--target-y': `${translateY}px`
                } as React.CSSProperties}
              >
                🪙
              </div>
            );
          })}

          {paymentNotifications.map(notification => (
            <div key={notification.id} className="payment-notification">
              💰 {notification.agentName} paid {notification.amount.toFixed(4)} SOL
            </div>
          ))}

          <div className="board-wrapper">
            {gameState.isCheck && (
              <div className="game-alert check-alert">⚠️ CHECK!</div>
            )}
            {gameState.isCheckmate && (
              <div className="game-alert checkmate-alert">♔ CHECKMATE! ♔</div>
            )}

            <Chessboard
              position={currentFen}
              arePiecesDraggable={false}
              animationDuration={500}
              boardOrientation="white"
              customDarkSquareStyle={{ backgroundColor: '#8b5cf6' }}
              customLightSquareStyle={{ backgroundColor: '#f5f5f5' }}
              customBoardStyle={{
                borderRadius: '12px',
                boxShadow: '0 25px 70px rgba(139, 92, 246, 0.4)'
              }}
            />
          </div>

          {gameState.status === 'finished' && gameOverData && (
            <div className="game-over-overlay">
              <div className="game-over-banner">
                {gameOverData.draw ? (
                  <>
                    <div className="trophy-icon">🤝</div>
                    <h2>Draw!</h2>
                    <p className="game-over-subtitle">Prize pool split equally</p>
                    <div className="prize-distribution">
                      {gameOverData.players?.map((player) => (
                        <div key={player.id} className="player-prize">
                          <span className="player-prize-name">
                            {player.name}
                          </span>
                          <span className="player-prize-amount">
                            {player.prize.toFixed(4)} SOL
                          </span>
                        </div>
                      ))}
                    </div>
                    {gameOverData.transactionIds && (
                      <div className="transaction-links">
                        {gameOverData.transactionIds.map((txId, idx) => (
                          <a
                            key={idx}
                            href={`https://explorer.solana.com/tx/${txId}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transaction-link"
                          >
                            View Transaction {idx + 1} ↗
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="trophy-icon">🏆</div>
                    <h2>Game Over!</h2>
                    <p className="winner-name">
                      {gameOverData.winner} wins!
                    </p>
                    <div className="winner-prize">
                      <span className="winner-prize-label">Prize:</span>
                      <span className="winner-prize-amount">{gameOverData.prize} SOL</span>
                    </div>
                    {gameOverData.transactionId && (
                      <a
                        href={`https://explorer.solana.com/tx/${gameOverData.transactionId}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transaction-link"
                      >
                        View Transaction ↗
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {renderAgentPanel(blackPlayer, agent2Messages, false, agent2MessagesRef, agent2Ref)}
      </div>
    </GameLayout>
  );
}

export default ChessApp;
