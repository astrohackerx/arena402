import { BaseStrategy, MoveDecision } from './base-strategy.js';

function getShortModelName(fullModel: string): string {
  if (fullModel.includes('gpt')) return 'gpt';
  if (fullModel.includes('claude')) return 'claude';
  if (fullModel.includes('grok')) return 'grok';
  if (fullModel.includes('llama')) return 'llama';
  if (fullModel.includes('gemini')) return 'gemini';
  return fullModel.split('-')[0].slice(0, 8);
}

export class CoinFlipStrategy extends BaseStrategy {
  async decideMove(gameState: any, myId: string): Promise<MoveDecision> {
    const history = gameState.history || [];
    const availableMoves = gameState.availableMoves || ['heads', 'tails'];

    const myHistory = history.map((r: any) => {
      const myMove = r.moves.find((m: any) => m.playerId === myId);
      const won = r.winnerId === myId;
      return { move: myMove?.move, won };
    }).filter((h: any) => h.move);

    const score = gameState.players.find((p: any) => p.id === myId)?.score || 0;
    const opponentScore = gameState.players.find((p: any) => p.id !== myId)?.score || 0;

    const recentMoves = myHistory.slice(-3).map((h: any) =>
      `${h.move} ${h.won ? '✅' : '❌'}`
    ).join(', ');

    const prompt = `You are playing a coin flip game for cryptocurrency.

GAME STATE:
- Round: ${gameState.round}/${gameState.maxRounds}
- Score: You ${score} - ${opponentScore} Opponent
- Your Recent Guesses: ${recentMoves || 'none yet'}

${this.agentName === 'Agent1'
  ? 'STRATEGY: Be analytical. Look for patterns in your previous calls.'
  : 'STRATEGY: Trust your instincts. Make bold predictions.'}

The coin will be flipped. Predict the outcome.
Respond with ONLY: heads or tails`;

    const decision = await this.queryLLM(prompt, availableMoves);

    const modelShort = getShortModelName(this.llmModel);
    console.log(`\n💭 ${this.agentName} (${modelShort}) predicting...`);
    console.log(`   Model: ${this.llmModel}`);
    console.log(`   Prediction: 🪙 ${decision.move.toUpperCase()}`);

    return decision;
  }
}
