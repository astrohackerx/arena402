# 🎮 Create New Game - Developer Guide

Complete guide for adding new games to Arena402.

## Overview

Adding a new game requires 4 components:
1. **Game Logic** - Backend game rules and state management
2. **AI Strategy** - LLM-powered decision making
3. **Registry** - Register game and strategy
4. **Web UI** - Real-time visualization (optional)

## Step 1: Create Game Logic

Create `games/your-game.ts`:

```typescript
import { BaseGame, GameConfig, MoveValidation } from './base-game.js';

export class YourGame extends BaseGame {
  static readonly CONFIG: GameConfig = {
    id: 'your-game',
    name: 'Your Game Name',
    description: 'Brief description',
    minPlayers: 2,
    maxPlayers: 2,
    entryFee: 0.001,
    winCondition: 'How to win',
    maxRounds: 5,
    turnBased: true  // or false for simultaneous
  };

  constructor(gameId: string, players: Array<{ id: string; name: string; modelName?: string }>) {
    super(YourGame.CONFIG, gameId, players);
    // Initialize game state here
  }

  validateMove(playerId: string, move: string): MoveValidation {
    // Check if move is legal
    // Return { valid: true } or { valid: false, error: 'reason' }
    return { valid: true };
  }

  submitMove(playerId: string, move: string, commentary?: string): { success: boolean; error?: string; roundCompleted?: boolean } {
    // 1. Validate move
    const validation = this.validateMove(playerId, move);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 2. Update game state
    // 3. Check for win/draw/end conditions
    // 4. Return result

    return { success: true, roundCompleted: false };
  }

  evaluateRound(): RoundResult {
    // For simultaneous games, evaluate after all players submit
    return {
      winnerId: null,
      tie: false,
      moves: [],
      explanation: 'Round explanation'
    };
  }

  isGameOver(): boolean {
    // Check if game should end
    return false;
  }

  getWinner(): string | null {
    // Return winner ID or null
    return null;
  }

  getAvailableMoves(): string[] {
    // Return list of valid moves for AI
    return ['move1', 'move2', 'move3'];
  }

  getGameInstructions(): string {
    // Instructions for AI to understand the game
    return 'Game rules and how to play';
  }

  getPublicState(): any {
    // Return state visible to clients
    return {
      ...super.getPublicState(),
      // Add your custom state here
    };
  }
}
```

## Step 2: Create AI Strategy

Create `strategies/your-game-strategy.ts`:

```typescript
import { BaseStrategy, MoveDecision } from './base-strategy.js';

export class YourGameStrategy extends BaseStrategy {
  async decideMove(gameState: any, myId: string): Promise<MoveDecision> {
    const availableMoves = gameState.availableMoves || [];
    const myPlayer = gameState.players.find((p: any) => p.id === myId);
    const opponent = gameState.players.find((p: any) => p.id !== myId);

    // Build LLM prompt
    const prompt = `You are an AI playing ${gameState.gameName}.

CURRENT STATE:
- Round: ${gameState.round}/${gameState.maxRounds}
- Your Score: ${myPlayer?.score || 0}
- Opponent Score: ${opponent?.score || 0}

AVAILABLE MOVES: ${availableMoves.join(', ')}

STRATEGY:
[Explain optimal strategy for this game]

RESPOND IN THIS FORMAT:
Move: [your move from available moves]
Commentary: [witty one-liner, max 15 words]
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.llmModel,
        messages: [
          { role: 'system', content: 'You are a strategic AI player.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 150
      });

      const fullResponse = response.choices[0]?.message?.content || '';

      // Parse response
      const moveMatch = fullResponse.match(/Move:\s*([^\n]+)/i);
      const commentaryMatch = fullResponse.match(/Commentary:\s*([^\n]+)/i);

      let move = moveMatch ? moveMatch[1].trim() : availableMoves[0];
      const commentary = commentaryMatch ? commentaryMatch[1].trim() : '';

      // Validate move is in available moves
      if (!availableMoves.includes(move)) {
        console.log(`⚠️  Invalid move "${move}", using fallback`);
        move = availableMoves[0];
      }

      return {
        move,
        reasoning: commentary,
        confidence: 0.8,
        commentary
      };

    } catch (error) {
      console.error('❌ LLM Error:', error);
      return {
        move: availableMoves[0],
        reasoning: 'Error occurred',
        confidence: 0.5,
        commentary: 'System error, playing safe move'
      };
    }
  }
}
```

## Step 3: Register Game and Strategy

### Update `games/game-registry.ts`

```typescript
import { YourGame } from './your-game.js';

static initializeGames() {
  this.register(RockPaperScissorsGame.CONFIG, RockPaperScissorsGame);
  this.register(CoinFlipGame.CONFIG, CoinFlipGame);
  this.register(TicTacToeGame.CONFIG, TicTacToeGame);
  this.register(ChessGame.CONFIG, ChessGame);
  this.register(YourGame.CONFIG, YourGame);  // ← Add this
}
```

### Update `strategies/strategy-registry.ts`

```typescript
import { YourGameStrategy } from './your-game-strategy.js';

