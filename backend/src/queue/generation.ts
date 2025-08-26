import { EventEmitter } from "events";
import { randomUUID } from "crypto";

export interface GenerationJob {
  userId: string;
  prompt?: string;
  imagePath?: string;
}

export interface GenerationJobStatus {
  state: "queued" | "running" | "succeeded" | "failed";
  url?: string;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  position?: number;
}

interface InternalJob extends GenerationJob {
  id: string;
  state: GenerationJobStatus["state"];
  url?: string;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
}

const queue: InternalJob[] = [];
const jobs = new Map<string, InternalJob>();
const inFlight = new Map<string, string>();
const emitter = new EventEmitter();

function processNext() {
  let index = queue.findIndex((j) => !inFlight.has(j.userId));
  while (index !== -1) {
    const job = queue.splice(index, 1)[0];
    inFlight.set(job.userId, job.id);
    job.state = "running";
    job.startedAt = new Date().toISOString();

    setImmediate(() => {
      try {
        job.url = "/placeholder.glb";
        job.state = "succeeded";
        job.finishedAt = new Date().toISOString();
        emitter.emit(`complete:${job.id}`, { ...job });
      } catch (err) {
        job.error = (err as Error).message;
        job.state = "failed";
        job.finishedAt = new Date().toISOString();
        emitter.emit(`fail:${job.id}`, { ...job });
      } finally {
        inFlight.delete(job.userId);
        processNext();
      }
    });

    index = queue.findIndex((j) => !inFlight.has(j.userId));
  }
}

export async function enqueue(job: GenerationJob): Promise<{ id: string }> {
  const id = randomUUID();
  const record: InternalJob = { ...job, id, state: "queued" };
  queue.push(record);
  jobs.set(id, record);
  processNext();
  return { id };
}

export function onComplete(
  id: string,
  cb: (status: GenerationJobStatus) => void,
) {
  emitter.once(`complete:${id}`, cb);
}

export function onFail(id: string, cb: (status: GenerationJobStatus) => void) {
  emitter.once(`fail:${id}`, cb);
}

export function getStatus(id: string): GenerationJobStatus | undefined {
  const job = jobs.get(id);
  if (!job) return undefined;
  const status: GenerationJobStatus = {
    state: job.state,
    url: job.url,
    error: job.error,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  };
  if (job.state === "queued") {
    const pos = queue.findIndex((j) => j.id === id);
    if (pos !== -1) status.position = pos + 1;
  }
  return status;
}

export { emitter };
