import { describe, expect, it, vi } from 'vitest';
import { runConcurrently } from './runConcurrently.js';

describe('runConcurrently', () => {
  it('runs the requested number of tasks with bounded concurrency and returns no task results', async () => {
    let calls = 0;
    let activeTasks = 0;
    let maxActiveTasks = 0;

    const task = vi.fn(async () => {
      const currentCall = calls;
      calls++;
      activeTasks++;
      maxActiveTasks = Math.max(maxActiveTasks, activeTasks);

      await new Promise((resolve) => setTimeout(resolve, 1));
      activeTasks--;

      return currentCall;
    });

    await expect(runConcurrently(5, 2, task)).resolves.toBeUndefined();

    expect(task).toHaveBeenCalledTimes(5);
    expect(maxActiveTasks).toBe(2);
  });

  it('keeps running when tasks fail', async () => {
    const error = new Error('task failure');
    let calls = 0;

    const task = vi.fn(async () => {
      const currentCall = calls;
      calls++;

      if (currentCall === 1 || currentCall === 3) {
        throw error;
      }
    });

    await expect(runConcurrently(5, 2, task)).resolves.toBeUndefined();

    expect(task).toHaveBeenCalledTimes(5);
  });

  it('rejects invalid execution counts', async () => {
    await expect(runConcurrently(-1, 1, async () => undefined)).rejects.toThrow(
      '`times` must be a non-negative integer'
    );
    await expect(runConcurrently(1.5, 1, async () => undefined)).rejects.toThrow(
      '`times` must be a non-negative integer'
    );
  });

  it('rejects invalid concurrency', async () => {
    await expect(runConcurrently(1, 0, async () => undefined)).rejects.toThrow(
      '`concurrency` must be a positive integer'
    );
    await expect(runConcurrently(1, 1.5, async () => undefined)).rejects.toThrow(
      '`concurrency` must be a positive integer'
    );
  });
});
