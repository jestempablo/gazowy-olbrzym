"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { Wrapper } from "../v1/components/Wrapper";
import Dygraph from "dygraphs";
import {
  CHUNK_SIZE,
  DEFAULT_DISPLAYED_POINTS,
  DEFAULT_INTERVAL,
  DEFAULT_POINTS_PER_INTERVAL,
  DYGRAPH_OPTIONS,
} from "../constants";
import {
  DataRow,
  Stats,
  ProcessingWorkerResponse,
  StorageWorkerResponse,
} from "../types";

export default function Page() {
  // COMPONENT: state
  const [displayedData, setDisplayedData] = useState<DataRow[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    stored: 0,
    processed: 0,
  });
  const [pointsDisplayed, setPointsDisplayed] = useState<number>(
    DEFAULT_DISPLAYED_POINTS
  );
  const [pointsPerInterval, setPointsPerInterval] = useState<number>(
    DEFAULT_POINTS_PER_INTERVAL
  );
  const [newPointsInterval, setNewPointsInterval] =
    useState<number>(DEFAULT_INTERVAL);
  const [startingOffset, setStartingOffset] = useState<number>(0);

  // GRAPH: ref declare
  const dygraphInstanceRef = useRef<Dygraph | null>(null);
  const graphContainerRef = useRef<HTMLDivElement | null>(null);

  // GRAPH: ref initialize
  useEffect(() => {
    if (!dygraphInstanceRef.current && graphContainerRef.current) {
      dygraphInstanceRef.current = new Dygraph(
        graphContainerRef.current,
        [[0, [0, 0]]],
        DYGRAPH_OPTIONS
      );
    }
  }, []);

  // GRAPH: update
  useEffect(() => {
    if (displayedData.length > 0 && dygraphInstanceRef.current) {
      dygraphInstanceRef.current.updateOptions({ file: displayedData });
    }
  }, [displayedData]);

  // WORKERS: ref declare
  const storageWorkerRef = useRef<Worker | null>(null);
  const processingWorkerRef = useRef<Worker | null>(null);

  // WORKERS: ref initialize
  useEffect(() => {
    storageWorkerRef.current = new Worker(
      new URL("../storageWorker.ts", import.meta.url)
    );
    processingWorkerRef.current = new Worker(
      new URL("../processingWorker.ts", import.meta.url)
    );
  }, []);

  // STORAGE WORKER: on message
  const storageWorkerOnMessageHandler = useCallback(
    (event: MessageEvent<StorageWorkerResponse>) => {
      const { action, offset, isLastChunk, storedIndex } = event.data;

      if (storedIndex) {
        setStats((prevStats) => ({
          ...prevStats,
          stored: storedIndex,
        }));
      }

      if (action === "chunkStored") {
        // console.log(`UI: Requesting processing of chunk at offset ${offset}`);
        processingWorkerRef.current?.postMessage({
          action,
          offset,
          isLastChunk,
          settings: {
            newPointsInterval,
            pointsPerInterval,
            displayedPoints: pointsDisplayed,
            startingOffset,
          },
        });
      }
    },
    [newPointsInterval, pointsDisplayed, pointsPerInterval, startingOffset]
  );

  // PROCESSING WORKER: on message
  const processingWorkerOnMessageHandler = useCallback(
    (event: MessageEvent<ProcessingWorkerResponse>) => {
      const { rows, isLastChunk, processedIndex, action } = event.data;

      if (action === "stats" && processedIndex) {
        setStats((prevStats) => ({
          ...prevStats,
          processed: processedIndex,
        }));
      }

      if (action === "data") {
        if (rows && rows.length > 0) {
          // console.log(rows);
          setDisplayedData((prevData) => [...prevData, ...rows]);
        }

        if (isLastChunk) {
          closeWorkers();
        }
      }
    },
    []
  );

  // STORAGE WORKER: on error
  const storageWorkerOnErrorHandler = useCallback((error: ErrorEvent) => {
    console.error("Worker error:", error);
  }, []);
  // PROCESSING WORKER: on error
  const processingWorkerOnErrorHandler = useCallback((error: ErrorEvent) => {
    console.error("Worker error:", error);
  }, []);

  // WORKERS: close all
  function closeWorkers() {
    if (storageWorkerRef.current) {
      storageWorkerRef.current.terminate();
      storageWorkerRef.current = null;
    }
    if (processingWorkerRef.current) {
      processingWorkerRef.current.terminate();
      processingWorkerRef.current = null;
    }
  }

  // STORAGE WORKER: event listeners
  useEffect(() => {
    // not listening to onmessage event, it's being listened to on processing worker
    if (storageWorkerRef.current) {
      storageWorkerRef.current.onmessage = storageWorkerOnMessageHandler;
      storageWorkerRef.current.onerror = storageWorkerOnErrorHandler;
    }
  }, [
    storageWorkerRef,
    storageWorkerOnMessageHandler,
    storageWorkerOnErrorHandler,
  ]);

  // PROCESSING WORKER: event listeners
  useEffect(() => {
    if (processingWorkerRef.current) {
      processingWorkerRef.current.onmessage = processingWorkerOnMessageHandler;
      processingWorkerRef.current.onerror = processingWorkerOnErrorHandler;
    }
  }, [
    processingWorkerRef,
    processingWorkerOnErrorHandler,
    processingWorkerOnMessageHandler,
  ]);

  // FILE: upload
  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file && storageWorkerRef.current) {
      let lineOffset = 0; // To track the index of the first line in each chunk
      let remainder = ""; // To store the leftover part of the chunk

      const readChunk = (file: File, start: number, end: number) => {
        const reader = new FileReader();
        const blob = file.slice(start, end);
        reader.onload = (e) => {
          if (e.target?.result && storageWorkerRef.current) {
            const chunk = e.target.result as string;
            processChunk(chunk, start);
          }
        };
        reader.readAsText(blob);
      };

      const processChunk = (chunk: string, start: number) => {
        // Prepend the remainder from the previous chunk
        chunk = remainder + chunk;

        // Ensure the chunk does not split lines
        const lastNewlineIndex = chunk.lastIndexOf("\n");
        if (lastNewlineIndex === -1) {
          // No complete line in this chunk, store it as remainder
          remainder = chunk;
          return;
        }

        // Extract the complete part and the remainder
        const completeChunk = chunk.slice(0, lastNewlineIndex);
        remainder = chunk.slice(lastNewlineIndex + 1);

        // Send the complete chunk to the worker
        storageWorkerRef.current?.postMessage({
          chunk: completeChunk,
          offset: lineOffset,
          start, // Pass the start byte position
          action: undefined,
        });

        // Calculate the number of lines in the chunk
        const linesInChunk = completeChunk.split("\n").length;
        lineOffset += linesInChunk;

        setStats((prevStats) => ({
          ...prevStats,
          total: lineOffset,
        }));

        // Update to read the next chunk
        const nextStart = start + CHUNK_SIZE;
        if (nextStart < file.size) {
          readChunk(file, nextStart, nextStart + CHUNK_SIZE);
        } else {
          // Send any remaining part as the last chunk if not empty
          if (remainder) {
            storageWorkerRef.current?.postMessage({
              chunk: remainder,
              offset: lineOffset,
              start: nextStart, // This would be the byte after the last full chunk
              action: "fileUploadEnd",
            });
          } else {
            // Indicate the end of file processing
            storageWorkerRef.current?.postMessage({
              action: "fileUploadEnd",
              offset: lineOffset,
            });
          }
        }
      };

      // Start reading the file
      readChunk(file, 0, CHUNK_SIZE);
    }
  };

  const startRolling = () => {
    if (processingWorkerRef.current) {
      processingWorkerRef.current.postMessage({
        action: "datapointsRequested",
        offset: startingOffset,
        settings: {
          newPointsInterval,
          pointsPerInterval,
          displayedPoints: pointsDisplayed,
          startingOffset,
        },
      });
    }
  };

  return (
    <Wrapper>
      <h1>hi</h1>
      <label>
        Points displayed
        <input
          type="text"
          value={pointsDisplayed}
          onChange={(e) => setPointsDisplayed(Number(e.target.value))}
        />
      </label>
      <br />
      <label>
        Points per interval
        <input
          type="text"
          value={pointsPerInterval}
          onChange={(e) => setPointsPerInterval(Number(e.target.value))}
        />
      </label>
      <br />
      <label>
        Interval
        <input
          type="text"
          value={newPointsInterval}
          onChange={(e) => setNewPointsInterval(Number(e.target.value))}
        />
      </label>
      <br />
      <label>
        Starting offset
        <input
          type="text"
          value={startingOffset}
          onChange={(e) => setStartingOffset(Number(e.target.value))}
        />
      </label>
      <br />

      <input type="file" accept=".csv" onChange={handleFileUpload} />
      <br />
      <button onClick={startRolling}>Start rolling</button>
      <div ref={graphContainerRef} />
      <div>
        <h3>Stats</h3>
        <p>Total (last read index): {stats.total}</p>
        <p>
          Stored: ~{stats.stored} (actually first row id of last chunk of rows)
        </p>
        <p>Processed: {stats.processed}</p>
      </div>
    </Wrapper>
  );
}

/* next

implement
- points displayed
- points per interval
- interval

consider how
- syncing dataflow with interval
- probably save the chunks all the way
- and send requests from UI to pull batches from the db



*/
