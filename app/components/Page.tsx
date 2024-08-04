"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Wrapper } from "../v1/components/Wrapper";
import Dygraph from "dygraphs";
import {
  CHUNK_SIZE,
  DEFAULT_DISPLAYED_POINTS,
  DEFAULT_INTERVAL,
  DEFAULT_OFFSET,
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
  const [bufferedChunkData, setBufferedChunkData] = useState<DataRow[][]>([]);
  const [displayedChunkData, setDisplayedChunkData] = useState<DataRow[][]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    stored: 0,
    processed: 0,
  });
  const [graphStats, setGraphStats] = useState({
    min: 0,
    max: 0,
    average: 0,
    variance: 0,
  });
  const [pointsDisplayed, setPointsDisplayed] = useState<number>(
    DEFAULT_DISPLAYED_POINTS
  );
  const [pointsPerInterval, setPointsPerInterval] = useState<number>(
    DEFAULT_POINTS_PER_INTERVAL
  );
  const [newPointsInterval, setNewPointsInterval] =
    useState<number>(DEFAULT_INTERVAL);
  const [startingOffset, setStartingOffset] = useState<number>(DEFAULT_OFFSET);

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
          console.log("RECEIVED", rows);
          setBufferedChunkData(rows);
        }

        if (isLastChunk) {
          console.log("FIN");
          closeWorkers();
        }
      }
    },
    []
  );

  useEffect(() => {
    if (bufferedChunkData.length > 0) {
      const chunksDisplayedAtOnce = Math.ceil(
        pointsDisplayed / pointsPerInterval
      );

      const isInitial = displayedChunkData.length < chunksDisplayedAtOnce;

      bufferedChunkData.forEach((rowsChunk, chunkIndex) => {
        setTimeout(
          () => {
            // update displayed chunk data, limit to "chunksDisplayedAtOnce" rowsChunk
            setDisplayedChunkData((prevData) => {
              if (prevData.length < chunksDisplayedAtOnce) {
                console.log(
                  "adding",
                  rowsChunk[0][0],
                  "to",
                  rowsChunk[rowsChunk.length - 1][0]
                );
                return [...prevData, rowsChunk];
              }

              const [first, ...rest] = prevData;

              console.log(
                "dropping",
                first[0][0],
                "to",
                first[first.length - 1][0]
              );

              console.log(
                "adding",
                rowsChunk[0][0],
                "to",
                rowsChunk[rowsChunk.length - 1][0]
              );

              return [...rest, rowsChunk];
            });
          },
          isInitial ? 0 : chunkIndex * newPointsInterval
        );
      });
      setBufferedChunkData([]);
    }
  }, [
    bufferedChunkData,
    newPointsInterval,
    displayedChunkData,
    pointsDisplayed,
    pointsPerInterval,
  ]);

  useEffect(() => {
    // on update to displayedChunkData, update displayedData and calculate stats
    if (displayedChunkData.length > 0) {
      const displayedData = displayedChunkData.flat();
      setDisplayedData(displayedData);

      const values = displayedData.map((row) => row[1][0]);
      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const average =
          values.reduce((sum, value) => sum + value, 0) / values.length;
        const variance =
          values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
          values.length;

        setGraphStats({ min, max, average, variance });
      }
    }
  }, [displayedChunkData]);

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
            processChunk(chunk, start, end);
          }
        };
        reader.readAsText(blob);
      };

      const processChunk = (chunk: string, start: number, end: number) => {
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

        // Split the chunk into lines
        const lines = completeChunk.split("\n");

        // Skip lines until the starting offset is reached
        if (lineOffset < startingOffset) {
          const linesToSkip = Math.min(
            startingOffset - lineOffset,
            lines.length
          );
          lines.splice(0, linesToSkip);
          lineOffset += linesToSkip;
        }

        // If there are lines left after skipping, send them to the worker
        if (lines.length > 0) {
          const chunkToSend = lines.join("\n");
          storageWorkerRef.current?.postMessage({
            chunk: chunkToSend,
            offset: lineOffset,
            start, // Pass the start byte position
            action: undefined,
          });

          // Calculate the number of lines in the chunk
          const linesInChunk = chunkToSend.split("\n").length;
          lineOffset += linesInChunk;

          setStats((prevStats) => ({
            ...prevStats,
            total: lineOffset,
          }));
        }

        // Update to read the next chunk
        const nextStart = start + CHUNK_SIZE;
        if (nextStart < file.size) {
          readChunk(file, nextStart, nextStart + CHUNK_SIZE);
        } else {
          // Send any remaining part as the last chunk if not empty
          if (remainder) {
            if (lineOffset >= startingOffset) {
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

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const requestNewDataPoints = () => {
    if (processingWorkerRef.current) {
      processingWorkerRef.current.postMessage({
        action: "datapointsRequested",
        settings: {
          pointsPerInterval,
          displayedPoints: pointsDisplayed,
        },
      });
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  const newBatchInterval = useMemo(() => {
    return (pointsDisplayed / pointsPerInterval) * newPointsInterval;
  }, [newPointsInterval, pointsDisplayed, pointsPerInterval]);

  const startRolling = () => {
    requestNewDataPoints();
    intervalRef.current = setInterval(() => {
      requestNewDataPoints();
    }, newBatchInterval);
  };

  const inputFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (storageWorkerRef.current) {
      storageWorkerRef.current.postMessage({ action: "resetDb" });
    }
  }, []);

  return (
    <Wrapper>
      <h1>hi</h1>
      <label>
        Points displayed (N)
        <input
          type="text"
          value={pointsDisplayed}
          disabled={Boolean(
            inputFileRef.current && inputFileRef.current.value !== ""
          )}
          onChange={(e) => setPointsDisplayed(Number(e.target.value))}
        />
      </label>
      <br />
      <label>
        Points per interval (P)
        <input
          type="text"
          value={pointsPerInterval}
          disabled={Boolean(
            inputFileRef.current && inputFileRef.current.value !== ""
          )}
          onChange={(e) => setPointsPerInterval(Number(e.target.value))}
        />
      </label>
      <br />
      <label>
        Interval (T)
        <input
          type="text"
          value={newPointsInterval}
          disabled={Boolean(
            inputFileRef.current && inputFileRef.current.value !== ""
          )}
          onChange={(e) => setNewPointsInterval(Number(e.target.value))}
        />
      </label>
      <br />
      <label>
        Starting offset (S)
        <input
          type="text"
          value={startingOffset}
          disabled={Boolean(
            inputFileRef.current && inputFileRef.current.value !== ""
          )}
          onChange={(e) => setStartingOffset(Number(e.target.value))}
        />
      </label>
      <br />

      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        ref={inputFileRef}
      />
      <br />
      <button
        onClick={startRolling}
        disabled={
          Boolean(intervalRef.current) ||
          !Boolean(inputFileRef.current && inputFileRef.current.value !== "")
        }
      >
        Start
      </button>
      <button onClick={() => window.location.reload()}>Reload page</button>
      <div ref={graphContainerRef} />
      <div>
        <h3>Stats</h3>
        <p>Min: {graphStats.min}</p>
        <p>Max: {graphStats.max}</p>
        <p>Average: {graphStats.average}</p>
        <p>Variance: {graphStats.variance}</p>
        <p>
          Displayed X range:{" "}
          {displayedData.length > 0
            ? `${displayedData[0][0]} to ${
                displayedData[displayedData.length - 1][0]
              }`
            : "no data"}
        </p>
        <p>Last read index from file: {stats.total}</p>
        <p>
          Stored: ~{stats.stored} (actually first row id of last chunk of rows)
        </p>
        <p>
          Points processed: {stats.processed} (skipped: {startingOffset})
        </p>
      </div>
    </Wrapper>
  );
}
