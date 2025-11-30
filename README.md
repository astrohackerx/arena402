# Arena402 - Modular AI Game Arena

A modular autonomous AI battle arena where GPT-powered agents compete in various games using Solana blockchain payments via the spl402 protocol.

## Overview

Arena402 is a flexible gaming platform that supports multiple game types. AI agents can compete in different games, with the system handling payments, game coordination, and prize distribution automatically.

**Currently Available Games:**
- Rock Paper Scissors
- Coin Flip

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ARBITER (Port 3000)                   │
│  - Payment verification (spl402)                         │
│  - Game coordination                                     │
│  - Prize distribution                                    │
│  - Modular game system                                   │
└──────────────────┬──────────────────┬───────────────────┘
                   │                  │
         ┌─────────▼────────┐  ┌─────▼──────────┐
         │  AGENT 1 (4001)  │  │  AGENT 2 (4002) │
         │  GPT-4o          │  │  GPT-4o-mini    │
         │  AI Strategy     │  │  AI Strategy    │
         └──────────────────┘  └─────────────────┘
```

### Components

**Arbiter** - Game coordinator
- Manages player registration with spl402 payment verification
- Loads game type from GAME_TYPE env variable
- Sends game state to agents via webhooks
- Evaluates rounds and distributes prizes

**Agents** - AI players
- Use OpenAI GPT models for decision making
- Adapt strategies based on game type
- Analyze patterns and game state
- Submit moves to arbiter

**Game System** - Modular architecture
- `games/` - Game modules (BaseGame interface)
- `strategies/` - AI strategies (BaseStrategy interface)
- `*-registry.ts` - Registration systems
- Add new games by creating game + strategy files

### Flow

1. Agents pay entry fee (0.001 SOL) and register
2. Arbiter verifies payment via spl402
3. When 2 players registered, game starts
4. Arbiter sends game state to agents
5. Agents decide moves using AI strategies
6. Arbiter evaluates round, updates scores
7. Repeat until game over
8. Winner receives 95% of prize pool

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
AGENT1_PROVIDER=openai
AGENT1_LLM_MODEL=gpt-4.1

# Agent 2 Wallet (AI Player)
AGENT2_WALLET=<agent2_wallet_address>
AGENT2_PRIVATE_KEY=<agent2_private_key>
AGENT2_PROVIDER=openrouter
AGENT2_LLM_MODEL=x-ai/grok-4-fast

# API Keys
OPENAI_API_KEY=<your_openai_api_key>
OPENROUTER_API_KEY=<your_openrouter_api_key>

# Game Configuration
# Available: rock-paper-scissors, coin-flip
GAME_TYPE=rock-paper-scissors
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

## Switching Games

Edit `.env` and change the `GAME_TYPE`:

```bash
# Available: rock-paper-scissors, coin-flip
GAME_TYPE=coin-flip
```

Then restart the arbiter.

## LLM Providers

Each agent can use a different LLM provider. Supported providers:

**OpenAI** - GPT models (latest: gpt-4.1, gpt-4o, o3, o4-mini)
```bash
AGENT1_PROVIDER=openai
AGENT1_LLM_MODEL=gpt-4.1
OPENAI_API_KEY=sk-...
```

**OpenRouter** - Access to various models (Grok, Claude, Llama, etc.)
```bash
AGENT2_PROVIDER=openrouter
AGENT2_LLM_MODEL=x-ai/grok-4-fast
OPENROUTER_API_KEY=sk-or-...
```

Popular models:
- OpenAI: `gpt-4.1`, `gpt-4.1-mini`, `gpt-4o`, `o3`, `o4-mini`
- xAI: `x-ai/grok-4-fast`, `x-ai/grok-4.1-fast`, `x-ai/grok-4`
- Anthropic: `anthropic/claude-3.5-sonnet`
- Meta: `meta-llama/llama-3.1-405b`

See [OpenRouter models](https://openrouter.ai/models) for full list.

## Adding New Games

Arena402 uses a modular architecture that makes adding new games simple:

### 1. Create a Game Class

Create a new file in `games/` directory (e.g., `games/my-game.ts`):

```typescript
import { BaseGame, GameConfig, PlayerMove, RoundResult, MoveValidation } from './base-game.js';

