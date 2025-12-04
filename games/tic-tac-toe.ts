import { BaseGame, GameConfig, PlayerMove, RoundResult, MoveValidation } from './base-game.js';
import dotenv from 'dotenv';

dotenv.config();

const MOVE_PRICE = parseFloat(process.env.MOVE_PRICE || '0');

const SYMBOLS = {
  X: '❌',
  O: '⭕'
};

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const LINE_CHARS = {
  horizontal: '━',
  vertical: '┃',
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  cross: '╋',
  tLeft: '╠',
  tRight: '╣',
  tTop: '╦',
  tBottom: '╩'
};

export class TicTacToeGame extends BaseGame {
  private board: (string | null)[];
  private roundsWon: Map<string, number>;
  private playerSymbols: Map<string, 'X' | 'O'>;
  private currentTurnIndex: number;

  static readonly CONFIG: GameConfig = {
    id: 'tic-tac-toe',
    name: 'Tic-Tac-Toe',
    description: 'Classic 3x3 grid game. Get 3 in a row to win!',
    minPlayers: 2,
    maxPlayers: 2,
    entryFee: 0.001,
    movePrice: MOVE_PRICE,
    winCondition: 'Best of 3 rounds',
    maxRounds: 3,
    turnBased: true
  };

  constructor(gameId: string, players: Array<{ id: string; name: string; modelName?: string }>) {
    super(TicTacToeGame.CONFIG, gameId, players);
    this.board = Array(9).fill(null);
    this.roundsWon = new Map();
    this.playerSymbols = new Map();
    this.currentTurnIndex = 0;

    this.playerSymbols.set(players[0].id, 'X');
    this.playerSymbols.set(players[1].id, 'O');

    players.forEach(p => this.roundsWon.set(p.id, 0));
  }

  private drawBoard(highlightWinLine?: number[]): string {
    const cells = this.board.map((cell, idx) => {
      if (cell === 'X') return SYMBOLS.X;
      if (cell === 'O') return SYMBOLS.O;
      return ` ${idx + 1} `;
    });

    const topBorder = `${LINE_CHARS.topLeft}${LINE_CHARS.horizontal.repeat(5)}${LINE_CHARS.tTop}${LINE_CHARS.horizontal.repeat(5)}${LINE_CHARS.tTop}${LINE_CHARS.horizontal.repeat(5)}${LINE_CHARS.topRight}`;
    const midBorder = `${LINE_CHARS.tLeft}${LINE_CHARS.horizontal.repeat(5)}${LINE_CHARS.cross}${LINE_CHARS.horizontal.repeat(5)}${LINE_CHARS.cross}${LINE_CHARS.horizontal.repeat(5)}${LINE_CHARS.tRight}`;
    const bottomBorder = `${LINE_CHARS.bottomLeft}${LINE_CHARS.horizontal.repeat(5)}${LINE_CHARS.tBottom}${LINE_CHARS.horizontal.repeat(5)}${LINE_CHARS.tBottom}${LINE_CHARS.horizontal.repeat(5)}${LINE_CHARS.bottomRight}`;

    let board = `\n${topBorder}\n`;
    board += `${LINE_CHARS.vertical} ${cells[0]} ${LINE_CHARS.vertical} ${cells[1]} ${LINE_CHARS.vertical} ${cells[2]} ${LINE_CHARS.vertical}\n`;
    board += `${midBorder}\n`;
    board += `${LINE_CHARS.vertical} ${cells[3]} ${LINE_CHARS.vertical} ${cells[4]} ${LINE_CHARS.vertical} ${cells[5]} ${LINE_CHARS.vertical}\n`;
    board += `${midBorder}\n`;
    board += `${LINE_CHARS.vertical} ${cells[6]} ${LINE_CHARS.vertical} ${cells[7]} ${LINE_CHARS.vertical} ${cells[8]} ${LINE_CHARS.vertical}\n`;
    board += `${bottomBorder}\n`;

    if (highlightWinLine && highlightWinLine.length === 3) {
      board += `\n🌟 WINNING LINE: ${highlightWinLine.map(i => i + 1).join(' → ')} 🌟\n`;
      const winCells = highlightWinLine.map(i => cells[i]).join(' ');
      board += `${winCells}\n`;
    }

    return board;
  }

  validateMove(playerId: string, move: string): MoveValidation {
    const currentPlayerId = this.state.players[this.currentTurnIndex].id;
    console.log(`🔍 Validating: playerId=${playerId}, currentTurn=${currentPlayerId}, index=${this.currentTurnIndex}`);

    if (playerId !== currentPlayerId) {
      return {
        valid: false,
        error: `Not your turn. Current turn: ${this.state.players[this.currentTurnIndex].name}`
      };
    }

    const position = parseInt(move);

    if (isNaN(position) || position < 1 || position > 9) {
      return {
        valid: false,
        error: 'Invalid position. Choose 1-9'
      };
    }

    const index = position - 1;
    if (this.board[index] !== null) {
      return {
        valid: false,
        error: `Position ${position} is already taken`
      };
    }

    const player = this.findPlayerById(playerId);
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }

