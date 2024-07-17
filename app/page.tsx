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
import { Aggregates } from "./components/Aggregates";
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

  const graphRef = useRef<HTMLDivElement | null>(null);
  const dygraphInstanceRef = useRef<Dygraph | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const dataQueueRef = useRef<DataPoint[]>([]); // Queue to store preloaded data points
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Reference to the interval

  const [isFileUploaded, setIsFileUploaded] = useState<boolean>(false);

  const DOWNSAMPLE = useMemo(
    () => Math.max(1, Math.floor(settingDisplayPoints / GRAPH_WIDTH)),
    [settingDisplayPoints]
  );

  const downsampledInitialPoints = useMemo(
    () => Math.floor(settingDisplayPoints / DOWNSAMPLE),
    [settingDisplayPoints, DOWNSAMPLE]
  );

  const downsampledAddedPoints = useMemo(
    () => Math.floor(settingPointsPerInterval / DOWNSAMPLE),
    [settingPointsPerInterval, DOWNSAMPLE]
  );

  const preloadData = useCallback(() => {
    if (!isStreaming && (isFileUploaded || settingTestMode)) {
      setDataToDisplay([]); // Clear existing data
      dataQueueRef.current = []; // Clear the data queue
      graphRef.current = null;
      dygraphInstanceRef.current = null;

      const preloadEventSource = new EventSource(
        `/api/data?interval=${settingDataInterval}&points=${downsampledInitialPoints}&test=${settingTestMode}&offset=${offset}&downsample=${DOWNSAMPLE}`
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
    isStreaming,
    settingDataInterval,
    downsampledInitialPoints,
    settingTestMode,
    isFileUploaded,
    offset,
    DOWNSAMPLE,
  ]);

  const startStreaming = () => {
    dataQueueRef.current = []; // Clear the data queue

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const streamingOffset = settingDisplayPoints + offset + 1; // Adjust offset to start streaming from points + 1

    eventSourceRef.current = new EventSource(
      `/api/data?interval=${settingDataInterval}&points=${settingPointsPerInterval}&test=${settingTestMode}&offset=${streamingOffset}&downsample=${DOWNSAMPLE}`
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

    // Start the rolling plot update
    const updatePlot = () => {
      if (dataQueueRef.current.length > 0) {
        const nextPoint = dataQueueRef.current.shift(); // Get the next data point
        if (nextPoint) {
          setDataToDisplay((prevData) => {
            const newData = [...prevData, nextPoint].slice(
              -downsampledInitialPoints
            ); // Maintain the last `points` number of points
            return newData;
          });
        }
      }
    };

    // Synchronize plot update with data interval
    intervalRef.current = setInterval(
      updatePlot,
      settingDataInterval / downsampledAddedPoints
    );
  };

  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
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

    // Calculate y-axis padding
    const yValues = dataToDisplay.map((d) => d.y[0]);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const yPadding = yMax - yMin;

    // Update the data of the graph
    const plotData = dataToDisplay.map((d) => [d.x, d.y]);

    if (!dygraphInstanceRef.current && graphRef.current) {
      // Initialize the graph once
      dygraphInstanceRef.current = new Dygraph(graphRef.current, plotData, {
        labels: ["X", "Y"],
        width: GRAPH_WIDTH,
        height: GRAPH_HEIGHT,
        strokeWidth: 2,
        errorBars: true,
        valueRange: [yMin - yPadding, yMax + yPadding],
        color: "#890089",
      });
    }

    dygraphInstanceRef.current?.updateOptions({
      file: plotData,
      valueRange: [yMin - yPadding, yMax + yPadding], // Apply y-axis padding
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
      />
      <Graph
        graphRef={graphRef}
        isLoading={dataToDisplay.length === 0}
        settingTestMode={settingTestMode}
        isFileUploaded={isFileUploaded}
      />
      {(isFileUploaded || settingTestMode) && dataToDisplay.length > 0 && (
        <Aggregates {...aggregates} />
      )}
    </Wrapper>
  );
}
