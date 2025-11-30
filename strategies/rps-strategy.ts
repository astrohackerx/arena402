import { BaseStrategy, MoveDecision } from './base-strategy.js';

const MOVE_ICONS: Record<string, string> = { rock: '🪨', paper: '📄', scissors: '✂️' };

export class RockPaperScissorsStrategy extends BaseStrategy {
  async decideMove(gameState: any, myId: string): Promise<MoveDecision> {
    const history = gameState.history || [];
    const availableMoves = gameState.availableMoves || ['rock', 'paper', 'scissors'];

    const opponentMoves = history
      .map((r: any) => {
        const opponentMove = r.moves.find((m: any) => m.playerId !== myId);
        return opponentMove?.move;
      })
      .filter((m: any) => m);

    const recentHistory = history.slice(-3).map((r: any) => {
      const moves = r.moves.map((m: any) => {
        const player = gameState.players.find((p: any) => p.id === m.playerId);
        return `${player?.name}: ${m.move}`;
      }).join(' vs ');
      const result = r.winnerId ? (r.winnerId === myId ? '✅ WIN' : '❌ LOSE') : '🤝 TIE';
      return `${moves} - ${result}`;
    }).join('\n');

    const score = gameState.players.find((p: any) => p.id === myId)?.score || 0;
    const opponentScore = gameState.players.find((p: any) => p.id !== myId)?.score || 0;

    let prompt = '';

    if (this.agentName === 'Agent1') {
      prompt = `You are a DEFENSIVE PATTERN-ANALYZER AI playing Rock Paper Scissors.

DEFENSIVE STRATEGY:
- Study opponent's patterns carefully
- Counter their most frequent move
- Play conservatively, wait for their mistakes
- If no clear pattern, play ROCK (your signature defensive move)

GAME STATE:
- Round: ${gameState.round}/${gameState.maxRounds}
- Score: You ${score} - ${opponentScore} Opponent
- Opponent's Moves: ${opponentMoves.join(', ') || 'none yet'}

RECENT HISTORY:
${recentHistory || 'Game just started - use your defensive opening'}

Counter their pattern. Respond with ONE WORD: rock, paper, or scissors.`;
    } else {
      prompt = `You are an AGGRESSIVE CHAOS AI playing Rock Paper Scissors.

AGGRESSIVE STRATEGY:
- Be UNPREDICTABLE at all costs
- Mix up your moves randomly
- Never play the same move twice in a row if possible
- Use psychological warfare - surprise them constantly
- If no history, start with SCISSORS (your signature aggressive move)

GAME STATE:
- Round: ${gameState.round}/${gameState.maxRounds}
- Score: You ${score} - ${opponentScore} Opponent
- Your Last Move: ${history.length > 0 ? history[history.length - 1]?.moves.find((m: any) => m.playerId === myId)?.move : 'none'}
- Opponent's Moves: ${opponentMoves.join(', ') || 'none yet'}

RECENT HISTORY:
${recentHistory || 'Game just started - unleash chaos'}

Be CHAOTIC and UNPREDICTABLE. Respond with ONE WORD: rock, paper, or scissors.`;
    }

    const decision = await this.queryLLM(prompt, availableMoves);

    console.log(`\n💭 ${this.agentName} analyzing...`);
    console.log(`   Model: ${this.llmModel}`);
    console.log(`   Decision: ${MOVE_ICONS[decision.move]} ${decision.move}`);

    return decision;
  }
}
