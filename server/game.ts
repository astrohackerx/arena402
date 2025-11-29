/**
 * Rock Paper Scissors Game
 * Best of 5 rounds - first to 3 wins takes the prize!
 */

export type Move = 'rock' | 'paper' | 'scissors';
export type RoundResult = 'win' | 'lose' | 'tie';

export interface GameState {
  gameId: string;
  round: number;
  maxRounds: number;
  players: PlayerState[];
  currentRound?: RoundState;
  roundHistory: CompletedRound[];
  status: 'waiting' | 'playing' | 'finished';
  winnerId?: string;
}

export interface PlayerState {
  id: string;
  name: string;
  wallet: string;
  score: number;
}

export interface RoundState {
  roundNumber: number;
  moves: Map<string, Move>;
  waitingFor: string[];
}

export interface CompletedRound {
  roundNumber: number;
  moves: Record<string, Move>;
  winnerId: string | null;
  results: Record<string, RoundResult>;
  commentary: string;
}

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

const GAME_START_COMMENTS = [
  'Let the carnage begin!',
  'May the best algorithm win!',
  'AI vs AI - humanity already lost',
  'Time to settle this like bots!',
  'Get ready to rumble!',
  'Who programmed these clowns?',
  'This is going to be legendary... or not',
  'Fighting for crypto dignity!'
];

const GAME_END_COMMENTS = [
  'What a match!',
  'The crowd goes wild!',
  'Absolutely legendary!',
  'That\'s how it\'s done!',
  'Victory tastes like SOL!',
  'GG, opponent deleted',
  'Someone update the leaderboard!',
  'Hall of Fame material right here'
];

export class RockPaperScissorsGame {
  private state: GameState;

