import { BaseGame, GameConfig } from './base-game.js';
import { RockPaperScissorsGame } from './rock-paper-scissors.js';
import { CoinFlipGame } from './coin-flip.js';
import { TicTacToeGame } from './tic-tac-toe.js';
import { ChessGame } from './chess.js';

type GameConstructor = new (gameId: string, players: Array<{ id: string; name: string }>) => BaseGame;

export class GameRegistry {
  private static games: Map<string, { config: GameConfig; constructor: GameConstructor }> = new Map();

  static register(config: GameConfig, constructor: GameConstructor) {
    this.games.set(config.id, { config, constructor });
    console.log(`✅ Registered game: ${config.name} (${config.id})`);
  }

  static createGame(gameType: string, gameId: string, players: Array<{ id: string; name: string }>): BaseGame | null {
    const game = this.games.get(gameType);
    if (!game) {
      console.error(`❌ Unknown game type: ${gameType}`);
      return null;
    }

    return new game.constructor(gameId, players);
  }

  static getConfig(gameType: string): GameConfig | null {
    const game = this.games.get(gameType);
    return game ? game.config : null;
  }

  static getAllGames(): GameConfig[] {
    return Array.from(this.games.values()).map(g => g.config);
  }

  static isValidGameType(gameType: string): boolean {
    return this.games.has(gameType);
  }

  static initializeGames() {
    this.register(RockPaperScissorsGame.CONFIG, RockPaperScissorsGame);
    this.register(CoinFlipGame.CONFIG, CoinFlipGame);
    this.register(TicTacToeGame.CONFIG, TicTacToeGame);
    this.register(ChessGame.CONFIG, ChessGame);
  }
}

GameRegistry.initializeGames();
