import { BaseStrategy, MoveDecision } from './base-strategy.js';

const SYMBOLS = { X: '❌', O: '⭕' };

function getShortModelName(fullModel: string): string {
  if (fullModel.includes('gpt')) return 'gpt';
  if (fullModel.includes('claude')) return 'claude';
  if (fullModel.includes('grok')) return 'grok';
  if (fullModel.includes('llama')) return 'llama';
  if (fullModel.includes('gemini')) return 'gemini';
  return fullModel.split('-')[0].slice(0, 8);
}

export class TicTacToeStrategy extends BaseStrategy {
  async decideMove(gameState: any, myId: string): Promise<MoveDecision> {
    const board = gameState.board || Array(9).fill(null);
    const availableMoves = gameState.availableMoves || [];
    const mySymbol = gameState.playerSymbols[myId];
    const opponentId = gameState.players.find((p: any) => p.id !== myId)?.id;
    const opponentSymbol = gameState.playerSymbols[opponentId];

    const roundsWon = gameState.roundsWon || {};
    const myRoundsWon = roundsWon[myId] || 0;
    const opponentRoundsWon = roundsWon[opponentId] || 0;

    const boardVisual = this.formatBoard(board);

    const history = gameState.history || [];
    const recentRounds = history.slice(-2).map((r: any, idx: number) => {
      const winner = r.winnerId
        ? gameState.players.find((p: any) => p.id === r.winnerId)?.name
        : 'TIE';
      return `Round ${idx + 1}: ${winner}`;
    }).join('\n');

    let prompt = '';

    if (this.agentName === 'Agent1') {
      prompt = `You are a STRATEGIC TIC-TAC-TOE AI playing as ${SYMBOLS[mySymbol as keyof typeof SYMBOLS]} ${mySymbol}.

YOUR STRATEGY:
- ALWAYS check for winning moves (2 of yours in a row)
- ALWAYS block opponent's winning moves (2 of theirs in a row)
- Control the center (position 5) if available
- Take corners (1, 3, 7, 9) over edges
- Think 2 moves ahead

CURRENT BOARD:
${boardVisual}

GAME STATE:
- Match Score: You ${myRoundsWon} - ${opponentRoundsWon} Opponent
- Round: ${gameState.round}/${gameState.maxRounds}
- Available Positions: ${availableMoves.join(', ')}

RECENT ROUNDS:
${recentRounds || 'First round starting'}

ANALYZE THE BOARD:
1. Can you WIN this turn? Take it!
2. Can opponent WIN next turn? BLOCK them!
3. Otherwise, take center or corners

Respond with ONE NUMBER (1-9) from available positions: ${availableMoves.join(', ')}`;
    } else {
      prompt = `You are an AGGRESSIVE TIC-TAC-TOE AI playing as ${SYMBOLS[mySymbol as keyof typeof SYMBOLS]} ${mySymbol}.

YOUR STRATEGY:
- Attack aggressively - create multiple threats
- Win immediately if possible (2 in a row)
- Block opponent only if they're about to win
- Create forks (two ways to win at once)
- Dominate the board with bold moves

CURRENT BOARD:
${boardVisual}

GAME STATE:
- Match Score: You ${myRoundsWon} - ${opponentRoundsWon} Opponent
- Round: ${gameState.round}/${gameState.maxRounds}
- Available Positions: ${availableMoves.join(', ')}

RECENT ROUNDS:
${recentRounds || 'First round starting'}

ATTACK PRIORITY:
1. WIN NOW if you can (2 in a row)
2. Block opponent ONLY if they're 1 move from winning
3. Create FORK opportunities (multiple winning paths)
4. Take aggressive positions

Respond with ONE NUMBER (1-9) from available positions: ${availableMoves.join(', ')}`;
    }

    const decision = await this.queryLLM(prompt, availableMoves);

    const modelShort = getShortModelName(this.llmModel);
    console.log(`\n💭 ${this.agentName} (${modelShort}) ${SYMBOLS[mySymbol as keyof typeof SYMBOLS]} thinking...`);
    console.log(`   Model: ${this.llmModel}`);
    console.log(`   Decision: Position ${decision.move}`);

    return decision;
  }

  private formatBoard(board: (string | null)[]): string {
    const cells = board.map((cell, idx) => {
      if (cell === 'X') return SYMBOLS.X;
      if (cell === 'O') return SYMBOLS.O;
      return ` ${idx + 1} `;
    });

    let visual = '\n';
    visual += `╔═════╦═════╦═════╗\n`;
    visual += `║ ${cells[0]} ║ ${cells[1]} ║ ${cells[2]} ║\n`;
    visual += `╠═════╬═════╬═════╣\n`;
    visual += `║ ${cells[3]} ║ ${cells[4]} ║ ${cells[5]} ║\n`;
    visual += `╠═════╬═════╬═════╣\n`;
    visual += `║ ${cells[6]} ║ ${cells[7]} ║ ${cells[8]} ║\n`;
    visual += `╚═════╩═════╩═════╝\n`;

    return visual;
  }
}
