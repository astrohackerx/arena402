import OpenAI from 'openai';

export interface GameStateAnalysis {
  roundHistory: any[];
  players: any[];
  round: number;
  maxRounds: number;
}

export interface MoveDecision {
  move: 'rock' | 'paper' | 'scissors';
  rawResponse: string;
}

const VALID_MOVES = ['rock', 'paper', 'scissors'] as const;
const MOVE_ICONS: Record<string, string> = { rock: '🪨', paper: '📄', scissors: '✂️' };

export async function decideMove(
  openai: OpenAI,
  gameState: GameStateAnalysis,
  myId: string,
  agentName: string,
  llmModel: string
): Promise<MoveDecision> {
  const roundHistory = gameState.roundHistory || [];

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

  const agentStrategy = agentName === 'Agent1'
    ? 'STRATEGY: Play DEFENSIVELY. Counter the opponent\'s most common move. Be predictable to confuse them.'
    : 'STRATEGY: Play AGGRESSIVELY. Make bold, unpredictable moves. Surprise them constantly.';

  const prompt = `You are an elite AI playing Rock Paper Scissors for cryptocurrency.

CURRENT GAME STATE:
- Round: ${gameState.round}/${gameState.maxRounds}
- Your Score: ${score}
- Opponent Score: ${opponentScore}
- You need 5 wins to take the prize!

OPPONENT'S RECENT MOVES:
${opponentMoves.length > 0 ? opponentMoves.slice(-5).join(', ') : 'No history yet'}

RECENT ROUNDS:
${recentHistory || 'First round'}

${agentStrategy}

RESPONSE: Choose rock, paper, or scissors based on your strategy.

Respond with ONLY ONE WORD: rock, paper, or scissors. Nothing else.`;

  const agentTemp = agentName === 'Agent1' ? 0.3 : 0.7;
  const completion = await openai.chat.completions.create({
    model: llmModel,
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
  });

  const rawResponse = completion.choices[0]?.message?.content || '';
  const found = rawResponse.match(/\b(rock|paper|scissors)\b/i);
  let move = found ? found[1].toLowerCase() as 'rock' | 'paper' | 'scissors' : null;

  if (!move || !VALID_MOVES.includes(move)) {
    console.log(`⚠️  Model response did not contain a valid move: "${rawResponse.replace(/\n/g, ' ')}"`);
    move = VALID_MOVES[Math.floor(Math.random() * 3)];
    console.log(`   Selected random move: ${move}`);
  }

  return { move, rawResponse };
}

export function logMoveDecision(agentName: string, move: string, round: number, score: string) {
  console.log(`\n───────────────────────────────────`);
  console.log(`🤔 ${agentName} analyzing patterns...`);
  console.log(`   ${score}`);
  console.log(`\n✅ ${MOVE_ICONS[move]} Decision: ${move.toUpperCase()}`);
  console.log(`───────────────────────────────────\n`);
}
