import { openDB } from "idb";
import {
  DB_NAME,
  DB_STORE_PROCESSED,
  DB_STORE_RAW,
  DB_VERSION,
} from "./constants";

openDB(DB_NAME, DB_VERSION, {
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

const workerState = {
  storedIndex: 0,
};

self.addEventListener("message", async (event) => {
  const { chunk, offset, action } = event.data;

  if (action === "resetDb") {
    const db = await openDB(DB_NAME, DB_VERSION);
    await db.clear(DB_STORE_RAW);
    await db.clear(DB_STORE_PROCESSED);
    console.log("STORAGE WORKER: Database cleared.");
    return;
  }

  if (action === "fileUploadEnd") {
    console.log(`File reading completed at offset: ${offset}.`);
  }

  const db = await openDB(DB_NAME, DB_VERSION);

  if (chunk) {
    // console.log("STORING CHUNK ", workerState.storedIndex);
    await db.put(DB_STORE_RAW, {
      rawChunkIndex: workerState.storedIndex,
      data: chunk,
    });
    workerState.storedIndex += 1;
  }

  // console.log(`STORAGE WORKER: Stored chunk at offset ${offset}`);
  self.postMessage({
    action: "chunkStored",
    offset,
    storedIndex: offset,
    isLastChunk: action === "fileUploadEnd",
  });
});
