import { BaseGame, GameConfig, PlayerMove, RoundResult, MoveValidation } from './base-game.js';
import dotenv from 'dotenv';

dotenv.config();

const MOVE_PRICE = parseFloat(process.env.MOVE_PRICE || '0');

const MOVE_ICONS = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️'
};

const WIN_COMMENTARY = [
  'Absolutely demolished!',
  'No contest!',
  'Savage!',
  'Outplayed!',
  'Rekt!',
  'Get good!',
  'Not even close!',
  'Boom!',
  'Calculated!',
  'Too easy!'
];

const TIE_COMMENTARY = [
  'Great minds think alike... or do they?',
  'Perfectly balanced, as all things should be',
  'Two AIs, one brain cell',
  'It\'s a stalemate!',
  'Nobody saw that coming... except everyone',
  'Try again, but with feeling!',
  'The crowd is confused',
  'A tie? Really?',
  'Even the AI is bored',
  'Statistical anomaly detected!'
];

export class RockPaperScissorsGame extends BaseGame {
  static readonly CONFIG: GameConfig = {
    id: 'rock-paper-scissors',
    name: 'Rock Paper Scissors',
    description: 'Classic hand game - Rock beats Scissors, Scissors beats Paper, Paper beats Rock',
    minPlayers: 2,
    maxPlayers: 2,
    entryFee: 0.001,
    movePrice: MOVE_PRICE,
    winCondition: 'First to 5 wins',
    maxRounds: 9
  };

  constructor(gameId: string, players: Array<{ id: string; name: string; modelName?: string }>) {
    super(RockPaperScissorsGame.CONFIG, gameId, players);
  }

  validateMove(playerId: string, move: string): MoveValidation {
    const validMoves = ['rock', 'paper', 'scissors'];

    if (!validMoves.includes(move.toLowerCase())) {
      return {
        valid: false,
        error: `Invalid move. Choose: ${validMoves.join(', ')}`
      };
    }

    const player = this.findPlayerById(playerId);
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }

    if (this.state.currentMoves.has(playerId)) {
      return { valid: false, error: 'You already made your move this round' };
    }

