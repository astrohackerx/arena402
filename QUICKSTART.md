# 🚀 Arena402 Quick Start

Get your AI chess battle running in 5 minutes!

## Prerequisites

- Node.js 18+
- Solana wallets with devnet SOL ([Get from faucet](https://faucet.solana.com/))
- OpenAI API key
- OpenRouter API key (for Grok)

## 1. Install Dependencies

```bash
npm install
cd web/chess && npm install && cd ../..
```

## 2. Setup Environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Solana Wallets (funded with devnet SOL)
SOLANA_NETWORK=devnet
ARBITER_WALLET=YOUR_ARBITER_PUBLIC_KEY
ARBITER_PRIVATE_KEY=YOUR_ARBITER_PRIVATE_KEY
AGENT1_WALLET=YOUR_AGENT1_PUBLIC_KEY
AGENT1_PRIVATE_KEY=YOUR_AGENT1_PRIVATE_KEY
AGENT2_WALLET=YOUR_AGENT2_PUBLIC_KEY
AGENT2_PRIVATE_KEY=YOUR_AGENT2_PRIVATE_KEY

# Agent 1: GPT (Analytical)
AGENT1_PROVIDER=openai
AGENT1_LLM_MODEL=gpt-4o
OPENAI_API_KEY=sk-your-openai-key

# Agent 2: Grok (Sarcastic)
AGENT2_PROVIDER=openrouter
AGENT2_LLM_MODEL=x-ai/grok-beta
OPENROUTER_API_KEY=sk-or-your-openrouter-key

# Game Configuration
GAME_TYPE=chess
ENTRY_FEE=0.001
```

## 3. Generate Wallets (if needed)

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Generate wallets
solana-keygen new --outfile arbiter-wallet.json
solana-keygen new --outfile agent1-wallet.json
solana-keygen new --outfile agent2-wallet.json

# Get public keys
solana-keygen pubkey arbiter-wallet.json
solana-keygen pubkey agent1-wallet.json
solana-keygen pubkey agent2-wallet.json

# Fund with devnet SOL
solana airdrop 1 ARBITER_WALLET --url devnet
solana airdrop 1 AGENT1_WALLET --url devnet
solana airdrop 1 AGENT2_WALLET --url devnet
```

## 4. Run Everything (4 Terminals)

### Terminal 1: Arbiter (Game Server)
```bash
npm run arbiter
```
Wait for: `🚀 Arbiter running on port 3000`

### Terminal 2: Agent 1 (GPT)
```bash
npm run agent1
```
Wait for: `✅ Registration complete!`

### Terminal 3: Agent 2 (Grok)
```bash
npm run agent2
```
Wait for: `🎮 Agent ready to battle!`

### Terminal 4: Web UI
```bash
npm run web:chess
```
Open: **http://localhost:5173**

## 5. Watch the Battle!

The UI will show:
- Live chess board with moves
- AI commentary (Grok roasts GPT)
- Player cards with model names
- Real-time game status

## Game Flow

1. Both agents pay 0.001 SOL entry fee
2. Arbiter verifies payments and starts game
3. Agents take turns making moves
4. Each move includes funny commentary
5. Winner gets 95% of prize pool (0.0019 SOL)

## Example Commentary

```
💬 Agent1 (gpt): "e4"
   "Classical opening theory. Controlling center with optimal development."

💬 Agent2 (grok): "e5"
   "Oh you went with e4? How original. Let me counter with the obvious."
```

## Switching Games

### Tic-Tac-Toe
```bash
# Edit .env
GAME_TYPE=tic-tac-toe

# Restart arbiter and run UI
npm run arbiter
npm run agent1
npm run agent2
npm run web:tictactoe  # http://localhost:5174
```

### Other Games (terminal only)
```bash
# Edit .env
GAME_TYPE=rock-paper-scissors  # or coin-flip

# Restart arbiter
npm run arbiter
npm run agent1
npm run agent2
```

## Troubleshooting

### "Insufficient funds"
```bash
solana airdrop 1 YOUR_WALLET --url devnet
```

### "Connection refused"
Make sure arbiter starts first, then agents.

### "Invalid API key"
Check your OpenAI and OpenRouter keys in `.env`.

### Web UI not showing game
Refresh page after both agents register.

### Agents not moving
Check agent console logs for LLM errors.

## Different LLM Models

Try different model combinations:

```bash
# Claude vs GPT
AGENT1_LLM_MODEL=gpt-4o
AGENT2_PROVIDER=openrouter
AGENT2_LLM_MODEL=anthropic/claude-3.5-sonnet

# Gemini vs Llama
AGENT1_PROVIDER=openrouter
AGENT1_LLM_MODEL=google/gemini-pro
AGENT2_LLM_MODEL=meta-llama/llama-3.1-405b
```

## Recording Matches

Perfect for viral content!

1. Open http://localhost:5173
2. Start screen recording (OBS, QuickTime, etc.)
3. Start agents (npm run agent1 & agent2)
4. Record entire match with commentary
5. Share on Twitter/YouTube: #Arena402 #Solana #spl402

## What's Next?

- Try different AI models
- Add new games (see CREATE_NEW_GAME.md)
- Increase entry fees for higher stakes
- Record and share epic battles

## Need Help?

- Check README.md for full documentation
- Review CREATE_NEW_GAME.md to add games
- Inspect logs in terminal for errors
- Ensure all wallets are funded

---

Ready to watch AI agents battle for SOL? Let's go! 🚀♔
