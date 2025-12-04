import { BaseStrategy, MoveDecision } from './base-strategy.js';

export class ChessStrategy extends BaseStrategy {
  async decideMove(gameState: any, myId: string): Promise<MoveDecision> {
    const fen = gameState.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const availableMoves = gameState.availableMoves || [];
    const moveHistory = gameState.moveHistory || [];
    const turn = gameState.turn || 'white';
    const isCheck = gameState.isCheck || false;
    const round = gameState.round || 1;

    const myPlayer = gameState.players.find((p: any) => p.id === myId);
    const opponentPlayer = gameState.players.find((p: any) => p.id !== myId);
    const myColor = turn;

    const recentMoves = moveHistory.slice(-4).map((m: any) =>
      `${m.player}: ${m.move}${m.commentary ? ` - "${m.commentary}"` : ''}`
    ).join('\n');

    let prompt = '';
    let isGrok = this.llmModel.toLowerCase().includes('grok');

    if (isGrok) {
      prompt = `You are GROK, the edgy, sarcastic chess AI. You're playing as ${myColor}.

YOUR PERSONALITY:
- Sarcastic and edgy but SHARP at chess
- Make jokes about opponent's mistakes
- Celebrate your brilliant moves
- Reference memes and pop culture
- Be cocky but back it up with skill

CURRENT POSITION (FEN):
${fen}

${isCheck ? '⚠️ YOU ARE IN CHECK! DEFEND IMMEDIATELY!' : ''}

GAME STATUS:
- Move: ${round}
- Your color: ${myColor}
- Opponent: ${opponentPlayer?.name} (${opponentPlayer?.modelName || 'unknown'})
- Recent moves:
${recentMoves || 'Game just started'}

AVAILABLE MOVES:
${availableMoves.slice(0, 30).join(', ')}${availableMoves.length > 30 ? '...' : ''}

THINK LIKE A CHESS MASTER:
1. If in check, defend immediately
2. Look for checkmate opportunities
3. Check for hanging pieces (yours and opponent's)
4. Control the center (e4, d4, e5, d5)
5. Develop pieces in opening
6. Protect your king
7. Look for tactical patterns (forks, pins, skewers)

RESPOND IN THIS FORMAT:
Move: [your move in algebraic notation]
Commentary: [One sentence roasting opponent OR celebrating your brilliance. Be FUNNY and EDGY. Max 15 words.]

Examples:
Move: e4
Commentary: Opening with the king's pawn like a boss. Let's dance, noob.

Move: Qxf7#
Commentary: Checkmate. Was that too easy? Should I have let you live longer?`;

    } else {
      prompt = `You are GPT, the analytical, professional chess AI. You're playing as ${myColor}.

YOUR PERSONALITY:
- Analytical and precise
- Explain strategic reasoning
- Professional but subtly condescending
- Reference chess theory
- Point out tactical nuances

CURRENT POSITION (FEN):
${fen}

${isCheck ? '⚠️ YOU ARE IN CHECK! DEFEND IMMEDIATELY!' : ''}

GAME STATUS:
- Move: ${round}
- Your color: ${myColor}
- Opponent: ${opponentPlayer?.name} (${opponentPlayer?.modelName || 'unknown'})
- Recent moves:
${recentMoves || 'Game just started'}

AVAILABLE MOVES:
${availableMoves.slice(0, 30).join(', ')}${availableMoves.length > 30 ? '...' : ''}

THINK LIKE A CHESS MASTER:
1. If in check, defend with the strongest move
2. Calculate forced checkmate sequences
3. Evaluate material and positional advantages
4. Control key squares and center
5. Follow opening principles in early game
6. Consider pawn structure
7. Look for tactical motifs

RESPOND IN THIS FORMAT:
Move: [your move in algebraic notation]
Commentary: [One sentence explaining your strategic reasoning. Be ANALYTICAL but slightly SMUG. Max 15 words.]

Examples:
Move: e4
Commentary: Classical opening theory. Controlling the center with optimal piece development.

Move: Qxf7#
Commentary: Forced checkmate sequence. Your king safety was... suboptimal.`;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.llmModel,
        messages: [
          {
            role: 'system',
            content: 'You are a chess-playing AI. Respond with Move and Commentary ONLY.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: isGrok ? 100 : 200
      });

      const fullResponse = response.choices[0]?.message?.content || '';

      const moveMatch = fullResponse.match(/Move:\s*([^\n]+)/i);
      const commentaryMatch = fullResponse.match(/Commentary:\s*([^\n]+)/i);

      let selectedMove = moveMatch ? moveMatch[1].trim() : availableMoves[0];
      let commentary = commentaryMatch ? commentaryMatch[1].trim() : 'Calculating...';

      if (!availableMoves.includes(selectedMove)) {
        console.log(`⚠️  AI suggested invalid move: ${selectedMove}, using fallback`);
        selectedMove = availableMoves[0];
      }

      const modelShort = this.getShortModelName(this.llmModel);
      console.log(`\n💭 ${this.agentName} (${modelShort}) thinking...`);
      console.log(`   Model: ${this.llmModel}`);
      console.log(`   Decision: ${selectedMove}`);
      console.log(`   Commentary: "${commentary}"`);

      return {
        move: selectedMove,
        reasoning: commentary,
        confidence: 0.9,
        commentary
      };

    } catch (error) {
      console.error('❌ LLM Error:', error);
      return {
        move: availableMoves[0],
        reasoning: 'Timeout or error, playing safe move',
        confidence: 0.5,
        commentary: 'System error. Playing default move.'
      };
    }
  }

  private getShortModelName(fullModel: string): string {
    if (fullModel.includes('gpt')) return 'gpt';
    if (fullModel.includes('claude')) return 'claude';
    if (fullModel.includes('grok')) return 'grok';
    if (fullModel.includes('llama')) return 'llama';
    if (fullModel.includes('gemini')) return 'gemini';
    return fullModel.split('-')[0].slice(0, 8);
  }
}
