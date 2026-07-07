/**
 * Runs the task `times` times with `concurrency` concurrency.
 * Does not interrupt remaining tasks when one or more fail.
 * Make sure to handle/log errors in your tasks, they will get ignored here.
 */
export async function runConcurrently(
  times: number,
  concurrency: number,
  task: () => Promise<unknown>
): Promise<void> {
  if (!Number.isInteger(times) || times < 0) {
    throw new RangeError('`times` must be a non-negative integer');
  }

  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError('`concurrency` must be a positive integer');
  }

  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < times) {
      nextIndex++;
      try {
        await task();
      } catch {
        // Keep running the remaining requested tasks.
        // The caller is responsible for handling/logging.
      }
    }
  }

  const workersCount = Math.min(times, concurrency);
  await Promise.all(Array.from({ length: workersCount }, worker));
}
