"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Dygraph from "dygraphs";
import { GraphInterface } from "./components/GraphInterface";
import {
  DEFAULT_INTERVAL,
  DEFAULT_DISPLAYED_POINTS,
  DEFAULT_POINTS_PER_INTERVAL,
} from "./constants";

interface DataPoint {
  x: number;
  y: [number, number];
}

const DOWNSAMPLE = 1; // if 2, then two points are merged into one

export default function Home() {
  const [dataToDisplay, setDataToDisplay] = useState<DataPoint[]>([]);

  const [settingDataInterval, setSettingDataInterval] =
    useState<number>(DEFAULT_INTERVAL);
  const [settingDisplayPoints, setSettingDisplayPoints] = useState<number>(
    DEFAULT_DISPLAYED_POINTS
  );
  const [settingPointsPerInterval, setSettingPointsPerInterval] =
    useState<number>(DEFAULT_POINTS_PER_INTERVAL); // Default value of points per interval
  const [settingTestMode, setSettingTestMode] = useState<boolean>(true); // Test mode enabled by default
  const [offset, setOffset] = useState<number>(0); // New offset state

  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const graphRef = useRef<HTMLDivElement | null>(null);
  const dygraphInstanceRef = useRef<Dygraph | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const dataQueueRef = useRef<DataPoint[]>([]); // Queue to store preloaded data points
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Reference to the interval

  const downsampledInitialPoints = useMemo(
    () => Math.floor(settingDisplayPoints / DOWNSAMPLE),
    [settingDisplayPoints]
  );

  const downsampledAddedPoints = useMemo(
    () => Math.floor(settingPointsPerInterval / DOWNSAMPLE),
    [settingPointsPerInterval]
  );

  const preloadData = useCallback(() => {
    if (!isStreaming) {
      setDataToDisplay([]); // Clear existing data
      dataQueueRef.current = []; // Clear the data queue

      const preloadEventSource = new EventSource(
        `/api/data?interval=${settingDataInterval}&points=${downsampledInitialPoints}&test=${settingTestMode}&offset=${offset}&downsample=${DOWNSAMPLE}`
      );
      preloadEventSource.onmessage = (event) => {
        const parsedData: DataPoint[] = JSON.parse(event.data);
        dataQueueRef.current.push(...parsedData);
        if (dataQueueRef.current.length >= downsampledInitialPoints) {
          const preloadedData = dataQueueRef.current.slice(
            0,
            downsampledInitialPoints
          );
          setDataToDisplay(preloadedData); // Preload the graph with data
          preloadEventSource.close(); // Close the preload connection
        }
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
    offset,
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
    if (!dygraphInstanceRef.current && graphRef.current) {
      // Initialize the graph once
      dygraphInstanceRef.current = new Dygraph(graphRef.current, [], {
        labels: ["X", "Y"],
        width: 800,
        height: 400,
        xlabel: "X Axis",
        ylabel: "Y Axis",
        strokeWidth: 2,
        drawPoints: true,
        errorBars: true,
        pointSize: 3,
      });
    }

    if (dataToDisplay.length === 0) return;

    // Calculate y-axis padding
    const yValues = dataToDisplay.map((d) => d.y[0]);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const yPadding = yMax - yMin;

    // Update the data of the graph
    const plotData = dataToDisplay.map((d) => [d.x, d.y]);
    dygraphInstanceRef.current?.updateOptions({
      file: plotData,
      valueRange: [yMin - yPadding, yMax + yPadding], // Apply y-axis padding
    });
  }, [dataToDisplay]);

  useEffect(() => {
    preloadData();
  }, [settingPointsPerInterval, preloadData, offset]); // Add offset to dependency array

  return (
    <GraphInterface
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
      graphRef={graphRef}
      offset={offset} // Pass the offset state
      setOffset={setOffset} // Pass the offset setter
    />
  );
}
