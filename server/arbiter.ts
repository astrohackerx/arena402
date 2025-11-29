import express from 'express';
import cors from 'cors';
import { createServer, createExpressMiddleware } from 'spl402';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { A2AClient } from '@a2a-js/sdk/client';
import { RockPaperScissorsGame } from './game.js';
import { config } from 'dotenv';

// Load environment variables from .env file
config({ path: '.env' });

const PORT = process.env.ARBITER_PORT || 3000;
const ENTRY_FEE = parseFloat(process.env.ENTRY_FEE || '0.001');
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const NETWORK = (process.env.SOLANA_NETWORK || 'devnet') as 'mainnet-beta' | 'devnet' | 'testnet';

const app = express();
app.use(cors());
app.use(express.json());

const connection = new Connection(RPC_URL, 'confirmed');

// Initialize wallet with validation
const privateKeyString = process.env.ARBITER_PRIVATE_KEY;
if (!privateKeyString || typeof privateKeyString !== 'string') {
  throw new Error('ARBITER_PRIVATE_KEY environment variable is not set or is not a string');
}
const wallet = Keypair.fromSecretKey(bs58.decode(privateKeyString));

console.log(`\n🏛️  ARENA402 ARBITER`);
console.log(`   Wallet: ${wallet.publicKey.toString()}`);
console.log(`   Network: ${NETWORK}`);
console.log(`   Entry Fee: ${ENTRY_FEE} SOL`);
console.log(`   Using: Official spl402 SDK + A2A SDK\n`);

const spl402Server = createServer({
  network: NETWORK,
  recipientAddress: wallet.publicKey.toString(),
  rpcUrl: RPC_URL,
  routes: [
    { path: '/register', price: ENTRY_FEE, method: 'POST' },
    { path: '/health', price: 0, method: 'GET' },
    { path: '/events', price: 0, method: 'GET' },
    { path: '/set-webhook', price: 0, method: 'POST' },
    { path: '/move', price: 0, method: 'POST' }
  ]
});

app.use(createExpressMiddleware(spl402Server));

interface PlayerInfo {
  name: string;
  wallet: string;
  paid: boolean;
  agentUrl?: string;
  a2aClient?: A2AClient;
}

const players = new Map<string, PlayerInfo>();
const games = new Map<string, RockPaperScissorsGame>();
const sseClients: express.Response[] = [];

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

app.post('/register', async (req, res) => {
  const { agentId, agentName, agentWallet, agentUrl } = req.body;

  if (!agentId || !agentName || !agentWallet) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (players.has(agentId)) {
    return res.status(400).json({ error: 'Agent already registered' });
  }

  console.log(`✅ ${agentName} registered (spl402 payment verified)`);
  console.log(`   Wallet: ${agentWallet.slice(0, 8)}...`);
  console.log(`   Paid: ${ENTRY_FEE} SOL`);

  let a2aClient: A2AClient | undefined;
  if (agentUrl) {
    try {
      console.log(`   A2A: Connecting to ${agentUrl}`);
      a2aClient = await A2AClient.fromCardUrl(`${agentUrl}/.well-known/agent-card.json`);
      console.log(`   A2A: Connected successfully`);
    } catch (error: any) {
      console.log(`   A2A: Failed to connect (${error.message}), will use webhooks`);
    }
  }
  console.log();

  players.set(agentId, {
    name: agentName,
    wallet: agentWallet,
    paid: true,
    agentUrl,
    a2aClient
  });

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
    setTimeout(() => startGame(), 2000);
  }
});

function startGame() {
  const gameId = `game-${Date.now()}`;
  const playerArray = Array.from(players.entries()).map(([id, data]) => ({
    id,
    name: data.name,
    wallet: data.wallet
  }));

  const game = new RockPaperScissorsGame(gameId, playerArray);
  games.set(gameId, game);
  game.start();

  broadcast('game_started', {
    gameId,
    players: playerArray.map(p => ({ ...p, score: 0 })),
    entryFee: ENTRY_FEE,
    gameType: 'rock-paper-scissors',
    maxRounds: 9,
    firstTo: 5
  });

  console.log(`🎮 Game ${gameId} started!`);
  console.log(`   Players: ${playerArray.map(p => p.name).join(' vs ')}\n`);

  // Send task to both players simultaneously (RPS both players move at once)
  playerArray.forEach(p => {
    sendTaskToPlayer(p.id, game.getPublicState());
  });
}

app.post('/set-webhook', (req, res) => {
  res.json({ success: true, message: 'Using A2A protocol instead of webhooks' });
});

async function sendTaskToPlayer(playerId: string, gameState: any) {
  const player = players.get(playerId);
  if (!player) {
    console.log(`⚠️  Player ${playerId} not found`);
    return;
  }

  try {
    console.log(`📤 Sending task to ${player.name}...`);
    
    // Send task to agent via webhook
    fetch(`${player.agentUrl}/task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameState: gameState,
        type: 'game_move',
        instruction: 'Choose your move: rock, paper, or scissors'
      })
    }).catch((error: any) => {
      console.error(`❌ Task send failed: ${error.message}`);
    });
  } catch (error: any) {
    console.error(`❌ Failed to send task: ${error.message}`);
  }
}

app.post('/move', (req, res) => {
  const { agentId, move, gameId } = req.body;

  if (!agentId || !move || !gameId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const game = games.get(gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const result = game.makeMove(agentId, move);

  if (!result.success) {
    return res.status(400).json({ error: result.result });
  }

  const state = game.getPublicState();
  const player = players.get(agentId);

  res.json({ success: true, result: result.result, roundComplete: result.roundComplete });

  // If round is complete, broadcast results
  if (result.roundComplete) {
    const lastRound = state.roundHistory[state.roundHistory.length - 1];
    const agent1 = state.players[0];
    const agent2 = state.players[1];

    if (lastRound && agent1 && agent2) {
      broadcast('round_result', {
        round: lastRound.roundNumber,
        agent1Move: lastRound.moves[agent1.id] || 'unknown',
        agent2Move: lastRound.moves[agent2.id] || 'unknown',
        winner: lastRound.winnerId === null ? 'TIE' : players.get(lastRound.winnerId!)?.name || 'unknown',
        score: {
          agent1: agent1.score,
          agent2: agent2.score
        }
      });
    }

    if (result.gameOver) {
      setTimeout(() => endGame(gameId), 2000);
    } else {
      // Start next round - send task to both players
      setTimeout(() => {
        const updatedState = game.getPublicState();
        updatedState.players.forEach((p: any) => {
          sendTaskToPlayer(p.id, updatedState);
        });
      }, 1500);
    }
  }
});

async function endGame(gameId: string) {
  const game = games.get(gameId);
  if (!game) return;

  const state = game.getState();
  const winner = players.get(state.winnerId!);

  if (!winner) {
    console.error('❌ Winner not found');
    return;
  }

  const prizeAmount = ENTRY_FEE * players.size * 0.95;

  console.log(`\n🏆 WINNER: ${winner.name}`);
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

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );

    console.log(`✅ Prize paid: ${signature.slice(0, 16)}...\n`);

    broadcast('game_over', {
      gameId,
      winnerId: state.winnerId,
      winner: winner.name,
      prize: prizeAmount.toString(),
      transactionId: signature,
      finalState: state
    });

  } catch (error: any) {
    console.error('❌ Prize payout failed:', error.message);
  }

  players.clear();
  games.delete(gameId);
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
    spl402: 'enabled'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Arbiter running on port ${PORT}`);
  console.log(`   Using spl402 SDK for payments`);
  console.log(`   Waiting for AI gladiators...\n`);
});