  constructor(gameId: string, players: Array<{ id: string; name: string; wallet: string }>) {
    this.state = {
      gameId,
      round: 0,
      maxRounds: 5,
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        wallet: p.wallet,
        score: 0
      })),
      roundHistory: [],
      status: 'waiting'
    };
  }

  start() {
    this.state.status = 'playing';
    this.startNewRound();
    const comment = GAME_START_COMMENTS[Math.floor(Math.random() * GAME_START_COMMENTS.length)];
    console.log(`🎮 Game started! ${comment}`);
    console.log(`   First to 3 wins takes it all!\n`);
  }

  private startNewRound() {
    this.state.round++;
    this.state.currentRound = {
      roundNumber: this.state.round,
      moves: new Map(),
      waitingFor: this.state.players.map(p => p.id)
    };
  }

  makeMove(playerId: string, move: Move): { success: boolean; result?: string; roundComplete?: boolean; gameOver?: boolean } {
    if (this.state.status !== 'playing') {
      return { success: false, result: 'Game not in progress' };
    }

    if (!this.state.currentRound) {
      return { success: false, result: 'No active round' };
    }

    if (!['rock', 'paper', 'scissors'].includes(move)) {
      return { success: false, result: 'Invalid move. Use: rock, paper, or scissors' };
    }

    if (this.state.currentRound.moves.has(playerId)) {
      return { success: false, result: 'You already made your move this round' };
    }

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, result: 'Player not found' };
    }

    // Record the move
    this.state.currentRound.moves.set(playerId, move);
    this.state.currentRound.waitingFor = this.state.currentRound.waitingFor.filter(id => id !== playerId);

    console.log(`${MOVE_ICONS[move]} ${player.name} chose ${move}!`);

    // Check if round is complete
    if (this.state.currentRound.moves.size === this.state.players.length) {
      const roundResult = this.evaluateRound();
      const gameOver = this.checkGameOver();

      return {
        success: true,
        result: `Move recorded: ${move}`,
        roundComplete: true,
        gameOver
      };
    }

    return {
      success: true,
      result: `Move recorded: ${move}. Waiting for opponent...`,
      roundComplete: false
    };
  }

  private evaluateRound(): CompletedRound {
    const round = this.state.currentRound!;
    const [player1, player2] = this.state.players;
    const move1 = round.moves.get(player1.id)!;
    const move2 = round.moves.get(player2.id)!;

    const result = this.determineWinner(move1, move2);
    const results: Record<string, RoundResult> = {};
    let winnerId: string | null = null;
    let commentary: string;

    if (result === 0) {
      // Tie
      results[player1.id] = 'tie';
      results[player2.id] = 'tie';
      commentary = `${MOVE_ICONS[move1]} vs ${MOVE_ICONS[move2]} - ${TIE_COMMENTARY[Math.floor(Math.random() * TIE_COMMENTARY.length)]}`;
      console.log(`\n🤝 Round ${round.roundNumber}: TIE!`);
      console.log(`   ${commentary}\n`);
    } else if (result === 1) {
      // Player 1 wins
      results[player1.id] = 'win';
      results[player2.id] = 'lose';
      winnerId = player1.id;
      player1.score++;
      commentary = `${MOVE_ICONS[move1]} ${player1.name} destroys ${MOVE_ICONS[move2]} ${player2.name}! ${WIN_COMMENTARY[Math.floor(Math.random() * WIN_COMMENTARY.length)]}`;
      console.log(`\n🏆 Round ${round.roundNumber}: ${player1.name} WINS!`);
      console.log(`   ${move1} beats ${move2}`);
      console.log(`   ${commentary}`);
      console.log(`   Score: ${player1.name} ${player1.score} - ${player2.score} ${player2.name}\n`);
    } else {
      // Player 2 wins
      results[player1.id] = 'lose';
      results[player2.id] = 'win';
      winnerId = player2.id;
      player2.score++;
      commentary = `${MOVE_ICONS[move2]} ${player2.name} crushes ${MOVE_ICONS[move1]} ${player1.name}! ${WIN_COMMENTARY[Math.floor(Math.random() * WIN_COMMENTARY.length)]}`;
      console.log(`\n🏆 Round ${round.roundNumber}: ${player2.name} WINS!`);
      console.log(`   ${move2} beats ${move1}`);
      console.log(`   ${commentary}`);
      console.log(`   Score: ${player1.name} ${player1.score} - ${player2.score} ${player2.name}\n`);
    }

    const completedRound: CompletedRound = {
      roundNumber: round.roundNumber,
      moves: {
        [player1.id]: move1,
        [player2.id]: move2
      },
      winnerId,
      results,
      commentary
    };

    this.state.roundHistory.push(completedRound);
    return completedRound;
  }

  private determineWinner(move1: Move, move2: Move): number {
    if (move1 === move2) return 0; // Tie

    if (
      (move1 === 'rock' && move2 === 'scissors') ||
      (move1 === 'scissors' && move2 === 'paper') ||
      (move1 === 'paper' && move2 === 'rock')
    ) {
      return 1; // Player 1 wins
    }

    return -1; // Player 2 wins
  }

  private checkGameOver(): boolean {
    const [player1, player2] = this.state.players;
    const maxScore = Math.ceil(this.state.maxRounds / 2);

    if (player1.score >= maxScore) {
      this.state.winnerId = player1.id;
      this.state.status = 'finished';
      const comment = GAME_END_COMMENTS[Math.floor(Math.random() * GAME_END_COMMENTS.length)];
      console.log(`\n🎉 GAME OVER! ${player1.name} WINS! ${comment}`);
      console.log(`   Final Score: ${player1.name} ${player1.score} - ${player2.score} ${player2.name}\n`);
      return true;
    }

    if (player2.score >= maxScore) {
      this.state.winnerId = player2.id;
      this.state.status = 'finished';
      const comment = GAME_END_COMMENTS[Math.floor(Math.random() * GAME_END_COMMENTS.length)];
      console.log(`\n🎉 GAME OVER! ${player2.name} WINS! ${comment}`);
      console.log(`   Final Score: ${player1.name} ${player1.score} - ${player2.score} ${player2.name}\n`);
      return true;
    }

    // Start next round if game not over
    this.startNewRound();
    return false;
  }

  getState(): GameState {
    return { ...this.state };
  }

  getPublicState() {
    return {
      gameId: this.state.gameId,
      round: this.state.round,
      maxRounds: this.state.maxRounds,
      players: this.state.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score
      })),
      roundHistory: this.state.roundHistory,
      status: this.state.status,
      winnerId: this.state.winnerId,
      waitingFor: this.state.currentRound?.waitingFor || []
    };
  }
}