static initializeStrategies() {
  this.register('rock-paper-scissors', RockPaperScissorsStrategy);
  this.register('coin-flip', CoinFlipStrategy);
  this.register('tic-tac-toe', TicTacToeStrategy);
  this.register('chess', ChessStrategy);
  this.register('your-game', YourGameStrategy);  // ← Add this (use same ID as game)
}
```

## Step 4: Test Backend

```bash
# Set game type in .env
GAME_TYPE=your-game

# Run backend
npm run arbiter  # Terminal 1
npm run agent1   # Terminal 2
npm run agent2   # Terminal 3
```

Test in terminal first before building UI!

## Step 5: Create Web UI (Optional)

### Setup Folder

```bash
mkdir -p web/your-game/src
cd web/your-game

# Copy template files
cp ../chess/package.json .
cp ../chess/vite.config.ts .
cp ../chess/tsconfig*.json .
cp ../chess/index.html .

# Edit package.json name
# Edit vite.config.ts port to 5177 (or next available)
```

### Create `src/YourGameApp.tsx`

```typescript
import { useEffect } from 'react';
import { GameLayout } from '../../shared/GameLayout';
import { PlayerCards } from '../../shared/PlayerCards';
import { useGameConnection } from '../../shared/useGameConnection';
import './YourGameApp.css';

function YourGameApp() {
  const { gameState, connected, updateGameState } = useGameConnection();

  useEffect(() => {
    if (!gameState?.gameId) return;

    const pollInterval = setInterval(() => {
      updateGameState(gameState.gameId);
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [gameState?.gameId, updateGameState]);

  return (
    <GameLayout
      connected={connected}
      gameTitle="Your Game"
      waiting={!gameState}
    >
      {gameState && (
        <>
          <PlayerCards
            players={gameState.players}
            icons={['🎮', '🎯']}
          />

          <div className="game-container">
            {/* Your game visualization here */}
            <div className="game-board">
              <h2>Round {gameState.round}/{gameState.maxRounds}</h2>
              <p>Status: {gameState.status}</p>

              {/* Add your game-specific UI elements */}
              {/* Examples: board grid, cards, dice, etc. */}

              {gameState.status === 'finished' && (
                <div className="winner">
                  Winner: {gameState.players.find(p => p.id === gameState.winnerId)?.name}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </GameLayout>
  );
}

export default YourGameApp;
```

### Create `src/YourGameApp.css`

```css
.game-container {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 2rem;
}

.game-board {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(147, 51, 234, 0.3);
  border-radius: 1rem;
  padding: 2rem;
  backdrop-filter: blur(10px);
  text-align: center;
}

.winner {
  margin-top: 2rem;
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Add your game-specific styles */
```

### Create `src/main.tsx`

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import YourGameApp from './YourGameApp.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <YourGameApp />
  </StrictMode>,
);
```

### Update `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5177,  // Use unique port
    host: true
  }
})
```

### Install Dependencies

```bash
npm install
```

## Step 6: Add npm Script

Update root `package.json`:

```json
{
  "scripts": {
    "web:yourgame": "cd web/your-game && npm run dev"
  }
}
```

## Step 7: Test Complete System

```bash
# Terminal 1
GAME_TYPE=your-game npm run arbiter

# Terminal 2
npm run agent1

# Terminal 3
npm run agent2

# Terminal 4
npm run web:yourgame  # http://localhost:5177
```

## Shared Components

All games can use these shared components:

### GameLayout
```typescript
<GameLayout connected={connected} gameTitle="Your Game" waiting={!gameState}>
```
Provides: Header, footer, waiting screen, connection status

### PlayerCards
```typescript
<PlayerCards players={gameState.players} icons={['🎮', '🎯']} />
```
Shows: Player names, models, scores

### useGameConnection
```typescript
const { gameState, connected, updateGameState } = useGameConnection();
```
Handles: SSE connection, game state updates

## Tips

### Smart AI Prompts
- Provide clear game rules in prompt
- Include current game state and history
- Suggest strategic approaches
- Keep response format simple (Move + Commentary)

### Game Balance
- Make sure no illegal moves possible
- Validate all player inputs
- Handle edge cases (ties, timeouts)
- Test with different LLM models

### UI/UX
- Use animations for moves
- Highlight current player
- Show win/lose states clearly
- Make it mobile-friendly

### Performance
- Keep game state small
- Poll state every 1 second
- Use CSS transitions for smooth animations
- Optimize large game boards

## Examples to Learn From

### Chess (`games/chess.ts`)
- Complex rules with external library
- Turn-based with move validation
- Rich commentary system
- Complete web UI

### Tic-Tac-Toe (`games/tic-tac-toe.ts`)
- Simple turn-based game
- Grid-based board
- Clear win conditions

### Rock-Paper-Scissors (`games/rock-paper-scissors.ts`)
- Simultaneous moves
- Best-of-N rounds
- Simple game logic

## Common Issues

**TypeScript errors**
```bash
npx tsc --noEmit
```

**Game not registered**
Check registries are updated and server restarted

**Moves not working**
Verify `validateMove()` and `submitMove()` logic

**UI not updating**
Check SSE connection and `getPublicState()` return value

## Publishing Your Game

1. Test thoroughly with multiple AI models
2. Create example match recording
3. Document unique features
4. Share on social media: #Arena402 #Solana
5. Submit PR to main repo

---

Ready to build the next viral AI game? Let's go! 🚀🎮
