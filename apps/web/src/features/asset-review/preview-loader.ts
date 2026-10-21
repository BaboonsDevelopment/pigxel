"use client";

import { REVIEW_API } from "./constants";

const MAX_ACTIVE = 12;
const RETRIES = 2;

type Job = {
  url: string;
  resolve: (image: HTMLImageElement) => void;
  reject: (error: Error) => void;
  started: boolean;
};

const jobs = new Map<string, { job: Job; promise: Promise<HTMLImageElement> }>();
const queue: Job[] = [];
let active = 0;

function pump() {
  while (active < MAX_ACTIVE && queue.length) {
    const job = queue.shift()!;
    job.started = true;
    active++;
    const finish = () => {
      active--;
      pump();
    };
    const attempt = (number: number) => {
      const image = new Image();
      image.onload = () => {
        job.resolve(image);
        finish();
      };
      image.onerror = () => {
        if (number < RETRIES) {
          setTimeout(() => attempt(number + 1), 700 * (number + 1));
        } else {
          jobs.delete(job.url);
          job.reject(new Error("Preview unavailable"));
          finish();
        }
      };
      image.src = `${job.url}&attempt=${number}`;
    };
    attempt(0);
  }
}

export function previewUrl(pack: string, id: string, hash: string) {
  return `${REVIEW_API}/strip/${pack}/${id}?v=${hash}`;
}

export function loadPreview(url: string, priority = false) {
  const existing = jobs.get(url);
  if (existing) {
    if (priority && !existing.job.started) {
      const index = queue.indexOf(existing.job);
      if (index > 0) {
        queue.splice(index, 1);
        queue.unshift(existing.job);
      }
    }
    return existing.promise;
  }
  let resolve!: Job["resolve"];
  let reject!: Job["reject"];
  const promise = new Promise<HTMLImageElement>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  const job = { url, resolve, reject, started: false };
  jobs.set(url, { job, promise });
  if (priority) queue.unshift(job);
  else queue.push(job);
  pump();
  return promise;
}
