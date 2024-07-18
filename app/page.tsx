"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Dygraph from "dygraphs";
import { Graph } from "./components/Graph";
import {
  DEFAULT_INTERVAL,
  DEFAULT_DISPLAYED_POINTS,
  DEFAULT_POINTS_PER_INTERVAL,
  GRAPH_WIDTH,
  GRAPH_HEIGHT,
} from "./constants";
import { Controls } from "./components/Controls";
import { Wrapper } from "./components/Wrapper";
import { DataPoint } from "./types";
import { calculateAggregates } from "./utils";

export default function Home() {
  const [dataToDisplay, setDataToDisplay] = useState<DataPoint[]>([]);

  const [settingDataInterval, setSettingDataInterval] =
    useState<number>(DEFAULT_INTERVAL);
  const [settingDisplayPoints, setSettingDisplayPoints] = useState<number>(
    DEFAULT_DISPLAYED_POINTS
  );
  const [settingPointsPerInterval, setSettingPointsPerInterval] =
    useState<number>(DEFAULT_POINTS_PER_INTERVAL); // Default value of points per interval
  const [settingTestMode, setSettingTestMode] = useState<boolean>(false); // Test mode enabled by default
  const [offset, setOffset] = useState<number>(0); // New offset state

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const graphRef = useRef<HTMLDivElement | null>(null);
  const dygraphInstanceRef = useRef<Dygraph | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const dataQueueRef = useRef<DataPoint[]>([]); // Queue to store preloaded data points
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Reference to the interval

  const [isFileUploaded, setIsFileUploaded] = useState<boolean>(false);

  const downsampleRate = useMemo(
    () => Math.max(1, Math.floor(settingDisplayPoints / GRAPH_WIDTH)),
    [settingDisplayPoints]
  );

  const downsampledInitialPoints = useMemo(
    () => Math.floor(settingDisplayPoints / downsampleRate),
    [settingDisplayPoints, downsampleRate]
  );

  const downsampledAddedPoints = useMemo(
    () => Math.floor(settingPointsPerInterval / downsampleRate),
    [settingPointsPerInterval, downsampleRate]
  );

  const preloadData = useCallback(() => {
    if (!isStreaming && !isPaused && (isFileUploaded || settingTestMode)) {
      setDataToDisplay([]); // Clear existing data
      dataQueueRef.current = []; // Clear the data queue
      graphRef.current = null;
      dygraphInstanceRef.current = null;

      const preloadEventSource = new EventSource(
        `/api/data?interval=${settingDataInterval}&points=${downsampledInitialPoints}&test=${settingTestMode}&offset=${offset}&downsample=${downsampleRate}`
      );
      preloadEventSource.onmessage = (event) => {
        const parsedData: DataPoint[] = JSON.parse(event.data);

        dataQueueRef.current.push(...parsedData);
        const preloadedData = dataQueueRef.current.slice(
          0,
          downsampledInitialPoints
        );
        setDataToDisplay(preloadedData); // Preload the graph with data
        preloadEventSource.close(); // Close the preload connection
      };
      preloadEventSource.onerror = () => {
        preloadEventSource.close();
      };
    }
  }, [
    isPaused,
    isStreaming,
    settingDataInterval,
    downsampledInitialPoints,
    settingTestMode,
    isFileUploaded,
    offset,
    downsampleRate,
  ]);

  const startStreaming = () => {
    dataQueueRef.current = []; // Clear the data queue

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const streamingOffset = settingDisplayPoints + offset + 1; // Adjust offset to start streaming from points + 1

    eventSourceRef.current = new EventSource(
      `/api/data?interval=${settingDataInterval}&points=${downsampledAddedPoints}&test=${settingTestMode}&offset=${streamingOffset}&downsample=${downsampleRate}`
    );

    eventSourceRef.current.onmessage = (event) => {
      const parsedData: DataPoint[] = JSON.parse(event.data);
      dataQueueRef.current.push(...parsedData); // Preload data points
    };

    eventSourceRef.current.addEventListener("end", () => {
      console.log("Stream ended");
      stopStreaming();
    });

    eventSourceRef.current.onerror = () => {
      console.log("Connection closed");
      stopStreaming();
    };

    setIsStreaming(true);

    // Calculate the number of points to add in each frame
    const minFrameInterval = 32; // 16ms per frame for ~60 FPS
    const totalInterval = settingDataInterval; // Total interval for new points
    const pointsPerInterval = settingPointsPerInterval;
    const framesPerInterval = totalInterval / minFrameInterval;
    const pointsPerFrame = Math.ceil(pointsPerInterval / framesPerInterval);
    const finalIntervalMs = Math.max(
      minFrameInterval,
      Math.ceil((totalInterval / pointsPerInterval) * pointsPerFrame)
    );

    const updatePlot = () => {
      if (dataQueueRef.current.length > 0) {
        const nextPoints = dataQueueRef.current.splice(0, pointsPerFrame); // Get the next batch of data points
        if (nextPoints.length > 0) {
          setDataToDisplay((prevData) => {
            const newData = [...prevData, ...nextPoints].slice(
              -downsampledInitialPoints
            ); // Maintain the last `points` number of points
            return newData;
          });
        }
      }
    };

    // Synchronize plot update with the frame interval
    intervalRef.current = setInterval(updatePlot, finalIntervalMs);
  };

  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPaused(true);
    setIsStreaming(false);
  };

  const handleFileUpload = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/data", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        console.log("File uploaded successfully");
        setIsFileUploaded(true);
      } else {
        console.error("Failed to upload file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current?.readyState === EventSource.OPEN) {
        eventSourceRef.current?.close();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (dataToDisplay.length === 0) return;

    // Update the data of the graph
    const plotData = dataToDisplay.map((d) => [d.x, d.y]);

    if (!dygraphInstanceRef.current && graphRef.current) {
      // Initialize the graph once
      dygraphInstanceRef.current = new Dygraph(graphRef.current, plotData, {
        labels: ["X", "Y"],
        width: GRAPH_WIDTH,
        height: GRAPH_HEIGHT,
        strokeWidth: 1,
        errorBars: true,
        color: "#890089",
        fillAlpha: 0.5,
      });
    }

    dygraphInstanceRef.current?.updateOptions({
      file: plotData,
    });
  }, [dataToDisplay]);

  useEffect(() => {
    preloadData();
  }, [settingPointsPerInterval, preloadData, offset]); // Add offset to dependency array

  const aggregates = useMemo(
    () => calculateAggregates(dataToDisplay),
    [dataToDisplay]
  );

  return (
    <Wrapper>
      <h1>Plot Drawing App</h1>

      <Controls
        settingDataInterval={settingDataInterval}
        setSettingDataInterval={setSettingDataInterval}
        settingDisplayPoints={settingDisplayPoints}
        setSettingDisplayPoints={setSettingDisplayPoints}
        settingPointsPerInterval={settingPointsPerInterval}
        setSettingPointsPerInterval={setSettingPointsPerInterval}
        settingTestMode={settingTestMode}
        setSettingTestMode={setSettingTestMode}
        isStreaming={isStreaming}
        startStreaming={startStreaming}
        stopStreaming={stopStreaming}
        offset={offset}
        setOffset={setOffset}
        handleFileUpload={handleFileUpload}
        isFileUploaded={isFileUploaded}
        setIsFileUploaded={setIsFileUploaded}
        isLoading={dataToDisplay.length === 0}
        downsampleRate={downsampleRate}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
      />
      <Graph
        graphRef={graphRef}
        isLoading={dataToDisplay.length === 0}
        settingTestMode={settingTestMode}
        isFileUploaded={isFileUploaded}
        {...aggregates}
        xMin={dataToDisplay.length > 0 ? dataToDisplay[0].x : 0}
        xMax={
          dataToDisplay.length > 0
            ? dataToDisplay[dataToDisplay.length - 1].x
            : 0
        }
        downsampleRate={downsampleRate}
      />
    </Wrapper>
  );
}
