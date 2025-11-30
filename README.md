# Arena402 - AI Rock Paper Scissors

An autonomous AI battle arena where GPT-powered agents compete in Rock Paper Scissors using Solana blockchain payments via the spl402 protocol.

## How It Works

### Architecture

**Arbiter (Game Server)**
- Runs the game server on port 3000
- Manages player registration with spl402 payment verification
- Coordinates matches between AI agents
- Handles prize distribution via Solana transactions
- Enforces game rules and scoring

**Agents (AI Players)**
- Each agent runs on its own port (4001, 4002)
- Uses OpenAI GPT models for strategic decision making
- Analyzes opponent patterns and game history
- Automatically pays entry fees using spl402
- Receives game tasks via webhooks

**Communication Flow**
1. Agents register with the arbiter by paying the entry fee (0.001 SOL)
2. Arbiter verifies payment through spl402 protocol
3. Game starts when two agents are registered
4. Arbiter sends game state to agents via webhook
5. Agents analyze the situation using AI and submit moves
6. Arbiter determines winner and distributes prize pool

### Game Rules

- First to 5 wins takes the match (maximum 9 rounds)
- Entry fee: 0.001 SOL per agent
- Winner receives 95% of prize pool (0.0019 SOL)
- Arbiter keeps 5% service fee
- Ties don't count toward score

### AI Strategy

Each agent uses:
- **Pattern recognition** - analyzes opponent's previous moves
- **Adaptive strategy** - adjusts based on game state and score
- **GPT intelligence** - different models for different playing styles
- **Move history** - tracks full game progression for decision making

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file with the following:

```bash
# Solana Network
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# Arbiter (Game Server) Wallet
ARBITER_WALLET=<your_arbiter_wallet_address>
ARBITER_PRIVATE_KEY=<your_arbiter_private_key>
ARBITER_PORT=3000

# Agent 1 Wallet (AI Player)
AGENT1_WALLET=<agent1_wallet_address>
AGENT1_PRIVATE_KEY=<agent1_private_key>
AGENT1_LLM_MODEL=gpt-4o

# Agent 2 Wallet (AI Player)
AGENT2_WALLET=<agent2_wallet_address>
AGENT2_PRIVATE_KEY=<agent2_private_key>
AGENT2_LLM_MODEL=gpt-4o-mini

# OpenAI API Key
OPENAI_API_KEY=<your_openai_api_key>

# Game Configuration
ENTRY_FEE=0.001
ARBITER_URL=http://localhost:3000
```

### Wallet Setup

1. Generate three Solana wallets (arbiter + 2 agents)
2. Fund all wallets with devnet SOL using [Solana faucet](https://faucet.solana.com/)
3. Add wallet addresses and private keys to `.env`

## Launch

Open three terminal windows and run:

**Terminal 1 - Start Arbiter:**
```bash
npm run arbiter
```

**Terminal 2 - Start Agent 1:**
```bash
npm run agent1
```

**Terminal 3 - Start Agent 2:**
```bash
npm run agent2
```

The game will automatically start when both agents are registered and paid.

## Technology Stack

- **Blockchain**: Solana (devnet)
- **Payment Protocol**: spl402
- **AI Models**: OpenAI GPT-4o / GPT-4o-mini
- **Backend**: Node.js + Express + TypeScript
- **Wallet**: @solana/web3.js
- **Communication**: Webhook-based task distribution

## API Endpoints

### Arbiter

- `POST /register` - Register agent and process payment
- `POST /move` - Submit game move
- `GET /health` - Health check

### Agent

- `POST /task` - Receive game tasks from arbiter
- `GET /health` - Agent status and statistics
- `GET /stats` - Game statistics
- `GET /capabilities` - Agent capabilities

## Project Structure

```
├── arbiter.ts           # Game server and payment coordinator
├── agent.ts             # AI agent implementation
├── agent-strategy.ts    # AI decision-making logic
├── game.ts              # Rock Paper Scissors game logic
├── error-handler.ts     # Blockchain error handling
├── rate-limiter.ts      # Request throttling
├── stats.ts             # Player statistics tracking
├── validation.ts        # Input validation
└── package.json         # Dependencies and scripts
```

## Development

Build and verify TypeScript:
```bash
npx tsc --noEmit
```

## License

MIT
