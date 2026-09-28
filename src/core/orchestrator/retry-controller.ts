export interface RetryOptions {
  maxAttempts: number;
  shouldRetry: (attempt: number, error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e as Error;
      if (attempt < options.maxAttempts && options.shouldRetry(attempt, lastError)) {
        options.onRetry?.(attempt, lastError);
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}