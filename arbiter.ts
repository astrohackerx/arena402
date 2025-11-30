import express from 'express';
import cors from 'cors';
import { createServer, createExpressMiddleware } from 'spl402';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { BaseGame } from './games/base-game.js';
import { GameRegistry } from './games/game-registry.js';
import { config } from 'dotenv';
import { validateRegistration, validateMoveRequest, ValidationError } from './validation.js';
import { safeSendTransaction, handleBlockchainError } from './error-handler.js';
import { createRateLimiter } from './rate-limiter.js';
import { StatsTracker } from './stats.js';

// Load environment variables from .env file
config({ path: '.env' });

const PORT = process.env.ARBITER_PORT || 3000;
const ENTRY_FEE = parseFloat(process.env.ENTRY_FEE || '0.001');
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const NETWORK = (process.env.SOLANA_NETWORK || 'devnet') as 'mainnet-beta' | 'devnet' | 'testnet';
const GAME_TYPE = process.env.GAME_TYPE || 'rock-paper-scissors';

const app = express();
app.use(cors());
app.use(express.json());

const generalLimiter = createRateLimiter(100, 60000);
const registrationLimiter = createRateLimiter(5, 300000);
const moveLimiter = createRateLimiter(30, 60000);

app.use(generalLimiter.middleware());

const connection = new Connection(RPC_URL, 'confirmed');

// Initialize wallet with validation
const privateKeyString = process.env.ARBITER_PRIVATE_KEY;
if (!privateKeyString || typeof privateKeyString !== 'string') {
  throw new Error('ARBITER_PRIVATE_KEY environment variable is not set or is not a string');
}
const wallet = Keypair.fromSecretKey(bs58.decode(privateKeyString));

const gameConfig = GameRegistry.getConfig(GAME_TYPE);
if (!gameConfig) {
  throw new Error(`Invalid GAME_TYPE in .env: ${GAME_TYPE}. Available: ${GameRegistry.getAllGames().map(g => g.id).join(', ')}`);
}

console.log(`\n🏛️  ARENA402 ARBITER`);
console.log(`   Wallet: ${wallet.publicKey.toString()}`);
console.log(`   Network: ${NETWORK}`);
console.log(`   Entry Fee: ${ENTRY_FEE} SOL`);
console.log(`   Game: ${gameConfig.name}`);
console.log(`   Using: Official spl402 SDK\n`);

const spl402Server = createServer({
  network: NETWORK,
  recipientAddress: wallet.publicKey.toString(),
  rpcUrl: RPC_URL,
  routes: [
    { path: '/register', price: ENTRY_FEE, method: 'POST' },
    { path: '/health', price: 0, method: 'GET' },
    { path: '/games', price: 0, method: 'GET' },
    { path: '/events', price: 0, method: 'GET' },
    { path: '/set-webhook', price: 0, method: 'POST' },
    { path: '/move', price: 0, method: 'POST' },
    { path: '/stats', price: 0, method: 'GET' }
  ]
});

app.use(createExpressMiddleware(spl402Server));

interface PlayerInfo {
  name: string;
  wallet: string;
  paid: boolean;
  agentUrl?: string;
  modelName?: string;
}

interface GameSession {
  game: BaseGame;
  gameType: string;
  players: string[];
}

const players = new Map<string, PlayerInfo>();
const games = new Map<string, GameSession>();
const sseClients: express.Response[] = [];
const statsTracker = new StatsTracker();

function broadcast(event: string, data: any) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(message);
    } catch (e) {
      console.error('Failed to broadcast to client');
    }
  });
}

app.post('/register', registrationLimiter.middleware(), async (req, res) => {
  try {
    const validated = validateRegistration(req.body);
    const { agentId, agentName, agentWallet, agentUrl } = validated;
    const modelName = req.body.modelName || 'unknown';

    if (players.has(agentId)) {
      return res.status(400).json({ error: 'Agent already registered' });
    }

    if (players.size >= 2) {
      return res.status(400).json({ error: 'Game is full. Please wait for next round.' });
    }

    console.log(`✅ ${agentName} (${modelName}) registered (spl402 payment verified)`);
    console.log(`   Wallet: ${agentWallet.slice(0, 8)}...`);
    console.log(`   Paid: ${ENTRY_FEE} SOL`);

    console.log();

    players.set(agentId, {
      name: agentName,
      wallet: agentWallet,
      paid: true,
      agentUrl,
      modelName
    });

    statsTracker.initializePlayer(agentId, agentName, ENTRY_FEE);

    broadcast('player_joined', {
      name: agentName,
      agentId,
      wallet: agentWallet,
      transactionId: req.body.payment?.signature || 'pending',
      playerCount: players.size
    });

    res.json({
      success: true,
      message: 'Registration successful',
      playerId: agentId
    });

    if (players.size === 2) {
      setTimeout(() => startGame(GAME_TYPE), 2000);
    }
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message, field: error.field });
    }
    const errorMessage = handleBlockchainError(error, 'Registration');
    res.status(500).json({ error: errorMessage });
  }
});

