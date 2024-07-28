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
      db.createObjectStore(DB_STORE_RAW, { keyPath: "offset" });
    }
    if (!db.objectStoreNames.contains(DB_STORE_PROCESSED)) {
      db.createObjectStore(DB_STORE_PROCESSED, { keyPath: "offset" });
    }
  },
});

self.addEventListener("message", async (event) => {
  const { chunk, offset, action } = event.data;

  if (action === "fileUploadEnd") {
    console.log(`File reading completed at offset: ${offset}.`);
  }

  const db = await openDB(DB_NAME, DB_VERSION);

  if (chunk) {
    await db.put(DB_STORE_RAW, { offset, data: chunk });
  }

  // console.log(`STORAGE WORKER: Stored chunk at offset ${offset}`);
  self.postMessage({
    action: "chunkStored",
    offset,
    storedIndex: offset,
    isLastChunk: action === "fileUploadEnd",
  });
});
