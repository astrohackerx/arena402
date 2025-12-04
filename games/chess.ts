import { BaseGame, GameConfig, PlayerMove, RoundResult, MoveValidation } from './base-game.js';
import { Chess } from 'chess.js';
import dotenv from 'dotenv';

dotenv.config();

const MOVE_PRICE = parseFloat(process.env.MOVE_PRICE || '0');

export class ChessGame extends BaseGame {
  private chess: Chess;
  private moveTimeout: number = 30000;
  private currentTurnIndex: number;
  private moveTimers: Map<string, NodeJS.Timeout> = new Map();
  private moveHistory: Array<{ player: string; move: string; fen: string; commentary?: string }> = [];

  static readonly CONFIG: GameConfig = {
    id: 'chess',
    name: 'Chess',
    description: 'Full chess game with commentary. Checkmate your opponent!',
    minPlayers: 2,
    maxPlayers: 2,
    entryFee: 0.001,
    movePrice: MOVE_PRICE,
    winCondition: 'Checkmate, resignation, or timeout',
    maxRounds: 1,
    turnBased: true
  };

  constructor(gameId: string, players: Array<{ id: string; name: string; modelName?: string }>) {
    // Randomly shuffle players so colors are random
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    super(ChessGame.CONFIG, gameId, shuffledPlayers);
    this.chess = new Chess();
    this.currentTurnIndex = 0;

    console.log(`♔ ${this.state.players[0].name} plays WHITE`);
    console.log(`♚ ${this.state.players[1].name} plays BLACK`);
  }

  validateMove(playerId: string, move: string): MoveValidation {
    const currentPlayerId = this.state.players[this.currentTurnIndex].id;

    if (playerId !== currentPlayerId) {
      return {
        valid: false,
        error: `Not your turn. Current turn: ${this.state.players[this.currentTurnIndex].name}`
      };
    }

    try {
      const testChess = new Chess(this.chess.fen());
      const result = testChess.move(move);

      if (!result) {
        return {
          valid: false,
          error: `Illegal move: ${move}. Valid moves: ${this.chess.moves().slice(0, 10).join(', ')}...`
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Invalid move format: ${move}. Use standard algebraic notation (e.g., e4, Nf3, O-O)`
      };
    }
  }

  submitMove(playerId: string, move: string, commentary?: string): { success: boolean; error?: string; roundCompleted?: boolean } {
    const validation = this.validateMove(playerId, move);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const player = this.findPlayerById(playerId)!;
    const modelDisplay = player.modelName ? ` (${player.modelName})` : '';

    try {
      const moveResult = this.chess.move(move);

      if (!moveResult) {
        return { success: false, error: 'Move failed' };
      }

      this.moveHistory.push({
        player: player.name,
        move: moveResult.san,
        fen: this.chess.fen(),
        commentary
      });

      const color = this.chess.turn() === 'w' ? '⚪' : '⚫';
      console.log(`\n${color} ${player.name}${modelDisplay} plays: ${moveResult.san}`);

      if (commentary) {
        console.log(`💬 "${commentary}"`);
      }

      console.log(this.drawBoard());

      if (this.chess.isCheckmate()) {
        console.log(`\n♔ CHECKMATE! ${player.name}${modelDisplay} WINS! ♔\n`);
        const winnerPlayerState = this.state.players.find(p => p.id === playerId);
        if (winnerPlayerState) winnerPlayerState.score = 1;
        this.state.status = 'finished';
        this.state.winnerId = playerId;
        return { success: true, roundCompleted: true };
      }

      if (this.chess.isCheck()) {
        console.log(`⚠️  CHECK!`);
      }

      if (this.chess.isDraw()) {
        console.log(`\n🤝 DRAW! Game over.\n`);
        this.state.status = 'finished';
        return { success: true, roundCompleted: true };
      }

      if (this.chess.isStalemate()) {
        console.log(`\n😐 STALEMATE! Draw.\n`);
        this.state.status = 'finished';
        return { success: true, roundCompleted: true };
      }

      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.state.players.length;
      this.state.round++;

      return { success: true, roundCompleted: false };
    } catch (error) {
      return { success: false, error: `Move error: ${error}` };
    }
  }

  private drawBoard(): string {
    const board = this.chess.board();
    const pieces: Record<string, string> = {
      'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
      'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'
    };

    let output = '\n  ╔═══╦═══╦═══╦═══╦═══╦═══╦═══╦═══╗\n';

    for (let i = 0; i < 8; i++) {
      output += `${8 - i} ║`;
      for (let j = 0; j < 8; j++) {
        const square = board[i][j];
        const piece = square ? pieces[square.type] : ' ';
        output += ` ${piece} ║`;
      }
      output += `\n`;
      if (i < 7) {
        output += '  ╠═══╬═══╬═══╬═══╬═══╬═══╬═══╬═══╣\n';
      }
    }

    output += '  ╚═══╩═══╩═══╩═══╩═══╩═══╩═══╩═══╝\n';
    output += '    a   b   c   d   e   f   g   h\n';

    return output;
  }

  evaluateRound(): RoundResult {
    return {
      winnerId: null,
      tie: false,
      moves: [],
      explanation: 'Chess is evaluated per move'
    };
  }

  isGameOver(): boolean {
    return this.chess.isGameOver() || this.state.status === 'finished';
  }

  getWinner(): string | null {
    if (this.chess.isCheckmate()) {
      const loserColor = this.chess.turn();
      const winnerIndex = loserColor === 'w' ? 1 : 0;
      return this.state.players[winnerIndex].id;
    }

    if (this.state.winnerId) {
      return this.state.winnerId;
    }

    return null;
  }

  getAvailableMoves(): string[] {
    return this.chess.moves();
  }

  getGameInstructions(): string {
    return 'Play chess using standard algebraic notation (e.g., e4, Nf3, Qxd5, O-O). Checkmate your opponent to win!';
  }

  getPublicState(): any {
    const state = super.getPublicState();
    return {
      ...state,
      fen: this.chess.fen(),
      pgn: this.chess.pgn(),
      turn: this.chess.turn() === 'w' ? 'white' : 'black',
      isCheck: this.chess.isCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isDraw: this.chess.isDraw(),
      isStalemate: this.chess.isStalemate(),
      moveHistory: this.moveHistory,
      currentTurn: this.state.players[this.currentTurnIndex]?.id,
      lastMove: this.moveHistory[this.moveHistory.length - 1]
    };
  }

  getMoveHistory(): Array<{ player: string; move: string; fen: string; commentary?: string }> {
    return this.moveHistory;
  }

  getCurrentFEN(): string {
    return this.chess.fen();
  }
}
