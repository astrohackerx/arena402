import { BaseGame, GameConfig, PlayerMove, RoundResult, MoveValidation } from './base-game.js';

export class CoinFlipGame extends BaseGame {
  static readonly CONFIG: GameConfig = {
    id: 'coin-flip',
    name: 'Coin Flip',
    description: 'Simple coin flip game - call heads or tails correctly to win',
    minPlayers: 2,
    maxPlayers: 2,
    entryFee: 0.001,
    winCondition: 'First to 3 wins',
    maxRounds: 5
  };

  constructor(gameId: string, players: Array<{ id: string; name: string }>) {
    super(CoinFlipGame.CONFIG, gameId, players);
  }

  validateMove(playerId: string, move: string): MoveValidation {
    const validMoves = ['heads', 'tails'];

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

    const actualFlip = Math.random() < 0.5 ? 'heads' : 'tails';
    console.log(`\n🪙 The coin landed on: ${actualFlip.toUpperCase()}`);

    const winners = moves.filter(m => m.move.toLowerCase() === actualFlip);

    let winnerId: string | null = null;
    let explanation: string;

    if (winners.length === 0) {
      explanation = 'Nobody guessed correctly!';
      console.log(`❌ Round ${this.state.round}: No winners this round`);
    } else if (winners.length === moves.length) {
      explanation = 'Everyone guessed correctly - it\'s a tie!';
      console.log(`🤝 Round ${this.state.round}: TIE - Everyone guessed ${actualFlip}!`);
    } else {
      winnerId = winners[0].playerId;
      const winner = this.findPlayerById(winnerId)!;
      winner.score++;
      explanation = `${winner.name} guessed ${actualFlip} correctly!`;
      console.log(`🏆 Round ${this.state.round}: ${winner.name} WINS!`);
      console.log(`   Guessed: ${actualFlip.toUpperCase()} ✅`);
    }

    const scores = this.state.players.map(p => `${p.name}: ${p.score}`).join(' | ');
    console.log(`   Score: ${scores}\n`);

    return {
      winnerId,
      tie: winnerId === null,
      moves,
      explanation
    };
  }

  isGameOver(): boolean {
    const maxScore = Math.ceil(this.state.maxRounds / 2) + 1;
    const winner = this.state.players.find(p => p.score >= maxScore);

    if (winner || this.state.round >= this.state.maxRounds) {
      return true;
    }

    return false;
  }

  getWinner(): string | null {
    const maxScore = Math.ceil(this.state.maxRounds / 2) + 1;
    const winner = this.state.players.find(p => p.score >= maxScore);

    if (winner) {
      console.log(`\n${'═'.repeat(70)}`);
      console.log(`🎉🎊 GAME OVER! ${winner.name} WINS!`);
      console.log(`${'═'.repeat(70)}\n`);
      return winner.id;
    }

    if (this.state.round >= this.state.maxRounds) {
      const sorted = [...this.state.players].sort((a, b) => b.score - a.score);
      if (sorted[0].score > sorted[1].score) {
        console.log(`\n${'═'.repeat(70)}`);
        console.log(`🎉 GAME OVER! ${sorted[0].name} WINS BY POINTS!`);
        console.log(`${'═'.repeat(70)}\n`);
        return sorted[0].id;
      }
    }

    return null;
  }

  getAvailableMoves(): string[] {
    return ['heads', 'tails'];
  }

  getGameInstructions(): string {
    return 'Call heads or tails. The coin will be flipped and whoever guesses correctly wins the round. First to 3 wins!';
  }
}
