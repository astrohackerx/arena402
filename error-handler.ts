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
      console.log(`⚠️  Attempt ${attempt}/${maxRetries} failed, retrying in ${delayMs}ms...`);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
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
      const signature = await connection.sendTransaction(transaction, signers, {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });

      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      return signature;
    }, 2, 1000);
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
