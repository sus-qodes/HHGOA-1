export type ReadinessCheck = () => Promise<void>;

export class ReadinessService {
  readonly #checks: readonly ReadinessCheck[];
  readonly #cacheMs: number;
  #cachedUntil = 0;
  #cachedReady = false;
  #inFlight: Promise<boolean> | undefined;

  constructor(checks: readonly ReadinessCheck[], cacheMs = 1000) {
    this.#checks = checks;
    this.#cacheMs = cacheMs;
  }

  async isReady(): Promise<boolean> {
    const now = Date.now();
    if (now < this.#cachedUntil) {
      return this.#cachedReady;
    }
    if (this.#inFlight !== undefined) {
      return this.#inFlight;
    }

    this.#inFlight = this.#evaluate();
    try {
      return await this.#inFlight;
    } finally {
      this.#inFlight = undefined;
    }
  }

  async #evaluate(): Promise<boolean> {
    let ready = true;
    try {
      await Promise.all(this.#checks.map(async (check) => check()));
    } catch {
      ready = false;
    }
    this.#cachedReady = ready;
    this.#cachedUntil = Date.now() + this.#cacheMs;
    return ready;
  }
}