function startGame(gameType: string = GAME_TYPE) {
  const gameId = `game-${Date.now()}`;
  const playerArray = Array.from(players.entries()).map(([id, data]) => ({
    id,
    name: data.name,
    modelName: data.modelName
  }));

  const game = GameRegistry.createGame(gameType, gameId, playerArray);
  if (!game) {
    console.error(`Failed to create game of type: ${gameType}`);
    return;
  }

  const gameConfig = game.getConfig();
  games.set(gameId, { game, gameType, players: playerArray.map(p => p.id) });

  broadcast('game_started', {
    gameId,
    gameType,
    gameName: gameConfig.name,
    players: playerArray.map(p => ({ ...p, score: 0 })),
    entryFee: ENTRY_FEE,
    maxRounds: gameConfig.maxRounds,
    winCondition: gameConfig.winCondition
  });

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🎮 GAME STARTED! ${gameConfig.name}`);
  console.log(`   Game ID: ${gameId}`);
  const playerNames = playerArray.map(p => {
    const playerInfo = players.get(p.id);
    return playerInfo?.modelName ? `${p.name} (${playerInfo.modelName})` : p.name;
  }).join(' vs ');
  console.log(`   Players: ${playerNames}`);
  console.log(`   ${gameConfig.winCondition} | Max ${gameConfig.maxRounds} rounds`);
  console.log(`${'═'.repeat(70)}\n`);

  const gameState = game.getPublicState();

  if (game.isTurnBased() && gameState.currentTurn) {
    sendTaskToPlayer(gameState.currentTurn, gameState);
  } else {
    playerArray.forEach(p => {
      sendTaskToPlayer(p.id, gameState);
    });
  }
}

app.post('/set-webhook', (req, res) => {
  res.json({ success: true, message: 'Webhook-based communication enabled' });
});

async function sendTaskToPlayer(playerId: string, gameState: any) {
  const player = players.get(playerId);
  if (!player) {
    console.log(`⚠️  Player ${playerId} not found`);
    return;
  }

  const taskPayload = {
    gameState: gameState,
    type: 'game_move',
    instruction: gameState.instructions || 'Make your move'
  };

  try {
    const displayName = player.modelName ? `${player.name} (${player.modelName})` : player.name;
    console.log(`📤 Sending task to ${displayName}...`);

    if (player.agentUrl) {
      await fetch(`${player.agentUrl}/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskPayload)
      });
      console.log(`   ✅ Task sent via webhook`);
    } else {
      console.log(`   ⚠️  No agent URL configured`);
    }
  } catch (error: any) {
    console.error(`❌ Failed to send task: ${error.message}`);
  }
}

