import OpenAI from 'openai';

export interface MoveDecision {
  move: string;
  rawResponse: string;
  confidence?: number;
}

export abstract class BaseStrategy {
  protected openai: OpenAI;
  protected agentName: string;
  protected llmModel: string;

  constructor(openai: OpenAI, agentName: string, llmModel: string) {
    this.openai = openai;
    this.agentName = agentName;
    this.llmModel = llmModel;
  }

  abstract decideMove(gameState: any, myId: string): Promise<MoveDecision>;

  async testLLMConnection(): Promise<boolean> {
    try {
      console.log(`\n🧪 Testing LLM connection for ${this.agentName}...`);
      console.log(`   Model: ${this.llmModel}`);
      console.log(`   API Base: ${this.openai.baseURL}`);

      const response = await this.openai.chat.completions.create({
        model: this.llmModel,
        messages: [
          { role: 'system', content: 'You are a friendly AI agent ready to compete.' },
          { role: 'user', content: 'Introduce yourself briefly and say you\'re ready to play! Keep it under 15 words.' }
        ],
        temperature: 0.9,
        max_tokens: 50
      });

      const greeting = response.choices[0]?.message?.content?.trim() || '';
      console.log(`   💬 LLM says: "${greeting}"`);
      console.log(`   ✅ LLM connection successful!\n`);
      return true;

    } catch (error: any) {
      console.error(`\n❌ LLM Connection Test FAILED for ${this.agentName}!`);
      console.error(`   Model: ${this.llmModel}`);
      console.error(`   API Base: ${this.openai.baseURL}`);
      console.error(`   Error: ${error.message}`);
      if (error.status) console.error(`   Status: ${error.status}`);
      console.error(`\n⚠️  Agent will continue but may use random moves!\n`);
      return false;
    }
  }

  protected async queryLLM(prompt: string, validMoves: string[]): Promise<MoveDecision> {
    try {
      console.log(`\n🤖 ${this.agentName} querying LLM...`);
      console.log(`   Model: ${this.llmModel}`);
      console.log(`   API Base: ${this.openai.baseURL}`);

      const response = await this.openai.chat.completions.create({
        model: this.llmModel,
        messages: [
          { role: 'system', content: 'You are a strategic AI. Respond with ONLY ONE WORD: the move.' },
          { role: 'user', content: prompt }
        ],
        temperature: 1.2,
        max_tokens: 20
      });

      const rawResponse = response.choices[0]?.message?.content?.trim().toLowerCase() || '';
      console.log(`   ✅ LLM Response: "${rawResponse}"`);

      const move = validMoves.find(m => rawResponse.includes(m.toLowerCase()));

      if (!move) {
        const fallback = validMoves[Math.floor(Math.random() * validMoves.length)];
        console.log(`   ⚠️  Invalid move, using fallback: ${fallback}`);
        return { move: fallback, rawResponse };
      }

      console.log(`   ✅ Parsed move: ${move}`);
      return { move, rawResponse };

    } catch (error: any) {
      console.error(`\n❌ ${this.agentName} LLM Error:`);
      console.error(`   Model: ${this.llmModel}`);
      console.error(`   Error: ${error.message}`);
      console.error(`   Stack: ${error.stack?.split('\n')[0]}`);
      const fallback = validMoves[Math.floor(Math.random() * validMoves.length)];
      console.log(`   ⚠️  Using random fallback: ${fallback}`);
      return { move: fallback, rawResponse: 'error' };
    }
  }
}
