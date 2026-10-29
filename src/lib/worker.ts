import { analyze, type AnalyzeRequest, type AnalyzeResult } from "./engine";

export interface WorkerRequestMessage {
  requestId: number;
  payload: AnalyzeRequest;
}

export interface WorkerResponseMessage {
  requestId: number;
  result: AnalyzeResult;
}

self.onmessage = async (event: MessageEvent<WorkerRequestMessage>) => {
  const { requestId, payload } = event.data;
  const result = await analyze(payload);
  const response: WorkerResponseMessage = { requestId, result };
  (self as unknown as Worker).postMessage(response);
};
