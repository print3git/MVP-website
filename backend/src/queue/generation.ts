import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import * as db from "../db.js";
import { generateModel } from "../lib/generateModel";
import { preserveColors } from "../lib/preserveColors";
import { uploadS3 } from "../lib/uploadS3";
import { logError } from "../lib/logError";
import logger from "../logger.js";

export interface GenerationPayload {
  prompt?: string;
  image?: string;
  source: "prompt" | "image";
}

interface GenerationJob extends GenerationPayload {
  userId: string;
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
  s3Key?: string;
  dbJobId?: string;
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

    setImmediate(async () => {
      let s3Key: string | undefined;
      try {
        if (typeof (db as any).createJob === "function") {
          const created = await (db as any).createJob({
            user_id: job.userId,
            prompt: job.prompt,
            source: job.source,
            created_at: job.startedAt,
          });
          job.dbJobId = created?.id || created?.job_id || created?.jobId;
        }

        let model = await generateModel({
          prompt: job.prompt,
          image: job.image,
        });
        model = await preserveColors(model);
        const uploadResult = await uploadS3(model);
        job.url = uploadResult.url;
        s3Key = uploadResult.key;
        job.s3Key = s3Key;

        if (job.dbJobId && typeof (db as any).linkModelToJob === "function") {
          await (db as any).linkModelToJob(job.dbJobId, s3Key);
        }
        if (typeof (db as any).insertGenerationLog === "function") {
          await (db as any).insertGenerationLog({
            jobId: job.dbJobId,
            userId: job.userId,
            prompt: job.prompt ?? "image",
            source: job.source,
            startTime: job.startedAt,
            finishTime: new Date().toISOString(),
            s3Key,
            url: job.url,
          });
        }

        job.state = "succeeded";
        job.finishedAt = new Date().toISOString();
        emitter.emit(`complete:${job.id}`, {
          jobId: job.id,
          url: job.url,
          s3Key,
        });
        logger.info("generate_success", {
          jobId: job.id,
          userId: job.userId,
          source: job.source,
          s3Key,
        });
      } catch (err) {
        const stage = s3Key ? "upload" : "generation";
        const code = stage === "upload" ? "upload_failed" : "model_error";
        job.error = code;
        job.state = "failed";
        job.finishedAt = new Date().toISOString();
        if (typeof (db as any).insertGenerationLog === "function") {
          await (db as any).insertGenerationLog({
            jobId: job.dbJobId,
            userId: job.userId,
            prompt: job.prompt ?? "image",
            source: job.source,
            startTime: job.startedAt,
            finishTime: job.finishedAt,
          });
        }
        logger.error("generate_failed", { stage, userId: job.userId, code });
        logError(err);
        emitter.emit(`fail:${job.id}`, { jobId: job.id, error: code });
      } finally {
        inFlight.delete(job.userId);
        processNext();
      }
    });

    index = queue.findIndex((j) => !inFlight.has(j.userId));
  }
}

export async function enqueue(
  userId: string,
  payload: GenerationPayload,
): Promise<{ jobId: string }> {
  const id = randomUUID();
  const record: InternalJob = { userId, ...payload, id, state: "queued" };
  queue.push(record);
  jobs.set(id, record);
  processNext();
  return { jobId: id };
}

export function onComplete(
  id: string,
  cb: (result: { jobId: string; url: string; s3Key?: string }) => void,
): void {
  emitter.once(`complete:${id}`, cb);
}

export function onFail(
  id: string,
  cb: (result: { jobId: string; error: string }) => void,
): void {
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
