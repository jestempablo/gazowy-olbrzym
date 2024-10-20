export interface DataPoint {
  x: number;
  y: [number, number];
}

export type DataRow = [
  number,
  [number, number],
  {
    min: number;
    max: number;
    sum: number;
    sumOfSquares: number;
    count: number;
  }
];

export interface Stats {
  total: number;
  stored: number;
  processed: number;
}

export type ProcessingWorkerResponse = {
  rows?: DataRow[][];
  isLastChunk?: boolean;
  processedIndex?: number;
  action: "stats" | "data";
};

export interface StorageWorkerResponse {
  offset: number;
  action: string;
  storedIndex?: number;
  isLastChunk?: boolean;
}

export interface WorkerMessage {
  chunk: string;
  isLastChunk: boolean;
}

export interface CsvRecord {
  index: string;
  "number value": string;
}
