import { openDB } from "idb";
import {
  DB_NAME,
  DB_STORE_PROCESSED,
  DB_STORE_RAW,
  DB_VERSION,
  DOWNSAMPLE_THRESHOLD,
} from "./constants";
import { DataRow } from "./types";

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(DB_STORE_RAW)) {
      db.createObjectStore(DB_STORE_RAW, { keyPath: "rawChunkIndex" });
    }
    if (!db.objectStoreNames.contains(DB_STORE_PROCESSED)) {
      db.createObjectStore(DB_STORE_PROCESSED, {
        keyPath: "processedChunkIndex",
      });
    }
  },
});

interface WorkerState {
  buffer: string[];
  bufferRowCount: number;
  processedRawChunkIndex: number;
  processedChunkIndex: number;
  initialDataSent: boolean;
  sentProcessedIndex: number;
}

// Initialize buffer, size tracker, and offset for processed data
const workerState: WorkerState = {
  buffer: [],
  bufferRowCount: 0,
  processedRawChunkIndex: 0,
  processedChunkIndex: 0,
  initialDataSent: false,
  sentProcessedIndex: 0,
};

self.addEventListener("message", async (event) => {
  const { action, isLastChunk, settings = {}, newPoints } = event.data;
  const { pointsPerInterval, displayedPoints } = settings;

  if (action === "chunkStored" && isLastChunk) {
    const chunksDisplayedAtOnce = Math.ceil(
      displayedPoints / pointsPerInterval
    );
    const db = await dbPromise;

    let rawChunk = await db.get(
      DB_STORE_RAW,
      workerState.processedRawChunkIndex
    );

    while (rawChunk) {
      const rawData = rawChunk.data;

      // Split the chunk into rows
      const rows = rawData.split("\n");

      // Add rows to buffer in smaller batches
      for (let row of rows) {
        workerState.buffer.push(row);
        workerState.bufferRowCount += 1;
      }

      // Process buffer into processed chunks
      while (workerState.bufferRowCount >= pointsPerInterval) {
        const rawChunkToProcess = workerState.buffer
          .slice(0, pointsPerInterval)
          .join("\n");
        const processedChunk = processChunk(rawChunkToProcess, {
          displayedPoints,
        });
        workerState.buffer = workerState.buffer.slice(pointsPerInterval);
        workerState.bufferRowCount -= pointsPerInterval;

        // Save processed chunk
        await db.put(DB_STORE_PROCESSED, {
          processedChunkIndex: workerState.processedChunkIndex,
          data: processedChunk,
        });
        self.postMessage({
          action: "stats",
          processedIndex: processedChunk[processedChunk.length - 1][0],
        });
        workerState.processedChunkIndex += 1;
      }

      // Load the next raw chunk
      workerState.processedRawChunkIndex += 1;
      rawChunk = await db.get(DB_STORE_RAW, workerState.processedRawChunkIndex);
    }

    // If any remaining data in the buffer, process it as a final chunk
    if (workerState.bufferRowCount > 0) {
      const rawChunkToProcess = workerState.buffer.join("\n");
      const processedChunk = processChunk(rawChunkToProcess, {
        displayedPoints,
      });
      await db.put(DB_STORE_PROCESSED, {
        processedChunkIndex: workerState.processedChunkIndex,
        data: processedChunk,
      });
      workerState.buffer = [];
      workerState.bufferRowCount = 0;
      workerState.processedChunkIndex += 1;
    }

    if (!workerState.initialDataSent) {
      workerState.initialDataSent = true;
      // get first processed chunks to fill the pointsDisplayed
      const dataToBeSent = [];
      for (let i = 0; i < chunksDisplayedAtOnce; i++) {
        const processedChunk = await db.get(DB_STORE_PROCESSED, i);
        if (processedChunk) {
          dataToBeSent.push(processedChunk.data);
        }
      }
      workerState.sentProcessedIndex = chunksDisplayedAtOnce;
      self.postMessage({ action: "data", rows: dataToBeSent });
    }
  }

  if (action === "datapointsRequested") {
    const chunksDisplayedAtOnce = Math.ceil(
      displayedPoints / pointsPerInterval
    );

    let isLastChunk = false;

    const db = await dbPromise;
    const dataToBeSent = [];
    console.log(
      "workerState.sentProcessedIndex",
      workerState.sentProcessedIndex
    );
    console.log("chunksDisplayedAtOnce", chunksDisplayedAtOnce);
    for (
      let i = workerState.sentProcessedIndex;
      i < workerState.sentProcessedIndex + chunksDisplayedAtOnce;
      i++
    ) {
      const processedChunk = await db.get(DB_STORE_PROCESSED, i);
      if (processedChunk) {
        dataToBeSent.push(processedChunk.data);
      } else {
        isLastChunk = true;
        break;
      }
    }
    workerState.sentProcessedIndex += chunksDisplayedAtOnce;
    self.postMessage({ action: "data", rows: dataToBeSent, isLastChunk });
  }
});

interface ProcessChunkSettings {
  displayedPoints: number;
}

function processChunk(
  rawData: string,
  { displayedPoints }: ProcessChunkSettings
): DataRow[] {
  const rows = rawData.split("\n").map((row) => row.split(",").map(Number));

  if (displayedPoints > DOWNSAMPLE_THRESHOLD) {
    const factor = Math.ceil(displayedPoints / DOWNSAMPLE_THRESHOLD);
    const downsampledData: DataRow[] = [];

    for (let i = 0; i < rows.length; i += factor) {
      const slice = rows.slice(i, i + factor);
      const index = slice[0][0];
      let min = Infinity;
      let max = -Infinity;
      let sum = 0;
      let sumOfSquares = 0;
      const count = slice.length;

      slice.forEach(([_, value]) => {
        if (value < min) min = value;
        if (value > max) max = value;
        sum += value;
        sumOfSquares += value * value;
      });

      const y = sum / count;
      const error_margin = max - min;
      const stats = { min, max, sum, sumOfSquares, count };

      downsampledData.push([index, [y, error_margin], stats]);
    }
    return downsampledData;
  }

  // For cases without downsampling, still compute stats
  return rows.map(([index, value]) => {
    const stats = {
      min: value,
      max: value,
      sum: value,
      sumOfSquares: value * value,
      count: 1,
    };
    return [index, [value, 0], stats];
  });
}
