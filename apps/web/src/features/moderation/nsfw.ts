import "server-only";
import { Worker } from "node:worker_threads";
import { INPUT_SIZE } from "./constants";
import type { Scores } from "./frames";

const WORKER = `
const { parentPort, workerData } = require("node:worker_threads");
const tf = require("@tensorflow/tfjs");
const nsfwjs = require("nsfwjs");
const ready = tf
  .setBackend("cpu")
  .then(() => nsfwjs.load("MobileNetV2Mid", { type: "graph" }));
parentPort.on("message", async ({ id, images }) => {
  try {
    const model = await ready;
    const scores = [];
    for (const image of images) {
      const input = tf.tensor3d(
        image,
        [workerData.size, workerData.size, 3],
        "int32",
      );
      try {
        const predictions = await model.classify(input, 5);
        scores.push(
          Object.fromEntries(predictions.map((p) => [p.className, p.probability])),
        );
      } finally {
        input.dispose();
      }
    }
    parentPort.postMessage({ id, scores });
  } catch (error) {
    parentPort.postMessage({ id, error: String(error) });
  }
});
`;

type Reply = { id: number; scores?: Scores[]; error?: string };

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<
  number,
  { resolve: (scores: Scores[]) => void; reject: (error: Error) => void }
>();

function failAll(error: Error) {
  for (const { reject } of pending.values()) reject(error);
  pending.clear();
  worker = null;
}

function modelWorker() {
  if (worker) return worker;
  worker = new Worker(WORKER, {
    eval: true,
    workerData: { size: INPUT_SIZE },
  });
  worker.unref();
  worker.on("message", ({ id, scores, error }: Reply) => {
    const job = pending.get(id);
    if (!job) return;
    pending.delete(id);
    if (scores) job.resolve(scores);
    else job.reject(new Error(error ?? "The content check failed."));
  });
  worker.on("error", failAll);
  worker.on("exit", () => failAll(new Error("The content check stopped.")));
  return worker;
}

export function scoreImages(images: Uint8Array[]): Promise<Scores[]> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    modelWorker().postMessage(
      { id, images },
      images.map((image) => image.buffer as ArrayBuffer),
    );
  });
}
