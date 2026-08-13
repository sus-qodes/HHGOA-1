import { AppError } from "./app-error.js";

interface QueuedWork<T> {
  readonly task: () => Promise<T>;
  readonly resolve: (value: T | PromiseLike<T>) => void;
  readonly reject: (reason?: unknown) => void;
}

export interface WorkGateSnapshot {
  readonly active: number;
  readonly queued: number;
  readonly maxConcurrency: number;
  readonly maxQueue: number;
}

export class WorkGate {
  readonly #maxConcurrency: number;
  readonly #maxQueue: number;
  readonly #queue: QueuedWork<unknown>[] = [];
  #active = 0;

  constructor(maxConcurrency: number, maxQueue: number) {
    if (!Number.isSafeInteger(maxConcurrency) || maxConcurrency < 1) {
      throw new RangeError("maxConcurrency must be a positive integer.");
    }
    if (!Number.isSafeInteger(maxQueue) || maxQueue < 0) {
      throw new RangeError("maxQueue must be a non-negative integer.");
    }
    this.#maxConcurrency = maxConcurrency;
    this.#maxQueue = maxQueue;
  }

  run<T>(task: () => Promise<T>): Promise<T> {
    if (this.#active < this.#maxConcurrency) {
      return this.#start(task);
    }
    if (this.#queue.length >= this.#maxQueue) {
      return Promise.reject(
        new AppError("SERVICE_BUSY", { retryAfterSeconds: 2 }),
      );
    }

    return new Promise<T>((resolve, reject) => {
      this.#queue.push({
        task,
        resolve: resolve as QueuedWork<unknown>["resolve"],
        reject,
      });
    });
  }

  snapshot(): WorkGateSnapshot {
    return {
      active: this.#active,
      queued: this.#queue.length,
      maxConcurrency: this.#maxConcurrency,
      maxQueue: this.#maxQueue,
    };
  }

  async #start<T>(task: () => Promise<T>): Promise<T> {
    this.#active += 1;
    try {
      return await task();
    } finally {
      this.#active -= 1;
      this.#drain();
    }
  }

  #drain(): void {
    while (this.#active < this.#maxConcurrency) {
      const next = this.#queue.shift();
      if (next === undefined) {
        break;
      }
      void this.#start(next.task).then(next.resolve, next.reject);
    }
  }
}
