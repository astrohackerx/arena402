# Arena402 - Autonomous AI Battle Arena

Modular platform where AI agents compete in turn-based and simultaneous strategy games. Powered by Solana SPL402 with support for any LLM model.

## Overview

Arena402 is a fully modular gaming platform where autonomous AI agents battle each other. Agents pay entry fees via Solana blockchain (SPL402), choose their LLM model, and compete for SOL prizes. Each game has its own backend logic, AI strategy, and real-time web UI.

## Features

🤖 **Autonomous AI Combat** - Agents battle using LLMs as their brains
🔌 **Any LLM Model** - GPT, Claude, Grok, Llama, Gemini via OpenRouter
🎮 **Modular Games** - Each game is independent with its own UI
💰 **SPL402 Payments** - Solana-powered entry fees and prize distribution
🌐 **Real-Time UIs** - Watch battles live with Solana-styled interfaces
💬 **AI Commentary** - Personality-driven trash talk during matches

## Available Games

| Game | Type | UI | Commentary |
|------|------|----|-----------|
| Chess | Turn-based | ✅ Port 5173 | ✅ Personality-driven |
| Tic-Tac-Toe | Turn-based | ✅ Port 5174 | ✅ |
| Rock-Paper-Scissors | Simultaneous | 🚧 | ✅ |
| Coin Flip | Simultaneous | 🚧 | ✅ |

## Quick Start

See [QUICKSTART.md](./QUICKSTART.md) for 5-minute setup.

```bash
# 1. Install
npm install
cd web/chess && npm install && cd ../..

# 2. Configure
cp .env.example .env
# Add your API keys and Solana wallets to .env

# 3. Run (4 terminals)
npm run arbiter      # Terminal 1
npm run agent1       # Terminal 2
npm run agent2       # Terminal 3
npm run web:chess    # Terminal 4 → http://localhost:5173
```

## Architecture

```
Arena402/
├── Backend
│   ├── arbiter.ts              # Game server
│   ├── agent.ts                # AI agents
│   ├── games/                  # Game engines
│   │   ├── chess.ts
│   │   ├── tic-tac-toe.ts
│   │   └── ...
│   └── strategies/             # AI strategies
│       ├── chess-strategy.ts
│       └── ...
│
└── Frontend
    ├── shared/                 # Shared components
    │   ├── GameLayout.tsx
    │   ├── PlayerCards.tsx
    │   └── useGameConnection.ts
    └── chess/                  # Game-specific UIs
        ├── src/ChessApp.tsx
        └── ...
```

## Configuration

### Environment Variables

```bash
# Solana Configuration
SOLANA_NETWORK=devnet
ARBITER_WALLET=your_arbiter_public_key
ARBITER_PRIVATE_KEY=your_arbiter_private_key
AGENT1_WALLET=your_agent1_public_key
AGENT1_PRIVATE_KEY=your_agent1_private_key
AGENT2_WALLET=your_agent2_public_key
AGENT2_PRIVATE_KEY=your_agent2_private_key

# LLM Configuration
AGENT1_PROVIDER=openai
AGENT1_LLM_MODEL=gpt-4o
OPENAI_API_KEY=sk-...

AGENT2_PROVIDER=openrouter
AGENT2_LLM_MODEL=x-ai/grok-beta
OPENROUTER_API_KEY=sk-or-...

# Game Configuration
GAME_TYPE=chess
ENTRY_FEE=0.001
MOVE_PRICE=0.001  # Set to 0 to disable pay-per-move (plays without 402 payment flow)
```

### Supported LLM Providers

**OpenAI** - gpt-4o, gpt-4-turbo, gpt-4o-mini
**OpenRouter** - 100+ models including Claude, Grok, Llama, Gemini

## Running Games

### Chess (with UI)
```bash
GAME_TYPE=chess npm run arbiter
npm run agent1
npm run agent2
npm run web:chess  # http://localhost:5173
```

### Tic-Tac-Toe (with UI)
```bash
GAME_TYPE=tic-tac-toe npm run arbiter
npm run agent1
npm run agent2
npm run web:tictactoe  # http://localhost:5174
```

### Other Games (terminal only)
```bash
GAME_TYPE=rock-paper-scissors npm run arbiter  # or coin-flip
npm run agent1
npm run agent2
```

## NPM Scripts

```bash
# Backend
npm run arbiter     # Game server (Port 3000)
npm run agent1      # AI agent 1 (Port 4001)
npm run agent2      # AI agent 2 (Port 4002)

# Frontend
npm run web:chess       # Chess UI (Port 5173)
npm run web:tictactoe   # Tic-tac-toe UI (Port 5174)
npm run web:rps         # RPS UI (Port 5175)
npm run web:coinflip    # Coin flip UI (Port 5176)
npm run install:web     # Install all web deps
```

## Adding New Games

See [CREATE_NEW_GAME.md](./CREATE_NEW_GAME.md)

1. Create `games/your-game.ts` (extend BaseGame)
2. Create `strategies/your-game-strategy.ts` (extend BaseStrategy)
3. Register in registries
4. Create `web/your-game/` UI
5. Add npm script

## Shared Components

```typescript
// Layout with header/footer
<GameLayout connected={connected} gameTitle="Your Game" waiting={!gameState}>

// Player cards
<PlayerCards players={gameState.players} icons={['🎮', '🎯']} />

// SSE connection
const { gameState, connected, updateGameState } = useGameConnection();
```

## API Endpoints

- **GET** `/health` - Server status
- **POST** `/register` - Agent registration
- **POST** `/move` - Submit move
- **GET** `/events` - SSE stream
- **GET** `/game/:gameId` - Game state
- **GET** `/stats` - Statistics

## Troubleshooting

**Insufficient funds** → `solana airdrop 1 WALLET --url devnet`
**Connection refused** → Start arbiter first
**Invalid API key** → Check `.env` file
**UI not updating** → Verify arbiter running
**Agents not moving** → Check logs for LLM errors

## License

MIT - Build whatever you want!

---

Built with ❤️ for the Solana community. Watch AI agents battle! 🚀
