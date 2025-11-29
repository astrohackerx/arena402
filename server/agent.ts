import express from 'express';
import OpenAI from 'openai';
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { config } from 'dotenv';

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

// Simple agent card endpoint
app.get('/.well-known/agent-card.json', (req, res) => {
  res.json({
    name: AGENT_NAME,
    description: `AI agent that plays Rock Paper Scissors using GPT-4 strategy`,
    url: `http://localhost:${AGENT_PORT}`,
    version: '1.0.0',
    capabilities: {
      streaming: false,
      stateTransitionHistory: true,
      pushNotifications: false
    }
  });
});

app.post('/task', async (req, res) => {
  try {
    const taskData = req.body;
    const { gameState } = taskData;

    console.log(`\n📥 Task received`);
    currentGameId = gameState.gameId;

    // Rock Paper Scissors - analyze history and make strategic choice
    const roundHistory = gameState.roundHistory || [];
    const myId = myAgentId;

    // Analyze opponent's patterns
    const opponentMoves = roundHistory
      .map((r: any) => {
        const opponentId = Object.keys(r.moves).find((id: string) => id !== myId);
        return opponentId ? r.moves[opponentId] : null;
      })
      .filter((m: unknown) => m !== null);

    const recentHistory = roundHistory.slice(-3).map((r: any) => {
      const moves = Object.entries(r.moves).map(([id, move]: [string, unknown]) => {
        const player = gameState.players.find((p: any) => p.id === id);
        return `${player?.name}: ${move}`;
      }).join(' vs ');
      const result = r.winnerId ? (r.winnerId === myId ? '✅ WIN' : '❌ LOSE') : '🤝 TIE';
      return `${moves} - ${result}`;
    }).join('\n');

    const score = gameState.players.find((p: any) => p.id === myId)?.score || 0;
    const opponentScore = gameState.players.find((p: any) => p.id !== myId)?.score || 0;

    const agentStrategy = AGENT_NAME === 'Agent1' 
      ? 'STRATEGY: Play DEFENSIVELY. Counter the opponent\'s most common move. Be predictable to confuse them.'
      : 'STRATEGY: Play AGGRESSIVELY. Make bold, unpredictable moves. Surprise them constantly.';

    const prompt = `You are an elite AI playing Rock Paper Scissors for cryptocurrency.

CURRENT GAME STATE:
- Round: ${gameState.round}/${gameState.maxRounds}
- Your Score: ${score}
- Opponent Score: ${opponentScore}
- You need 3 wins to take the prize!

OPPONENT'S RECENT MOVES:
${opponentMoves.length > 0 ? opponentMoves.slice(-5).join(', ') : 'No history yet'}

RECENT ROUNDS:
${recentHistory || 'First round'}

${agentStrategy}

RESPONSE: Choose rock, paper, or scissors based on your strategy.

Respond with ONLY ONE WORD: rock, paper, or scissors. Nothing else.`;

    console.log(`\n───────────────────────────────────`);
    console.log(`🤔 ${AGENT_NAME} analyzing patterns...`);
    console.log(`   Round ${gameState.round}/9 | Score: ${score} - ${opponentScore}`);
    console.log(`   Model: ${LLM_MODEL}`);

    const agentTemp = AGENT_NAME === 'Agent1' ? 0.3 : 0.7;
    const completion = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a strategic AI playing Rock Paper Scissors. Respond with ONLY ONE WORD: rock, paper, or scissors. Nothing else.'
        },
        {
          role: 'user',
          content: prompt
        },
      ],
      temperature: agentTemp,
      max_tokens: 10,
    });

    // Robustly extract the actual move word from the model response.
    // Models sometimes reply like "I choose rock." or "Rock!" — use a regex to find the move.
    let moveText = completion.choices[0]?.message?.content || '';
    const found = moveText.match(/\b(rock|paper|scissors)\b/i);
    let move = found ? found[1].toLowerCase() : '';

    const validMoves = ['rock', 'paper', 'scissors'];
    if (!validMoves.includes(move)) {
      console.log(`⚠️  Model response did not contain a valid move: "${moveText.replace(/\n/g, ' ')}"`);
      move = validMoves[Math.floor(Math.random() * 3)];
      console.log(`   Selected random move: ${move}`);
    }

    const moveIcons: Record<string, string> = { rock: '🪨', paper: '📄', scissors: '✂️' };
    console.log(`\n✅ ${moveIcons[move]} Decision: ${move.toUpperCase()}`);
    console.log(`───────────────────────────────────\n`);

    const moveResponse = await fetch(`${ARBITER_URL}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: myAgentId,
        gameId: currentGameId,
        move
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

    res.json({ move, result: moveResult });

  } catch (error: unknown) {
    const typedError = error as Record<string, unknown>;
    console.error(`❌ Error:`, typedError.message);
    res.status(500).json({ error: String(typedError.message) });
  }
});

// A2A message endpoint - handles requests from arbiter
app.post('/', async (req, res) => {
  try {
    const body = req.body as Record<string, any>;
    
    // Handle A2A protocol message format
    if (body.message && body.message.parts) {
      const textPart = body.message.parts.find((p: any) => p.kind === 'text');
      if (textPart?.text) {
        try {
          const taskData = JSON.parse(textPart.text);
          const { gameState } = taskData;

          console.log(`
📥 A2A Message received`);
          currentGameId = gameState.gameId;

          // Rock Paper Scissors - analyze history and make strategic choice
          const roundHistory = gameState.roundHistory || [];
          const myId = myAgentId;

          // Analyze opponent's patterns
          const opponentMoves = roundHistory
            .map((r: any) => {
              const opponentId = Object.keys(r.moves).find((id: string) => id !== myId);
              return opponentId ? r.moves[opponentId] : null;
            })
            .filter((m: unknown) => m !== null);

          const recentHistory = roundHistory.slice(-3).map((r: any) => {
            const moves = Object.entries(r.moves).map(([id, move]: [string, unknown]) => {
              const player = gameState.players.find((p: any) => p.id === id);
              return `${player?.name}: ${move}`;
            }).join(' vs ');
            const result = r.winnerId ? (r.winnerId === myId ? '✅ WIN' : '❌ LOSE') : '🤝 TIE';
            return `${moves} - ${result}`;
          }).join('\n');

          const score = gameState.players.find((p: any) => p.id === myId)?.score || 0;
          const opponentScore = gameState.players.find((p: any) => p.id !== myId)?.score || 0;

          const agentStrategy = AGENT_NAME === 'Agent1' 
            ? 'STRATEGY: Play DEFENSIVELY. Counter the opponent\'s most common move. Be predictable to confuse them.'
            : 'STRATEGY: Play AGGRESSIVELY. Make bold, unpredictable moves. Surprise them constantly.';

          const prompt = `You are an elite AI playing Rock Paper Scissors for cryptocurrency.

CURRENT GAME STATE:
- Round: ${gameState.round}/${gameState.maxRounds}
- Your Score: ${score}
- Opponent Score: ${opponentScore}
- You need 3 wins to take the prize!

OPPONENT'S RECENT MOVES:
${opponentMoves.length > 0 ? opponentMoves.slice(-5).join(', ') : 'No history yet'}

RECENT ROUNDS:
${recentHistory || 'First round'}

${agentStrategy}

RESPONSE: Choose rock, paper, or scissors based on your strategy.

Respond with ONLY ONE WORD: rock, paper, or scissors. Nothing else.`;

          console.log(`🤔 ${AGENT_NAME} thinking...`);
          console.log(`   Round ${gameState.round} | Score: ${score}-${opponentScore}`);
          const agentTemp = AGENT_NAME === 'Agent1' ? 0.3 : 0.7;
          const completion = await openai.chat.completions.create({
            model: LLM_MODEL,
            messages: [
              {
                role: 'system',
                content: 'You are a strategic AI playing Rock Paper Scissors. Respond with ONLY ONE WORD: rock, paper, or scissors. Nothing else.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: agentTemp,
            max_tokens: 10,
          })

          // Robustly extract the actual move word from the model response.
          let moveText = completion.choices[0]?.message?.content || '';
          const found = moveText.match(/\b(rock|paper|scissors)\b/i);
          let move = found ? found[1].toLowerCase() : '';

          const validMoves = ['rock', 'paper', 'scissors'];
          if (!validMoves.includes(move)) {
            console.log(`⚠️  Model response did not contain a valid move: "${moveText.replace(/\n/g, ' ')}"`);
            move = validMoves[Math.floor(Math.random() * 3)];
            console.log(`   Selected random move: ${move}`);
          }

          const moveIcons: Record<string, string> = { rock: '🪨', paper: '📄', scissors: '✂️' };
          console.log(`${moveIcons[move]} Chose: ${move}`);

          const moveResponse = await fetch(`${ARBITER_URL}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentId: myAgentId,
              gameId: currentGameId,
              move
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

          res.json({ success: true, move, result: moveResult });
        } catch (parseError) {
          console.error('Failed to parse A2A task:', parseError);
          res.status(400).json({ error: 'Invalid task format' });
        }
      } else {
        res.status(400).json({ error: 'No text content in A2A message' });
      }
    } else {
      res.status(400).json({ error: 'Invalid A2A message format' });
    }
  } catch (error: unknown) {
    const typedError = error as Record<string, unknown>;
    console.error(`❌ A2A Error:`, typedError.message);
    res.status(500).json({ error: String(typedError.message) });
  }
});

app.get('/capabilities', (req, res) => {
  res.json({
    capabilities: ['task.created'],
    protocols: ['a2a', 'spl402'],
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
      const balance = await connection.getBalance(wallet.publicKey);
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
        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [wallet],
          { commitment: 'confirmed' }
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
      const typedError = error as Record<string, unknown>;
      console.error(`❌ Setup error:`, typedError.message);
      console.error(`   Make sure Arbiter is running on ${ARBITER_URL}`);
    }
  }, 1000);
});
