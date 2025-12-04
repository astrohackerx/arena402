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

function ChessApp() {
  const { gameState, connected, events } = useGameConnection();
  const [currentFen, setCurrentFen] = useState('start');
  const [agentMessages, setAgentMessages] = useState<Map<string, AgentMessage[]>>(new Map());
  const [coinAnimations, setCoinAnimations] = useState<CoinAnimation[]>([]);
  const [prizePings, setPrizePings] = useState<PrizePing[]>([]);
  const agent1MessagesRef = useRef<HTMLDivElement>(null);
  const agent2MessagesRef = useRef<HTMLDivElement>(null);

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
    if (!events) return;

    const lastEvent = events[events.length - 1];
    if (lastEvent?.type === 'payment_made') {
      const coinId = `coin-${Date.now()}-${Math.random()}`;
      setCoinAnimations(prev => [...prev, {
        id: coinId,
        fromAgent: lastEvent.data.agentId,
        startTime: Date.now()
      }]);

      // Add prize pool ping effect after coin arrives
      setTimeout(() => {
        const pingId = `ping-${Date.now()}`;
        setPrizePings(prev => [...prev, { id: pingId, timestamp: Date.now() }]);

        setTimeout(() => {
          setPrizePings(prev => prev.filter(p => p.id !== pingId));
        }, 600);
      }, 1200);

      setTimeout(() => {
        setCoinAnimations(prev => prev.filter(c => c.id !== coinId));
      }, 1500);
    }
  }, [events]);

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

  const renderAgentPanel = (player: any, messages: AgentMessage[], isLeft: boolean, messagesRef: React.RefObject<HTMLDivElement>) => {
    const modelName = player?.modelName || player?.model || 'AI';
    const color = getModelColor(modelName);
    const isActive = gameState.status === 'active' &&
                     ((player?.id === whitePlayer?.id && isWhiteTurn) ||
                      (player?.id === blackPlayer?.id && !isWhiteTurn));

    const lastMessage = messages[messages.length - 1];
    const isSpeaking = lastMessage && (Date.now() - lastMessage.timestamp) < 3000;

    return (
      <div className={`agent-panel ${isLeft ? 'agent-left' : 'agent-right'} ${isActive ? 'active' : ''}`}>
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
        {renderAgentPanel(whitePlayer, agent1Messages, true, agent1MessagesRef)}

        <div className="board-center">
          <div className="board-status">
            <div className="round-info">
              <span className="round-label">Move</span>
              <span className="round-number">{gameState.round || 0}</span>
            </div>

            <div className={`prize-pool ${prizePings.length > 0 ? 'prize-ping' : ''}`}>
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
            return (
              <div
                key={coin.id}
                className={`coin-animation ${isFromWhite ? 'from-left' : 'from-right'}`}
                style={{
                  textShadow: '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.6)'
                }}
              >
                🪙
              </div>
            );
          })}

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

          {gameState.status === 'finished' && (
            <div className="game-over-overlay">
              <div className="game-over-banner">
                <div className="trophy-icon">🏆</div>
                <h2>Game Over!</h2>
                <p className="winner-name">
                  {gameState.players.find((p: any) => p.id === gameState.winnerId)?.name} wins!
                </p>
              </div>
            </div>
          )}
        </div>

        {renderAgentPanel(blackPlayer, agent2Messages, false, agent2MessagesRef)}
      </div>
    </GameLayout>
  );
}

export default ChessApp;
