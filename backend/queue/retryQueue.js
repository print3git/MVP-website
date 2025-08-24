const { EventEmitter } = require("events");

class RetryQueue extends EventEmitter {
  constructor({
    baseDelay = 100,
    maxRetries = 3,
    backoffStrategy,
    rateLimit = Infinity,
    ttl = 1000,
    hardMaxRetries = 50,
    redis,
  } = {}) {
    super();
    const envDelay = process.env.RETRY_DELAY || process.env.retryDelay;
    this.baseDelay = envDelay ? Number(envDelay) : baseDelay;
    this.maxRetries = maxRetries;
    this.backoffStrategy =
      backoffStrategy || ((attempt, base) => base * Math.pow(2, attempt));
    this.rateLimit = rateLimit;
    this.ttl = ttl;
    this.hardMaxRetries = hardMaxRetries;
    this.redis = redis || new Map();
    this.jobs = new Map();
    this.running = 0;
  }

  setBackoffStrategy(fn) {
    this.backoffStrategy = fn;
  }

  add({
    id,
    handler,
    maxRetries,
    retryImmediately = false,
    neverRetry = false,
    allowedErrorCodes,
    jitter = 0,
    linearIncrement,
  }) {
    const job = {
      id,
      handler,
      maxRetries: maxRetries ?? this.maxRetries,
      retryImmediately,
      neverRetry,
      allowedErrorCodes,
      jitter,
      linearIncrement,
      attempt: 0,
      timer: null,
    };
    this.jobs.set(id, job);
    this._run(job);
    return job;
  }

  _schedule(job, delay) {
    job.timer = setTimeout(() => {
      job.timer = null;
      this._run(job);
    }, delay);
    // store retry metadata with TTL
    this.redis.set(job.id, { attempt: job.attempt });
    setTimeout(() => this.redis.delete(job.id), this.ttl).unref?.();
  }

  async _run(job) {
    if (this.running >= this.rateLimit) {
      setTimeout(() => this._run(job), 0);
      return;
    }
    this.running++;
    try {
      if (job.handler instanceof EventEmitter) {
        await new Promise((res, rej) => {
          job.handler.once("done", res);
          job.handler.once("error", rej);
          job.handler.emit("start");
        });
      } else {
        await job.handler(job.attempt);
      }
      job.attempt = 0;
      this.redis.delete(job.id);
      this.running--;
    } catch (err) {
      this.running--;
      if (job.neverRetry) return;
      if (job.allowedErrorCodes && !job.allowedErrorCodes.includes(err.code)) {
        return;
      }
      if (job.maxRetries > this.hardMaxRetries) {
        throw new Error("maxRetries exceeds hard limit");
      }
      if (job.attempt >= job.maxRetries) {
        return;
      }
      job.attempt++;
      let delay;
      if (job.retryImmediately) {
        delay = 0;
      } else if (job.linearIncrement != null) {
        delay = this.baseDelay + job.attempt * job.linearIncrement;
      } else {
        delay = job.backoffStrategy(job.attempt, this.baseDelay, job);
      }
      if (job.jitter) {
        const range = delay * job.jitter;
        const delta = Math.floor(Math.random() * range * 2 - range);
        delay += delta;
      }
      this.emit("retry", {
        jobId: job.id,
        attempt: job.attempt,
        delay,
        error: err,
      });
      this._schedule(job, delay);
    }
  }

  retry(id) {
    const job = this.jobs.get(id);
    if (job) {
      this._run(job);
    }
  }

  cancelRetries(id) {
    const job = this.jobs.get(id);
    if (job && job.timer) {
      clearTimeout(job.timer);
      job.timer = null;
    }
  }

  metrics() {
    let retries = 0;
    for (const job of this.jobs.values()) {
      retries += job.attempt;
    }
    return { retries, retryQueueLength: this.retryQueueLength };
  }

  get retryQueueLength() {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.timer) count++;
    }
    return count;
  }
}

module.exports = RetryQueue;