    return { valid: true };
  }

  submitMove(playerId: string, move: string): { success: boolean; error?: string; roundCompleted?: boolean } {
    const validation = this.validateMove(playerId, move);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const position = parseInt(move) - 1;
    const symbol = this.playerSymbols.get(playerId)!;
    this.board[position] = symbol;

    const player = this.findPlayerById(playerId)!;
    const modelDisplay = player.modelName ? ` (${player.modelName})` : '';
    console.log(`\n${SYMBOLS[symbol]} ${player.name}${modelDisplay} plays position ${parseInt(move)}`);
    console.log(this.drawBoard());

    const { winner: winnerSymbol, line: winLine } = this.checkWinner();
    const boardFull = this.isBoardFull();

    if (winnerSymbol || boardFull) {
      let winnerId: string | null = null;

      if (winnerSymbol) {
        const winnerEntry = Array.from(this.playerSymbols.entries()).find(([_, symbol]) => symbol === winnerSymbol);
        winnerId = winnerEntry![0];
        const winnerPlayer = this.findPlayerById(winnerId)!;

        console.log(this.drawBoard(winLine));
        const modelDisplay = winnerPlayer.modelName ? ` (${winnerPlayer.modelName})` : '';
        console.log(`\n🎉 ${SYMBOLS[winnerSymbol as keyof typeof SYMBOLS]} ${winnerPlayer.name}${modelDisplay} WINS THIS ROUND!\n`);

        const roundsWon = (this.roundsWon.get(winnerId) || 0) + 1;
        this.roundsWon.set(winnerId, roundsWon);

        if (winnerId) {
          const winnerPlayerState = this.state.players.find(p => p.id === winnerId);
          if (winnerPlayerState) winnerPlayerState.score++;
        }
      } else if (boardFull) {
        console.log(`\n🤝 TIE GAME - Board is full!\n`);
      }

      this.board = Array(9).fill(null);
      this.currentTurnIndex = 0;
      this.state.round++;

      if (this.isGameOver()) {
        this.state.status = 'finished';
        this.state.winnerId = this.getWinner();
      }

      return { success: true, roundCompleted: true };
    }

    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.state.players.length;

    return { success: true, roundCompleted: false };
  }

  private checkWinner(): { winner: string | null; line?: number[] } {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
        return { winner: this.board[a], line };
      }
    }
    return { winner: null };
  }

  private isBoardFull(): boolean {
    return this.board.every(cell => cell !== null);
  }

  evaluateRound(): RoundResult {
    return {
      winnerId: null,
      tie: false,
      moves: [],
      explanation: 'Turn-based game, evaluated per move'
    };
  }

  isGameOver(): boolean {
    const maxWins = Math.ceil(this.state.maxRounds / 2);
    for (const [_, wins] of this.roundsWon) {
      if (wins >= maxWins) {
        return true;
      }
    }

    return this.state.round >= this.state.maxRounds;
  }

  getWinner(): string | null {
    const maxWins = Math.ceil(this.state.maxRounds / 2);

    for (const [playerId, wins] of this.roundsWon) {
      if (wins >= maxWins) {
        const winner = this.findPlayerById(playerId)!;
        const loser = this.state.players.find(p => p.id !== playerId)!;
        const winnerSymbol = this.playerSymbols.get(playerId)!;

        const winnerModel = winner.modelName ? ` (${winner.modelName})` : '';
        const loserModel = loser.modelName ? ` (${loser.modelName})` : '';

        console.log(`\n${'═'.repeat(70)}`);
        console.log(`🏆 MATCH WINNER: ${SYMBOLS[winnerSymbol]} ${winner.name}${winnerModel}! 🏆`);
        console.log(`   Final Score: ${winner.name}${winnerModel} ${this.roundsWon.get(winner.id)} ━━━ ${this.roundsWon.get(loser.id)} ${loser.name}${loserModel}`);
        console.log(`${'═'.repeat(70)}\n`);

        return playerId;
      }
    }

    if (this.state.round >= this.state.maxRounds) {
      const entries = Array.from(this.roundsWon.entries());
      entries.sort((a, b) => b[1] - a[1]);

      if (entries[0][1] > entries[1][1]) {
        const winnerId = entries[0][0];
        const winner = this.findPlayerById(winnerId)!;
        const loser = this.state.players.find(p => p.id !== winnerId)!;
        const winnerSymbol = this.playerSymbols.get(winnerId)!;

        const winnerModel = winner.modelName ? ` (${winner.modelName})` : '';
        const loserModel = loser.modelName ? ` (${loser.modelName})` : '';

        console.log(`\n${'═'.repeat(70)}`);
        console.log(`🏆 MATCH WINNER: ${SYMBOLS[winnerSymbol]} ${winner.name}${winnerModel}! 🏆`);
        console.log(`   Final Score: ${winner.name}${winnerModel} ${entries[0][1]} ━━━ ${entries[1][1]} ${loser.name}${loserModel}`);
        console.log(`${'═'.repeat(70)}\n`);

        return winnerId;
      }
    }

    return null;
  }

  getAvailableMoves(): string[] {
    return this.board
      .map((cell, idx) => cell === null ? String(idx + 1) : null)
      .filter((pos): pos is string => pos !== null);
  }

  getGameInstructions(): string {
    return 'Choose a position (1-9) on the 3x3 grid. Get 3 in a row (horizontal, vertical, or diagonal) to win the round. Best of 3 rounds wins the match!';
  }

  getPublicState(): any {
    const state = super.getPublicState();
    return {
      ...state,
      board: this.board,
      playerSymbols: Object.fromEntries(this.playerSymbols),
      roundsWon: Object.fromEntries(this.roundsWon),
      currentTurn: this.state.players[this.currentTurnIndex]?.id
    };
  }
}
