import "server-only";
import * as tf from "@tensorflow/tfjs";
import { load, type NSFWJS } from "nsfwjs";
import { INPUT_SIZE } from "./constants";
import type { Scores } from "./frames";

let model: Promise<NSFWJS> | null = null;

function loadModel() {
  model ??= tf
    .setBackend("cpu")
    .then(() => load("MobileNetV2Mid", { type: "graph" }))
    .catch((error: unknown) => {
      model = null;
      throw error;
    });
  return model;
}

export async function scoreImages(images: Uint8Array[]): Promise<Scores[]> {
  const nsfw = await loadModel();
  const scores: Scores[] = [];
  for (const image of images) {
    const input = tf.tensor3d(image, [INPUT_SIZE, INPUT_SIZE, 3], "int32");
    try {
      const predictions = await nsfw.classify(input, 5);
      scores.push(
        Object.fromEntries(
          predictions.map((p) => [p.className, p.probability]),
        ) as Scores,
      );
    } finally {
      input.dispose();
    }
  }
  return scores;
}
