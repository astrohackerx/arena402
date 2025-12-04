import { Connection, TransactionSignature, SendTransactionError } from '@solana/web3.js';

export class BlockchainError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'BlockchainError';
  }
}

function isTransientError(error: unknown): boolean {
  const errorStr = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    errorStr.includes('fetch failed') ||
    errorStr.includes('network') ||
    errorStr.includes('timeout') ||
    errorStr.includes('econnrefused') ||
    errorStr.includes('enotfound') ||
    errorStr.includes('etimedout') ||
    errorStr.includes('429') ||
    errorStr.includes('503') ||
    errorStr.includes('rate limit') ||
    errorStr.includes('blockhash not found')
  );
}

export async function retryBlockchainOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isTransient = isTransientError(error);

      if (!isTransient && attempt < maxRetries) {
        console.log(`⚠️  Non-transient error, skipping retries`);
        throw error;
      }

      if (attempt < maxRetries) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`⚠️  Attempt ${attempt}/${maxRetries} failed: ${errorMsg.slice(0, 80)}`);
        console.log(`   Retrying in ${(delayMs / 1000).toFixed(1)}s...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
      } else {
        console.log(`❌ All ${maxRetries} attempts failed`);
      }
    }
  }

  throw new BlockchainError(
    `Operation failed after ${maxRetries} attempts`,
    lastError
  );
}

export async function safeGetBalance(
  connection: Connection,
  publicKey: any
): Promise<number> {
  try {
    return await retryBlockchainOperation(
      () => connection.getBalance(publicKey),
      3,
      500
    );
  } catch (error) {
    throw new BlockchainError(
      'Failed to fetch wallet balance',
      error,
      { publicKey: publicKey.toString() }
    );
  }
}

export async function safeSendTransaction(
  connection: Connection,
  transaction: any,
  signers: any[],
  description: string = 'transaction'
): Promise<TransactionSignature> {
  try {
    return await retryBlockchainOperation(async () => {
      // Get fresh blockhash for each retry attempt
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;

      const signature = await connection.sendTransaction(transaction, signers, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });

      // Wait for confirmation with timeout
      const confirmation = await Promise.race([
        connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight
        }, 'confirmed'),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Confirmation timeout')), 30000)
        )
      ]);

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      return signature;
    }, 4, 2000);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new BlockchainError(
      `Failed to send ${description}`,
      error,
      { signers: signers.map(s => s.publicKey.toString()) }
    );
  }
}

export function handleBlockchainError(error: unknown, context: string): string {
  if (error instanceof BlockchainError) {
    console.error(`❌ Blockchain Error [${context}]:`, error.message);
    if (error.context) {
      console.error('   Context:', error.context);
    }
    return error.message;
  }

  if (error instanceof Error) {
    console.error(`❌ Error [${context}]:`, error.message);
    return error.message;
  }

  console.error(`❌ Unknown Error [${context}]:`, error);
  return 'An unexpected error occurred';
}
