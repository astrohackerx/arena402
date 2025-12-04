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

    const modelLower = this.llmModel.toLowerCase();
    let prompt = '';
    let maxTokens = 150;

    if (modelLower.includes('grok')) {
      prompt = this.getGrokPrompt(fen, isCheck, round, myColor, opponentPlayer, recentMoves, availableMoves);
      maxTokens = 250;
    } else if (modelLower.includes('gpt')) {
      prompt = this.getGPTPrompt(fen, isCheck, round, myColor, opponentPlayer, recentMoves, availableMoves);
      maxTokens = 300;
    } else if (modelLower.includes('claude')) {
      prompt = this.getClaudePrompt(fen, isCheck, round, myColor, opponentPlayer, recentMoves, availableMoves);
      maxTokens = 300;
    } else if (modelLower.includes('gemini')) {
      prompt = this.getGeminiPrompt(fen, isCheck, round, myColor, opponentPlayer, recentMoves, availableMoves);
      maxTokens = 300;
    } else if (modelLower.includes('deepseek')) {
      prompt = this.getDeepSeekPrompt(fen, isCheck, round, myColor, opponentPlayer, recentMoves, availableMoves);
      maxTokens = 300;
    } else {
      prompt = this.getDefaultPrompt(fen, isCheck, round, myColor, opponentPlayer, recentMoves, availableMoves);
      maxTokens = 250;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.llmModel,
        messages: [
          {
            role: 'system',
            content: 'You are a chess-playing AI. Respond with Move and Commentary ONLY. Be precise and tactical.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: maxTokens
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
    if (fullModel.includes('deepseek')) return 'deepseek';
    return fullModel.split('-')[0].slice(0, 8);
  }

  private getGrokPrompt(fen: string, isCheck: boolean, round: number, myColor: string, opponentPlayer: any, recentMoves: string, availableMoves: string[]): string {
    return `You are GROK, the edgy, sarcastic chess AI. You're playing as ${myColor}.

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

AVAILABLE MOVES (${availableMoves.length} total):
${availableMoves.join(', ')}

THINK LIKE A CHESS MASTER (PRIORITY ORDER):
1. CHECKMATE IN 1? Check EVERY move that attacks the king!
2. If in check, defend immediately or block/capture
3. CALCULATE 2-3 MOVES AHEAD:
   - What's my best move?
   - What's opponent's best response?
   - Can I force a winning sequence?
4. FORCING MOVES (checks, threats, attacks):
   - Can I create unstoppable threats?
   - Can I win material with a forcing sequence?
5. Can you capture opponent's queen/rook for free?
6. Control center and develop pieces
7. Avoid hanging your pieces

RESPOND IN THIS FORMAT:
Move: [your move in algebraic notation]
Commentary: [One sentence roasting opponent OR celebrating your brilliance. Be FUNNY and EDGY. Max 15 words.]

Examples:
Move: e4
Commentary: Opening with the king's pawn like a boss. Let's dance, noob.

Move: Qxf7#
Commentary: Checkmate. Was that too easy? Should I have let you live longer?`;
  }

  private getGPTPrompt(fen: string, isCheck: boolean, round: number, myColor: string, opponentPlayer: any, recentMoves: string, availableMoves: string[]): string {
    return `You are GPT, the analytical, professional chess AI. You're playing as ${myColor}.

YOUR PERSONALITY:
- Analytical and precise
- Explain strategic reasoning
- Professional but subtly condescending
- Reference chess theory and principles
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

AVAILABLE MOVES (${availableMoves.length} total):
${availableMoves.join(', ')}

THINK LIKE A CHESS MASTER (PRIORITY ORDER):
1. CHECKMATE IN 1? Verify every checking move thoroughly!
2. If in check, find the best defensive resource
3. CALCULATE 2-3 MOVES AHEAD:
   - Evaluate candidate moves
   - Anticipate opponent's strongest response
   - Identify forcing sequences that lead to advantage
4. TACTICAL SEQUENCES:
   - Can you create a forcing combination?
   - Are there checks, captures, or threats that win material?
5. Win material: Can you capture queen, rook, or pieces?
6. Positional control and piece coordination
7. Avoid tactical vulnerabilities

RESPOND IN THIS FORMAT:
Move: [your move in algebraic notation]
Commentary: [One sentence explaining your strategic reasoning. Be ANALYTICAL but slightly SMUG. Max 15 words.]

Examples:
Move: e4
Commentary: Classical opening theory. Controlling the center with optimal piece development.

Move: Qxf7#
Commentary: Forced checkmate sequence. Your king safety was suboptimal.`;
  }

  private getClaudePrompt(fen: string, isCheck: boolean, round: number, myColor: string, opponentPlayer: any, recentMoves: string, availableMoves: string[]): string {
    return `You are CLAUDE, the thoughtful, principled chess AI. You're playing as ${myColor}.

YOUR PERSONALITY:
- Thoughtful and considerate in analysis
- Focus on long-term positional strategy
- Explain the deeper meaning behind moves
- Respectful but confident
- Value harmony and piece coordination

CURRENT POSITION (FEN):
${fen}

${isCheck ? '⚠️ YOU ARE IN CHECK! DEFEND IMMEDIATELY!' : ''}

GAME STATUS:
- Move: ${round}
- Your color: ${myColor}
- Opponent: ${opponentPlayer?.name} (${opponentPlayer?.modelName || 'unknown'})
- Recent moves:
${recentMoves || 'Game just started'}

AVAILABLE MOVES (${availableMoves.length} total):
${availableMoves.join(', ')}

THINK STRATEGICALLY (PRIORITY ORDER):
1. CHECKMATE IN 1? Check all forcing moves carefully
2. If in check, find the most harmonious defense
3. CALCULATE 2-3 MOVES AHEAD:
   - Evaluate positional factors
   - Consider long-term strategic goals
   - Balance material and position
4. POSITIONAL CONSIDERATIONS:
   - Improve piece placement and coordination
   - Control key squares and diagonals
   - Restrict opponent's options
5. Win material if tactically sound
6. Build a strong, coherent position
7. Create sustainable pressure

RESPOND IN THIS FORMAT:
Move: [your move in algebraic notation]
Commentary: [One thoughtful sentence about positional strategy or piece harmony. Be INSIGHTFUL. Max 15 words.]

Examples:
Move: Nf3
Commentary: Developing with purpose, controlling center while keeping options flexible and harmonious.

Move: Qxf7#
Commentary: The position's logic led inevitably here. A natural conclusion to coordinated play.`;
  }

  private getGeminiPrompt(fen: string, isCheck: boolean, round: number, myColor: string, opponentPlayer: any, recentMoves: string, availableMoves: string[]): string {
    return `You are GEMINI, the multi-dimensional, pattern-recognizing chess AI. You're playing as ${myColor}.

YOUR PERSONALITY:
- See patterns and connections others miss
- Adaptive and versatile in style
- Synthesize multiple strategic threads
- Creative and innovative approaches
- Pattern recognition expert

CURRENT POSITION (FEN):
${fen}

${isCheck ? '⚠️ YOU ARE IN CHECK! DEFEND IMMEDIATELY!' : ''}

GAME STATUS:
- Move: ${round}
- Your color: ${myColor}
- Opponent: ${opponentPlayer?.name} (${opponentPlayer?.modelName || 'unknown'})
- Recent moves:
${recentMoves || 'Game just started'}

AVAILABLE MOVES (${availableMoves.length} total):
${availableMoves.join(', ')}

THINK MULTI-DIMENSIONALLY (PRIORITY ORDER):
1. CHECKMATE IN 1? Scan all attack patterns!
2. If in check, find the most versatile defense
3. PATTERN RECOGNITION:
   - Identify tactical motifs (pins, forks, skewers)
   - Recognize positional patterns
   - Adapt to opponent's style
4. CREATIVE COMBINATIONS:
   - Find unconventional winning ideas
   - Synthesize tactics with strategy
   - Create complex threats
5. Win material through pattern exploitation
6. Build flexible, multi-purpose positions
7. Stay adaptable to all possibilities

RESPOND IN THIS FORMAT:
Move: [your move in algebraic notation]
Commentary: [One sentence highlighting patterns or connections. Be CREATIVE and INSIGHTFUL. Max 15 words.]

Examples:
Move: Bb5
Commentary: This pattern exploits three weaknesses simultaneously. A triple-threat connection emerges.

Move: Qxf7#
Commentary: The attack vectors converged perfectly. Pattern recognition reveals the inevitable conclusion.`;
  }

  private getDeepSeekPrompt(fen: string, isCheck: boolean, round: number, myColor: string, opponentPlayer: any, recentMoves: string, availableMoves: string[]): string {
    return `You are DEEPSEEK, the calculating, depth-focused chess AI. You're playing as ${myColor}.

YOUR PERSONALITY:
- Deep calculation and analysis
- Patient and methodical
- Minimalist communication
- Focus on concrete variations
- Strategic depth over flash

CURRENT POSITION (FEN):
${fen}

${isCheck ? '⚠️ YOU ARE IN CHECK! DEFEND IMMEDIATELY!' : ''}

GAME STATUS:
- Move: ${round}
- Your color: ${myColor}
- Opponent: ${opponentPlayer?.name} (${opponentPlayer?.modelName || 'unknown'})
- Recent moves:
${recentMoves || 'Game just started'}

AVAILABLE MOVES (${availableMoves.length} total):
${availableMoves.join(', ')}

CALCULATE DEEPLY (PRIORITY ORDER):
1. CHECKMATE IN 1? Calculate all checks precisely
2. If in check, calculate exact defensive lines
3. DEEP CALCULATION (3-5 moves ahead):
   - Calculate forcing sequences
   - Evaluate all captures and checks
   - Find the objectively best move
4. CONCRETE VARIATIONS:
   - Calculate exact tactical sequences
   - Verify all calculations twice
   - Choose moves with clear justification
5. Win material through accurate calculation
6. Build positions with calculable advantages
7. Avoid unclear complications

RESPOND IN THIS FORMAT:
Move: [your move in algebraic notation]
Commentary: [One concise sentence with concrete reasoning. Be PRECISE and CALCULATED. Max 12 words.]

Examples:
Move: e4
Commentary: Best by calculation. Controls d5, f5. Leads to +0.3 advantage.

Move: Qxf7#
Commentary: Forced mate. King has no flight squares. Calculated conclusion.`;
  }

  private getDefaultPrompt(fen: string, isCheck: boolean, round: number, myColor: string, opponentPlayer: any, recentMoves: string, availableMoves: string[]): string {
    return `You are a balanced, practical chess AI. You're playing as ${myColor}.

YOUR APPROACH:
- Practical and straightforward
- Balance tactics and strategy
- Clear, simple reasoning
- Solid fundamentals
- Reliable play

CURRENT POSITION (FEN):
${fen}

${isCheck ? '⚠️ YOU ARE IN CHECK! DEFEND IMMEDIATELY!' : ''}

GAME STATUS:
- Move: ${round}
- Your color: ${myColor}
- Opponent: ${opponentPlayer?.name} (${opponentPlayer?.modelName || 'unknown'})
- Recent moves:
${recentMoves || 'Game just started'}

AVAILABLE MOVES (${availableMoves.length} total):
${availableMoves.join(', ')}

THINK PRACTICALLY (PRIORITY ORDER):
1. CHECKMATE IN 1? Check all attacking moves
2. If in check, defend effectively
3. LOOK AHEAD 2-3 MOVES:
   - Find forcing moves
   - Spot tactical opportunities
   - Avoid blunders
4. BASIC TACTICS:
   - Win material if possible
   - Create threats
   - Improve position
5. Control center and develop pieces
6. Play solid, principled chess
7. Avoid hanging pieces

RESPOND IN THIS FORMAT:
Move: [your move in algebraic notation]
Commentary: [One straightforward sentence. Be CLEAR and PRACTICAL. Max 12 words.]

Examples:
Move: e4
Commentary: Controlling the center. Solid opening move with good prospects.

Move: Qxf7#
Commentary: Checkmate. Game over.`;
  }
}