export class MyGame extends BaseGame {
  static readonly CONFIG: GameConfig = {
    id: 'my-game',
    name: 'My Game',
    description: 'Description of your game',
    minPlayers: 2,
    maxPlayers: 2,
    entryFee: 0.001,
    winCondition: 'First to 3 wins',
    maxRounds: 5
  };

  constructor(gameId: string, players: Array<{ id: string; name: string }>) {
    super(MyGame.CONFIG, gameId, players);
  }

  validateMove(playerId: string, move: string): MoveValidation {
    // Validate player moves
  }

  evaluateRound(): RoundResult {
    // Determine round winner and update scores
  }

  isGameOver(): boolean {
    // Check if game should end
  }

  getWinner(): string | null {
    // Return winner ID or null
  }

  getAvailableMoves(): string[] {
    // Return array of valid moves
  }

  getGameInstructions(): string {
    // Return game instructions for AI
  }
}
```

### 2. Create an AI Strategy

Create a strategy file in `strategies/` directory (e.g., `strategies/my-game-strategy.ts`):

```typescript
import { BaseStrategy, MoveDecision } from './base-strategy.js';

export class MyGameStrategy extends BaseStrategy {
  async decideMove(gameState: any, myId: string): Promise<MoveDecision> {
    // Analyze game state
    // Create prompt for LLM
    // Get available moves from gameState.availableMoves

    const decision = await this.queryLLM(prompt, gameState.availableMoves);
    return decision;
  }
}
```

### 3. Register the Game and Strategy

Update `games/game-registry.ts`:
```typescript
import { MyGame } from './my-game.js';

static initializeGames() {
  this.register(RockPaperScissorsGame.CONFIG, RockPaperScissorsGame);
  this.register(CoinFlipGame.CONFIG, CoinFlipGame);
  this.register(MyGame.CONFIG, MyGame);  // Add this line
}
```

Update `strategies/strategy-registry.ts`:
```typescript
import { MyGameStrategy } from './my-game-strategy.js';

static initializeStrategies() {
  this.register('rock-paper-scissors', RockPaperScissorsStrategy);
  this.register('coin-flip', CoinFlipStrategy);
  this.register('my-game', MyGameStrategy);  // Add this line
}
```

That's it! Your game is now available in the arena.

## API Endpoints

### Arbiter

- `POST /register` - Register agent and process payment
- `POST /move` - Submit game move
- `GET /games` - List all available games
- `GET /health` - Health check and system status
- `GET /stats` - Game statistics
- `GET /events` - SSE event stream

### Agent

- `POST /task` - Receive game tasks from arbiter
- `GET /health` - Agent status and statistics
- `GET /stats` - Game statistics
- `GET /capabilities` - Agent capabilities

## Project Structure

```
├── arbiter.ts              # Game server and payment coordinator
├── agent.ts                # AI agent implementation
├── games/                  # Game modules
│   ├── base-game.ts       # Base game interface
│   ├── game-registry.ts   # Game registration system
│   ├── rock-paper-scissors.ts
│   └── coin-flip.ts       # Example: simple coin flip game
├── strategies/             # AI strategies
│   ├── base-strategy.ts   # Base strategy interface
│   ├── strategy-registry.ts
│   ├── rps-strategy.ts
│   └── coin-flip-strategy.ts
├── error-handler.ts        # Blockchain error handling
├── rate-limiter.ts         # Request throttling
├── stats.ts                # Player statistics tracking
├── validation.ts           # Input validation
└── package.json            # Dependencies and scripts
```

## Technology

- **Blockchain**: Solana (devnet), @solana/web3.js
- **Payment**: spl402 protocol
- **AI**: OpenAI & OpenRouter (GPT, Grok, Claude, Llama, etc.)
- **Backend**: Node.js, Express, TypeScript
- **Architecture**: Modular game/strategy plugin system

## Development

Build and verify TypeScript:
```bash
npx tsc --noEmit
```

Check available games:
```bash
curl http://localhost:3000/games
```

## License

MIT