app.post('/move', moveLimiter.middleware(), (req, res) => {
  try {
    const validated = validateMoveRequest(req.body);
    const { agentId, move, gameId } = validated;

    const gameSession = games.get(gameId);
    if (!gameSession) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const { game } = gameSession;
    const moveResult = game.submitMove(agentId, move);

    if (!moveResult.success) {
      return res.status(400).json({ error: moveResult.error });
    }

    const state = game.getPublicState();
    const roundComplete = moveResult.roundCompleted || false;

    res.json({ success: true, roundComplete, gameOver: game.getStatus() === 'finished' });

    if (roundComplete) {
      const lastRound = state.history[state.history.length - 1];

      if (lastRound) {
        state.players.forEach((p: any) => {
          if (lastRound.winnerId === null) {
            statsTracker.recordRound(p.id, 'tie');
          } else if (lastRound.winnerId === p.id) {
            statsTracker.recordRound(p.id, 'win');
          } else {
            statsTracker.recordRound(p.id, 'lose');
          }
        });

        broadcast('round_result', {
          round: state.round,
          moves: lastRound.moves,
          winner: lastRound.winnerId ? players.get(lastRound.winnerId)?.name : 'TIE',
          scores: state.players.map((p: any) => ({ id: p.id, score: p.score }))
        });
      }

      if (game.getStatus() === 'finished') {
        setTimeout(() => endGame(gameId), 2000);
      } else {
        setTimeout(() => {
          const updatedState = game.getPublicState();
          gameSession.players.forEach(playerId => {
            sendTaskToPlayer(playerId, updatedState);
          });
        }, 1500);
      }
    } else {
      setTimeout(() => {
        const updatedState = game.getPublicState();

        if (game.isTurnBased() && updatedState.currentTurn) {
          sendTaskToPlayer(updatedState.currentTurn, updatedState);
        } else {
          gameSession.players.forEach(playerId => {
            sendTaskToPlayer(playerId, updatedState);
          });
        }
      }, 500);
    }
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message, field: error.field });
    }
    const errorMessage = handleBlockchainError(error, 'Move Handler');
    res.status(500).json({ error: errorMessage });
  }
});

const endingGames = new Set<string>();

async function endGame(gameId: string) {
  if (endingGames.has(gameId)) {
    return;
  }
  endingGames.add(gameId);

  const gameSession = games.get(gameId);
  if (!gameSession) {
    endingGames.delete(gameId);
    return;
  }

  const { game } = gameSession;
  const state = game.getPublicState();
  const winnerId = state.winnerId;

  if (!winnerId) {
    console.error('❌ No winner determined');
    endingGames.delete(gameId);
    return;
  }

  const winner = players.get(winnerId);
  if (!winner) {
    console.error('❌ Winner not found');
    endingGames.delete(gameId);
    return;
  }

  const prizeAmount = ENTRY_FEE * players.size * 0.95;
  const loserIds = state.players.filter((p: any) => p.id !== winnerId).map((p: any) => p.id);

  const winnerDisplay = winner.modelName ? `${winner.name} (${winner.modelName})` : winner.name;
  console.log(`\n🏆 WINNER: ${winnerDisplay}`);
  console.log(`💰 Prize: ${prizeAmount} SOL`);

  try {
    const recipientPubkey = new PublicKey(winner.wallet);
    const lamports = Math.floor(prizeAmount * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: recipientPubkey,
        lamports
      })
    );

    const signature = await safeSendTransaction(
      connection,
      transaction,
      [wallet],
      'prize payout'
    );

    console.log(`✅ Prize paid: ${signature.slice(0, 16)}...\n`);

    if (loserIds.length > 0) {
      statsTracker.recordGameEnd(winnerId, loserIds[0], prizeAmount, state.round);
    }

    broadcast('game_over', {
      gameId,
      winnerId,
      winner: winner.name,
      prize: prizeAmount.toString(),
      transactionId: signature,
      finalState: state
    });

  } catch (error: any) {
    handleBlockchainError(error, 'Prize Payout');
  } finally {
    players.clear();
    games.delete(gameId);
    endingGames.delete(gameId);
  }
}

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  sseClients.push(res);

  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  req.on('close', () => {
    const index = sseClients.indexOf(res);
    if (index > -1) sseClients.splice(index, 1);
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    wallet: wallet.publicKey.toString(),
    players: players.size,
    games: games.size,
    network: NETWORK,
    entryFee: ENTRY_FEE,
    spl402: 'enabled',
    gameType: GAME_TYPE
  });
});

app.get('/games', (req, res) => {
  res.json({
    availableGames: GameRegistry.getAllGames(),
    currentGame: GAME_TYPE
  });
});

app.get('/stats', (req, res) => {
  const { agentId } = req.query;

  if (agentId && typeof agentId === 'string') {
    const stats = statsTracker.getPlayerStats(agentId);
    if (!stats) {
      return res.status(404).json({ error: 'Player not found' });
    }
    return res.json(stats);
  }

  res.json({
    allPlayers: statsTracker.getAllStats(),
    leaderboard: statsTracker.getLeaderboard()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Arbiter running on port ${PORT}`);
  console.log(`   Using spl402 SDK for payments`);
  console.log(`   Waiting for AI gladiators...\n`);
});
