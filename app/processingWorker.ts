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
      db.createObjectStore(DB_STORE_RAW, { keyPath: "offset" });
    }
    if (!db.objectStoreNames.contains(DB_STORE_PROCESSED)) {
      db.createObjectStore(DB_STORE_PROCESSED, { keyPath: "offset" });
    }
  },
});

interface WorkerState {
  buffer: string[];
  bufferRowCount: number;
  processedOffset: number;
  initialDataSent: boolean;
}

// Initialize buffer, size tracker, and offset for processed data
const workerState: WorkerState = {
  buffer: [],
  bufferRowCount: 0,
  processedOffset: 0,
  initialDataSent: false,
};

self.addEventListener("message", async (event) => {
  const {
    action,
    offset: storedChunkOffset,
    isLastChunk,
    settings = {},
  } = event.data;
  const {
    displayedPoints,
    newPointsInterval,
    pointsPerInterval,
    startingOffset,
  } = settings;

  if (action === "chunkStored") {
    const db = await dbPromise;
    const rawChunk = await db.get(DB_STORE_RAW, storedChunkOffset);

    if (rawChunk) {
      // Parse raw chunk data into rows and add to the buffer
      const rows = rawChunk.data.split("\n");
      workerState.buffer.push(...rows);
      workerState.bufferRowCount += rows.length;

      // Check if buffer row count meets or exceeds displayedPoints
      if (workerState.bufferRowCount >= displayedPoints || isLastChunk) {
        // Combine buffer rows into a single chunk
        const combinedChunk = workerState.buffer.join("\n");
        const processedData = processChunk(combinedChunk, {
          newPointsInterval,
          pointsPerInterval,
          displayedPoints,
        });

        // Store the processed data with the correct offset
        await db.put(DB_STORE_PROCESSED, {
          offset: workerState.processedOffset,
          data: processedData,
        });

        // Update the processed offset
        workerState.processedOffset += displayedPoints;

        // Clear the buffer
        workerState.buffer = [];
        workerState.bufferRowCount = 0;

        self.postMessage({
          action: "stats",
          processedIndex: workerState.processedOffset,
        });

        if (!workerState.initialDataSent) {
          self.postMessage({
            action: "data",
            rows: processedData,
          });
          workerState.initialDataSent = true;
        }
      }
    }
  }

  if (action === "datapointsRequested") {
    const db = await dbPromise;
    let processedData: DataRow[] = [];
    let isLastChunk = false;
    let offset = startingOffset;

    while (processedData.length < displayedPoints && !isLastChunk) {
      // Fetch the next chunk using the current offset
      const chunk = await db.get(DB_STORE_PROCESSED, offset);
      if (chunk) {
        processedData.push(...chunk.data); // Append chunk data to the results
        offset += chunk.data.length; // Increment offset by the size of the chunk
      } else {
        isLastChunk = true;
      }
    }

    self.postMessage({ action: "data", rows: processedData, isLastChunk });
  }
});

interface ProcessChunkSettings {
  newPointsInterval: number;
  pointsPerInterval: number;
  displayedPoints: number;
}

function processChunk(
  rawData: string,
  {
    newPointsInterval,
    pointsPerInterval,
    displayedPoints,
  }: ProcessChunkSettings
): DataRow[] {
  // Parse raw data into rows (assuming CSV-like format)
  const rows = rawData.split("\n").map((row) => row.split(",").map(Number));

  // Check if downsampling is needed
  if (displayedPoints > DOWNSAMPLE_THRESHOLD) {
    // Calculate the downsampling factor based on the total number of rows and displayed points
    const factor = Math.ceil(displayedPoints / DOWNSAMPLE_THRESHOLD);
    const downsampledData: DataRow[] = [];

    for (let i = 0; i < rows.length; i += factor) {
      const slice = rows.slice(i, i + factor);
      const index = slice[0][0]; // Use the index of the first row in the slice
      let min = Infinity;
      let max = -Infinity;
      let sum = 0;

      slice.forEach(([_, value]) => {
        if (value < min) min = value;
        if (value > max) max = value;
        sum += value;
      });

      const y = sum / slice.length; // Average value
      const error_margin = max - min; // Error margin as the difference between max and min

      downsampledData.push([index, [y, error_margin]]);
    }
    return downsampledData;
  }

  // If no downsampling is needed, return the data with zero error margins
  return rows.map(([index, value]) => [index, [value, 0]]);
}
