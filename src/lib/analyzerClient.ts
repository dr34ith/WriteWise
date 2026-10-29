"use client";

import type { AnalyzeRequest, AnalyzeResult } from "./engine";
import type { WorkerRequestMessage, WorkerResponseMessage } from "./worker";

export class AnalyzerClient {
  private worker: Worker;
  private nextRequestId = 0;
  private pending = new Map<number, (result: AnalyzeResult) => void>();

  constructor() {
    this.worker = new Worker(new URL("./worker.ts", import.meta.url));
    this.worker.onmessage = (event: MessageEvent<WorkerResponseMessage>) => {
      const { requestId, result } = event.data;
      const resolve = this.pending.get(requestId);
      if (resolve) {
        this.pending.delete(requestId);
        resolve(result);
      }
    };
  }

  analyze(payload: AnalyzeRequest): Promise<AnalyzeResult> {
    const requestId = this.nextRequestId++;
    return new Promise((resolve) => {
      this.pending.set(requestId, resolve);
      const message: WorkerRequestMessage = { requestId, payload };
      this.worker.postMessage(message);
    });
  }

  terminate() {
    this.worker.terminate();
  }
}
