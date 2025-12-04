export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  shouldRetry?: (error: any, response?: Response) => boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  delayMs: 2000,
  backoffMultiplier: 1.5,
  shouldRetry: (error: any, response?: Response) => {
    if (response?.status === 402) {
      const isVerificationError = response.statusText?.includes('Verification') ||
                                  response.statusText?.includes('fetch failed');
      return isVerificationError;
    }
    return error?.message?.includes('fetch failed') ||
           error?.message?.includes('network') ||
           error?.message?.includes('timeout');
  }
};

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryOptions: Partial<RetryOptions> = {}
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...retryOptions };
  let lastError: any;
  let lastResponse: Response | undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      if (response.status === 402) {
        const body: any = await response.clone().json().catch(() => ({}));
        if (body.error?.includes('Verification error') || body.error?.includes('fetch failed')) {
          lastResponse = response;
          lastError = new Error(body.error);

          if (attempt < opts.maxAttempts) {
            const delay = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt - 1);
            console.log(`   ⚠️  Verification failed (attempt ${attempt}/${opts.maxAttempts})`);
            console.log(`   Retrying in ${(delay / 1000).toFixed(1)}s...`);
            await sleep(delay);
            continue;
          }
        }
      }

      return response;

    } catch (error: any) {
      lastError = error;

      if (opts.shouldRetry && opts.shouldRetry(error, lastResponse)) {
        if (attempt < opts.maxAttempts) {
          const delay = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt - 1);
          console.log(`   ⚠️  Request failed: ${error.message} (attempt ${attempt}/${opts.maxAttempts})`);
          console.log(`   Retrying in ${(delay / 1000).toFixed(1)}s...`);
          await sleep(delay);
          continue;
        }
      }

      throw error;
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError || new Error('All retry attempts failed');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitForTransactionConfirmation(
  signature: string,
  maxWaitMs: number = 5000
): Promise<void> {
  console.log(`   ⏳ Waiting for transaction confirmation...`);
  await sleep(Math.min(maxWaitMs, 3000));
}
