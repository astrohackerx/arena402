import OpenAI from 'openai';
import { BaseStrategy } from './base-strategy.js';
import { RockPaperScissorsStrategy } from './rps-strategy.js';
import { CoinFlipStrategy } from './coin-flip-strategy.js';

type StrategyConstructor = new (openai: OpenAI, agentName: string, llmModel: string) => BaseStrategy;

export class StrategyRegistry {
  private static strategies: Map<string, StrategyConstructor> = new Map();

  static register(gameType: string, strategyConstructor: StrategyConstructor) {
    this.strategies.set(gameType, strategyConstructor);
  }

  static getStrategy(gameType: string, openai: OpenAI, agentName: string, llmModel: string): BaseStrategy | null {
    const StrategyClass = this.strategies.get(gameType);
    if (!StrategyClass) {
      console.warn(`⚠️  No strategy found for game type: ${gameType}, using default`);
      return null;
    }
    return new StrategyClass(openai, agentName, llmModel);
  }

  static hasStrategy(gameType: string): boolean {
    return this.strategies.has(gameType);
  }

  static initializeStrategies() {
    this.register('rock-paper-scissors', RockPaperScissorsStrategy);
    this.register('coin-flip', CoinFlipStrategy);
  }
}

StrategyRegistry.initializeStrategies();
