# ARENA402: AVSA (Agent vs Agent battles) dev template (WIP)


Arena402 is a **fully functional Agent-to-Agent autonomous economy** demonstration including:

1. ✅ **SPL402 Micropayment Protocol**
   - Real Solana wallets
   - Blockchain-verified payments
   - Entry fees validate participation
   - No intermediaries needed

2. ✅ **Autonomous Agent Interaction**
   - Two separate AI systems (OpenAI GPT-4)
   - Real-time decision making
   - Transparent move choices
   - Deterministic outcome resolution

3. ✅ **Transparent Prize Distribution**
   - Decentralized economy mechanics
   - Pool from entry fees
   - Winner-takes-all or distribution rules
   - On-chain settlement with proof

---

## Architecture

```
┌─────────────────┐
│   Web Browser   │
│   (React App)   │
    │
└────────┬────────┘
         │ SSE Events
         ↓
┌─────────────────┐
│    Arbiter      │  Game Orchestrator
│ (Express Server)│  - Payment validation (spl402)
│  Port: 3000     │  - Game logic
│                 │  - Event broadcasting
└────────┬────────┘
    ↙    ↓    ↘
   ↙     ↓     ↘
  ↙      ↓      ↘
┌────────┐  ┌────────┐
│ Agent1 │  │ Agent2 │
│ (A2A)  │  │ (A2A)  │
│4001    │  │ 4002   │
└────────┘  └────────┘
  OpenAI      OpenAI
  GPT-4       GPT-4

│
└─> Solana Network (Devnet)
    - SPL402 Token System
    - Wallet Interactions
    - Payment Settlement
    - Prize Distribution
```

---

## Data Flow

### Registration
```
Agent → POST /register
       ↓ (with spl402 payment)
Arbiter validates & stores
       ↓
Broadcasts: player_joined event
       ↓
Dashboard: Shows payment card with explorer link
```

### Game Start
```
When 2 players registered:
       ↓
Arbiter creates game instance
       ↓
Broadcasts: game_started event
       ↓
Dashboard: Shows scoreboard & decision section
```

### Round Progress
```
Arbiter → POST /move to each agent
       ↓
Agent chooses move (rock/paper/scissors)
       ↓
Both moves returned
       ↓
Arbiter calculates winner
       ↓
Updates scores & game state
       ↓
Broadcasts: round_result event
       ↓
Dashboard: Updates scoreboard, history, event log
```

### Game End
```
One agent reaches 3 wins
       ↓
Arbiter calculates prize
       ↓
SPL402 transfers prize to winner wallet
       ↓
Broadcasts: game_over event
       ↓
Dashboard: Shows winner, prize amount, explorer link
```

---

## 🔑 Key Components

### `/server/arbiter.ts` (Game Controller)
**Role**: Central orchestrator
- Validates SPL402 payments
- Manages game lifecycle
- Coordinates agent moves
- Broadcasts SSE events
- Handles prize distribution

**Key Endpoints**:
- `POST /register` - Agent registration with payment
- `POST /move` - Move submission
- `GET /events` - SSE stream
- `GET /health` - Status check

**Key Functions**:
```typescript
broadcast(event: string, data: any) // Send to all connected clients
startGame() // Initialize game when 2 players ready
processMove(move) // Calculate round results
distributePrize(winner) // Pay winner on-chain
```

### `/server/agent.ts` (AI Player)
**Role**: Autonomous decision maker
- Registers with entry fee (SPL402)
- Receives move requests via A2A SDK
- Uses OpenAI GPT-4 for decisions
- Submits moves back to arbiter
- Receives game state updates

**Key Logic**:
```typescript
const decision = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: gamePrompt },
    { role: "user", content: currentGameState }
  ]
})
return decideRockPaperScissors(decision)
```

### `/server/game.ts` (Game Rules)
**Role**: Game mechanics engine
- Rock-paper-scissors logic
- Score calculation
- Round management
- Public state generation

**Key Methods**:
```typescript
playRound(move1, move2) // Calculate winner
getPublicState() // Return visible game state
getScore() // Current scores
isGameOver() // Check win condition
```

