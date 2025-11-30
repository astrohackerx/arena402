import express from 'express';
import OpenAI from 'openai';
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { config } from 'dotenv';
import { decideMove, logMoveDecision } from './agent-strategy.js';
import { safeGetBalance, safeSendTransaction, handleBlockchainError } from './error-handler.js';
import { createRateLimiter } from './rate-limiter.js';

// Load environment variables
config({ path: '.env' });

const AGENT_NAME = process.env.AGENT_NAME || 'Agent';
const AGENT_PORT = parseInt(process.env.AGENT_PORT as string) || 4001;
const ARBITER_URL = process.env.ARBITER_URL || 'http://localhost:3000';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const LLM_MODEL = AGENT_NAME === 'Agent1' 
  ? (process.env.AGENT1_LLM_MODEL || 'gpt-4o') 
  : (process.env.AGENT2_LLM_MODEL || 'gpt-4o-mini');

const walletKey = AGENT_NAME === 'Agent1' ? 'AGENT1_PRIVATE_KEY' : 'AGENT2_PRIVATE_KEY';
const connection = new Connection(RPC_URL, 'confirmed');
const wallet = Keypair.fromSecretKey(bs58.decode(process.env[walletKey]!));
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

console.log(`\n🤖 ${AGENT_NAME}`);
console.log(`   Wallet: ${wallet.publicKey.toString()}`);
console.log(`   Port: ${AGENT_PORT}`);
console.log(`   Model: ${LLM_MODEL}`);
console.log(`   Strategy: AI + Pattern Analysis\n`);

const app = express();
app.use(express.json());

const rateLimiter = createRateLimiter(60, 60000);
app.use(rateLimiter.middleware());

let currentGameId: string | null = null;
let myAgentId: string | null = null;
let myStats = {
  totalGuesses: 0,
  gamesPlayed: 0,
  wins: 0,
  averageGuesses: 0,
  totalPaid: 0,
  totalWon: 0
};