    return { valid: true };
  }

  evaluateRound(): RoundResult {
    this.state.round++;

    const moves: PlayerMove[] = [];
    this.state.currentMoves.forEach((move, playerId) => {
      moves.push({ playerId, move, timestamp: Date.now() });
    });

    if (moves.length !== 2) {
      throw new Error('Expected exactly 2 moves for Rock Paper Scissors');
    }

    const [move1, move2] = moves;
    const player1 = this.findPlayerById(move1.playerId)!;
    const player2 = this.findPlayerById(move2.playerId)!;

    const outcome = this.determineWinner(move1.move, move2.move);

    let winnerId: string | null = null;
    let explanation: string;

    if (outcome === 0) {
      explanation = `${MOVE_ICONS[move1.move as keyof typeof MOVE_ICONS]} vs ${MOVE_ICONS[move2.move as keyof typeof MOVE_ICONS]} - ${TIE_COMMENTARY[Math.floor(Math.random() * TIE_COMMENTARY.length)]}`;
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`🤝 ROUND ${this.state.round}: TIE GAME!`);
      console.log(`   ${MOVE_ICONS[move1.move as keyof typeof MOVE_ICONS]} ${move1.move.toUpperCase()} vs ${move2.move.toUpperCase()} ${MOVE_ICONS[move2.move as keyof typeof MOVE_ICONS]}`);
      console.log(`   ${explanation}`);
      console.log(`   Score: ${player1.name} ${player1.score} ━━━ ${player2.score} ${player2.name}`);
      console.log(`${'─'.repeat(60)}\n`);
    } else if (outcome === 1) {
      winnerId = move1.playerId;
      explanation = `${MOVE_ICONS[move1.move as keyof typeof MOVE_ICONS]} ${player1.name} destroys ${MOVE_ICONS[move2.move as keyof typeof MOVE_ICONS]} ${player2.name}! ${WIN_COMMENTARY[Math.floor(Math.random() * WIN_COMMENTARY.length)]}`;
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`🏆 ROUND ${this.state.round}: ${player1.name} WINS!`);
      console.log(`   ${MOVE_ICONS[move1.move as keyof typeof MOVE_ICONS]} ${move1.move.toUpperCase()} beats ${move2.move.toUpperCase()} ${MOVE_ICONS[move2.move as keyof typeof MOVE_ICONS]}`);
      console.log(`   ${explanation}`);
      console.log(`   Score: ${player1.name} ${player1.score} ━━━ ${player2.score} ${player2.name}`);
      console.log(`${'─'.repeat(60)}\n`);
    } else {
      winnerId = move2.playerId;
      explanation = `${MOVE_ICONS[move2.move as keyof typeof MOVE_ICONS]} ${player2.name} crushes ${MOVE_ICONS[move1.move as keyof typeof MOVE_ICONS]} ${player1.name}! ${WIN_COMMENTARY[Math.floor(Math.random() * WIN_COMMENTARY.length)]}`;
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`🏆 ROUND ${this.state.round}: ${player2.name} WINS!`);
      console.log(`   ${MOVE_ICONS[move2.move as keyof typeof MOVE_ICONS]} ${move2.move.toUpperCase()} beats ${move1.move.toUpperCase()} ${MOVE_ICONS[move1.move as keyof typeof MOVE_ICONS]}`);
      console.log(`   ${explanation}`);
      console.log(`   Score: ${player1.name} ${player1.score} ━━━ ${player2.score} ${player2.name}`);
      console.log(`${'─'.repeat(60)}\n`);
    }

    return {
      winnerId,
      tie: outcome === 0,
      moves,
      explanation
    };
  }

  private determineWinner(move1: string, move2: string): number {
    if (move1 === move2) return 0;

    if (
      (move1 === 'rock' && move2 === 'scissors') ||
      (move1 === 'scissors' && move2 === 'paper') ||
      (move1 === 'paper' && move2 === 'rock')
    ) {
      return 1;
    }

    return -1;
  }

  isGameOver(): boolean {
    const maxScore = Math.ceil(this.state.maxRounds / 2);
    const winner = this.state.players.find(p => p.score >= maxScore);

    if (winner || this.state.round >= this.state.maxRounds) {
      return true;
    }

    return false;
  }

  getWinner(): string | null {
    const maxScore = Math.ceil(this.state.maxRounds / 2);
    const winner = this.state.players.find(p => p.score >= maxScore);

    if (winner) {
      const loser = this.state.players.find(p => p.id !== winner.id)!;
      console.log(`\n${'═'.repeat(70)}`);
      console.log(`🎉🎊 GAME OVER! ${winner.name} DOMINATES!`);
      console.log(`   Final Score: ${winner.name} ${winner.score} ━━━ ${loser.score} ${loser.name}`);
      console.log(`${'═'.repeat(70)}\n`);
      return winner.id;
    }

    if (this.state.round >= this.state.maxRounds) {
      const sorted = [...this.state.players].sort((a, b) => b.score - a.score);
      if (sorted[0].score > sorted[1].score) {
        console.log(`\n${'═'.repeat(70)}`);
        console.log(`🎉 GAME OVER! ${sorted[0].name} WINS BY POINTS!`);
        console.log(`   Final Score: ${sorted[0].name} ${sorted[0].score} ━━━ ${sorted[1].score} ${sorted[1].name}`);
        console.log(`${'═'.repeat(70)}\n`);
        return sorted[0].id;
      }
    }

    return null;
  }

  getAvailableMoves(): string[] {
    return ['rock', 'paper', 'scissors'];
  }

  getGameInstructions(): string {
    return 'Choose your move: rock, paper, or scissors. Rock beats Scissors, Scissors beats Paper, Paper beats Rock. First to 5 wins!';
  }
}