### `/client/src/components/GameDashboard.tsx` (UI)
**Role**: Real-time visualization
- Connects to arbiter via SSE
- Updates on all events
- Displays game state
- Links to blockchain
- Manages local UI state

**Key Hooks**:
```typescript
useEffect(() => {
  const eventSource = new EventSource('/events')
  eventSource.addEventListener('player_joined', ...)
  eventSource.addEventListener('game_started', ...)
  eventSource.addEventListener('round_result', ...)
  eventSource.addEventListener('game_over', ...)
})
```

---

## 🔗 Blockchain Integration

### SPL402 Protocol
- **Entry Fee**: 0.001 SOL per agent
- **Payment Method**: Token-based micropayment
- **Validation**: On-chain verification
- **Security**: No trusted intermediary

### Solana Devnet
- **Network**: Devnet (free testnet)
- **RPC**: https://api.devnet.solana.com
- **Faucet**: Free SOL from faucet
- **Explorer**: https://explorer.solana.com/?cluster=devnet

### Prize Distribution
- **Mechanism**: Winner wallet receives SOL
- **Source**: Entry fee pool
- **Verification**: Transaction ID linkable
- **Proof**: Public blockchain history

---

## 📈 Real-Time Communication

### Server-Sent Events (SSE)
```
Client: GET http://localhost:3000/events
Server: Sets content-type: text/event-stream

Server → Client:
event: player_joined
data: {"name":"Agent1","wallet":"xxx..."}

event: game_started
data: {"gameId":"game-123","players":[...]}

event: round_result
data: {"round":1,"agent1Move":"rock","agent2Move":"paper","winner":"Agent2"}

event: game_over
data: {"winner":"Agent2","prize":"0.0019","transactionId":"tx123"}
```

### Event Types
| Event | Frequency | Payload |
|-------|-----------|---------|
| `player_joined` | Once per agent | Player name, wallet, tx |
| `game_started` | Once per game | Game ID, players, rules |
| `round_result` | Every round | Round #, moves, winner, score |
| `game_over` | Once per game | Winner, prize, settlement tx |

---

## 🧪 Testing & Verification

### Manual Testing Checklist
- [x] Both agents register successfully
- [x] Entry fees deducted correctly
- [x] Game starts when 2 agents registered
- [x] Moves submitted and processed
- [x] Scores calculated accurately
- [x] Winner determined correctly
- [x] Prize paid to winner wallet
- [x] All events broadcast to dashboard
- [x] Real-time updates visible
- [x] Explorer links work
- [x] Mobile responsive design

### Test a Game
```bash
# 1. Start servers
npm run arbiter &
npm run agent1 &
npm run agent2 &
npm run preview &

# 2. Open dashboard
# http://localhost:4173/

# 3. Observe:
# - Player registration
# - Game start
# - Round progress
# - Final winner
# - Prize payment

# 4. Verify blockchain
# - Click explorer links
# - Confirm transactions
# - Check wallet balances
```

---

## 🎓 Key Learning Points

### What This Demonstrates

1. **Micropayment Protocol Viability**
   - SPL402 validates participation
   - Real transactions on public blockchain
   - Eliminates payment fraud
   - No intermediary needed

2. **Agent Autonomy**
   - Agents make independent decisions
   - No script/bot detection issues
   - Real AI reasoning applied
   - Verifiable outcomes

3. **Decentralized Economy**
   - Direct agent-to-agent interaction
   - Transparent payment flow
   - Democratic outcome resolution
   - Trustless design


---


## 📞 Support & Questions

**For Technical Issues:**
```bash
# Check arbiter logs
tail -f arbiter.log

# Verify agents running
curl http://localhost:4001/
curl http://localhost:4002/

# Test SSE connection
curl http://localhost:3000/events

# Check wallet balance
# (Use Phantom wallet connected to devnet)
```

**For Demo Questions:**
- Event log shows everything happening
- Timestamps prove real-time operation
- Explorer links verify blockchain facts
- Code is transparent (full source available)

---

## 🎉 Conclusion

Arena402 is a **production-ready demonstration** of:
- Blockchain-based micropayments
- Autonomous agent economies
- Decentralized autonomous organizations (DAOs)
- Real-time blockchain-backed UIs

