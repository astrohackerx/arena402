export interface GameConfig {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  entryFee: number;
  winCondition: string;
  maxRounds?: number;
  turnBased?: boolean;
}

export interface PlayerMove {
  playerId: string;
  move: string;
  timestamp: number;
}

export interface RoundResult {
  winnerId: string | null;
  tie: boolean;
  moves: PlayerMove[];
  explanation: string;
}

export interface GameState {
  gameId: string;
  gameType: string;
  round: number;
  maxRounds: number;
  players: Array<{
    id: string;
    name: string;
    score: number;
    modelName?: string;
  }>;
  currentMoves: Map<string, string>;
  history: RoundResult[];
  status: 'waiting' | 'active' | 'finished';
  winnerId: string | null;
}

export interface MoveValidation {
  valid: boolean;
  error?: string;
}

export abstract class BaseGame {
  protected config: GameConfig;
  protected state: GameState;

  isTurnBased(): boolean {
    return this.config.turnBased || false;
  }

  constructor(config: GameConfig, gameId: string, players: Array<{ id: string; name: string; modelName?: string }>) {
    this.config = config;
    this.state = {
      gameId,
      gameType: config.id,
      round: 0,
      maxRounds: config.maxRounds || 9,
      players: players.map(p => ({ ...p, score: 0 })),
      currentMoves: new Map(),
      history: [],
      status: 'active',
      winnerId: null
    };
  }

  abstract validateMove(playerId: string, move: string): MoveValidation;
  abstract evaluateRound(): RoundResult;
  abstract isGameOver(): boolean;
  abstract getWinner(): string | null;
  abstract getAvailableMoves(): string[];
  abstract getGameInstructions(): string;

  submitMove(playerId: string, move: string): { success: boolean; error?: string; roundCompleted?: boolean } {
    const validation = this.validateMove(playerId, move);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    this.state.currentMoves.set(playerId, move);

    if (this.state.currentMoves.size === this.state.players.length) {
      const result = this.evaluateRound();
      this.state.history.push(result);
      this.state.round++;

      if (result.winnerId) {
        const player = this.state.players.find(p => p.id === result.winnerId);
        if (player) player.score++;
      }

      this.state.currentMoves.clear();

      if (this.isGameOver()) {
        this.state.status = 'finished';
        this.state.winnerId = this.getWinner();
      }

      return { success: true, roundCompleted: true };
    }

    return { success: true, roundCompleted: false };
  }

  getPublicState(): any {
    return {
      gameId: this.state.gameId,
      gameType: this.state.gameType,
      round: this.state.round,
      maxRounds: this.state.maxRounds,
      players: this.state.players,
      history: this.state.history,
      status: this.state.status,
      winnerId: this.state.winnerId,
      availableMoves: this.getAvailableMoves(),
      instructions: this.getGameInstructions()
    };
  }

  getConfig(): GameConfig {
    return this.config;
  }

  getGameId(): string {
    return this.state.gameId;
  }

  getStatus(): 'waiting' | 'active' | 'finished' {
    return this.state.status;
  }

  protected findPlayerById(playerId: string) {
    return this.state.players.find(p => p.id === playerId);
  }
}