async function handleGameTask(gameState: any): Promise<{ move: string; result: any }> {
  if (!myAgentId) {
    throw new Error('Agent not registered');
  }

  currentGameId = gameState.gameId;

  const score = gameState.players.find((p: any) => p.id === myAgentId)?.score || 0;
  const opponentScore = gameState.players.find((p: any) => p.id !== myAgentId)?.score || 0;

  const decision = await decideMove(openai, gameState, myAgentId, AGENT_NAME, LLM_MODEL);
  logMoveDecision(AGENT_NAME, decision.move, gameState.round, `Round ${gameState.round}/9 | Score: ${score} - ${opponentScore} | Model: ${LLM_MODEL}`);

  const moveResponse = await fetch(`${ARBITER_URL}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: myAgentId,
      gameId: currentGameId,
      move: decision.move
    })
  });

  const moveResult: unknown = await moveResponse.json();
  const typedResult = moveResult as Record<string, unknown>;

  if (typedResult.success) {
    myStats.totalGuesses++;

    if (typedResult.roundComplete) {
      console.log(`\n⏳ Waiting for results...\n`);
    }
  }

  return { move: decision.move, result: moveResult };
}

app.post('/task', async (req, res) => {
  try {
    const taskData = req.body;
    const { gameState } = taskData;

    if (!gameState) {
      return res.status(400).json({ error: 'Missing gameState' });
    }

    console.log(`\n📥 Task received`);
    const result = await handleGameTask(gameState);
    res.json(result);

  } catch (error: unknown) {
    const errorMessage = handleBlockchainError(error, 'Task Handler');
    res.status(500).json({ error: errorMessage });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    agent: AGENT_NAME,
    wallet: wallet.publicKey.toString(),
    stats: myStats
  });
});

app.get('/capabilities', (req, res) => {
  res.json({
    capabilities: ['task.created'],
    protocols: ['webhook', 'spl402'],
    version: '1.0.0',
    agent: AGENT_NAME
  });
});

app.get('/stats', (req, res) => {
  res.json({
    agent: AGENT_NAME,
    wallet: wallet.publicKey.toString(),
    stats: myStats
  });
});

app.listen(AGENT_PORT, async () => {
  console.log(`🚀 ${AGENT_NAME} server running on port ${AGENT_PORT}`);
  console.log(`   Agent Card: http://localhost:${AGENT_PORT}/.well-known/agent-card.json\n`);

  setTimeout(async () => {
    try {
      console.log(`💰 Checking wallet balance...`);
      const balance = await safeGetBalance(connection, wallet.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      console.log(`   Balance: ${solBalance.toFixed(4)} SOL\n`);

      if (balance < 0.002 * LAMPORTS_PER_SOL) {
        console.log(`⚠️  LOW BALANCE! Need at least 0.002 SOL`);
        console.log(`   Run: solana airdrop 0.1 ${wallet.publicKey.toString()} --url devnet\n`);
        return;
      }

      console.log(`🔗 Registering with Arbiter...`);
      console.log(`   Payment will be handled by spl402 middleware\n`);

      const registerPayload = {
        agentId: `agent-${AGENT_PORT}`,
        agentName: AGENT_NAME,
        agentWallet: wallet.publicKey.toString(),
        agentUrl: `http://localhost:${AGENT_PORT}`
      };

      const response = await fetch(`${ARBITER_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerPayload)
      });

      if (response.status === 402) {
        // spl402 returns a body like: { message: 'Payment required', payment: { amount, recipient, ... } }
        const body: unknown = await response.json();
        const requirement = (body as Record<string, any>)?.payment;
        if (!requirement) {
          console.log(`💳 spl402: 402 Payment Required but no payment details returned`);
          return;
        }
        console.log(`💳 spl402: 402 Payment Required`);
        console.log(`   Amount: ${requirement.amount} SOL`);
        console.log(`   Recipient: ${String(requirement.recipient).slice(0, 8)}...`);

        const lamports = Math.floor(Number(requirement.amount) * LAMPORTS_PER_SOL);
        const recipientPubkey = new PublicKey(String(requirement.recipient));

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: recipientPubkey,
            lamports
          })
        );

        console.log(`\n💸 Sending payment...`);
        const signature = await safeSendTransaction(
          connection,
          transaction,
          [wallet],
          'registration payment'
        );

        console.log(`✅ Payment sent: ${signature.slice(0, 16)}...`);

        // Build spl402 payment object as expected by middleware
        const payment = {
          spl402Version: 1,
          scheme: requirement.scheme || 'transfer',
          network: requirement.network,
          payload: {
            from: wallet.publicKey.toBase58(),
            to: requirement.recipient,
            amount: requirement.amount,
            signature,
            timestamp: Date.now()
          }
        };

        const retryResponse = await fetch(`${ARBITER_URL}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Payment': JSON.stringify(payment)
          },
          body: JSON.stringify(registerPayload)
        });

        const result: unknown = await retryResponse.json();
        const typedResult = result as Record<string, unknown>;
        myAgentId = (typedResult.playerId as string) || registerPayload.agentId;

        console.log(`✅ Registration complete!`);
        console.log(`   Player ID: ${myAgentId} (using response.playerId or fallback to sent agentId)\n`);
      } else if (response.ok) {
        const result: unknown = await response.json();
        const typedResult = result as Record<string, unknown>;
        myAgentId = (typedResult.playerId as string) || registerPayload.agentId;
        console.log(`✅ Registration complete!`);
        console.log(`   Player ID: ${myAgentId} (using response.playerId or fallback to sent agentId)\n`);
      } else {
        const error: unknown = await response.json();
        const typedError = error as Record<string, unknown>;
        console.log(`❌ Registration failed: ${typedError.error || 'Unknown error'}`);
        return;
      }

      console.log(`🎮 Agent ready to battle!\n`);

    } catch (error: unknown) {
      handleBlockchainError(error, 'Agent Setup');
      console.error(`   Make sure Arbiter is running on ${ARBITER_URL}`);
    }
  }, 1000);
});
