"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Dygraph from "dygraphs";
import { GraphInterface } from "./components/GraphInterface";
import { DEFAULT_INTERVAL, DEFAULT_POINTS } from "./constants";

interface DataPoint {
  x: number;
  y: number;
}

export default function Home() {
  const [dataToDisplay, setDataToDisplay] = useState<DataPoint[]>([]);

  const [settingDataInterval, setSettingDataInterval] =
    useState<number>(DEFAULT_INTERVAL);
  const [settingDisplayPoints, setSettingDisplayPoints] =
    useState<number>(DEFAULT_POINTS); // Default value of points is 80
  const [settingTestMode, setSettingTestMode] = useState<boolean>(true); // Test mode enabled by default

  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const graphRef = useRef<HTMLDivElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const dataQueueRef = useRef<DataPoint[]>([]); // Queue to store preloaded data points
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Reference to the interval

  const preloadData = useCallback(() => {
    if (!isStreaming) {
      setDataToDisplay([]); // Clear existing data
      dataQueueRef.current = []; // Clear the data queue

      const preloadEventSource = new EventSource(
        `/api/data?interval=${settingDataInterval}&points=${settingDisplayPoints}&test=${settingTestMode}&offset=0`
      );
      preloadEventSource.onmessage = (event) => {
        const parsedData: DataPoint[] = JSON.parse(event.data);
        dataQueueRef.current.push(...parsedData);
        if (dataQueueRef.current.length >= settingDisplayPoints) {
          const preloadedData = dataQueueRef.current.slice(
            0,
            settingDisplayPoints
          );
          setDataToDisplay(preloadedData); // Preload the graph with data
          preloadEventSource.close(); // Close the preload connection
        }
      };
      preloadEventSource.onerror = () => {
        preloadEventSource.close();
      };
    }
  }, [settingDataInterval, isStreaming, settingDisplayPoints, settingTestMode]);

  const startStreaming = () => {
    dataQueueRef.current = []; // Clear the data queue

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const offset = settingDisplayPoints + 1; // Offset to start streaming from points + 1

    eventSourceRef.current = new EventSource(
      `/api/data?interval=${settingDataInterval}&points=${settingDisplayPoints}&test=${settingTestMode}&offset=${offset}`
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
              -settingDisplayPoints
            ); // Maintain the last `points` number of points

            console.log("last x", newData[newData.length - 1].x);
            console.log("new last x", nextPoint.x);
            return newData;
          });
        }
      }
    };

    // Synchronize plot update with data interval
    intervalRef.current = setInterval(
      updatePlot,
      settingDataInterval / settingDisplayPoints
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
    if (dataToDisplay.length === 0) return;

    // console.log("length", dataToDisplay.length);
    // console.log("first x", dataToDisplay[0].x);
    // console.log("last x", dataToDisplay[dataToDisplay.length - 1].x);

    // Calculate y-axis padding
    const yValues = dataToDisplay.map((d) => d.y);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const yPadding = yMax - yMin;

    // Draw the rolling plot
    const plotData = dataToDisplay.map((d) => [d.x, d.y]);

    if (graphRef.current) {
      new Dygraph(graphRef.current, plotData, {
        labels: ["X", "Y"],
        width: 800,
        height: 400,
        xlabel: "X Axis",
        ylabel: "Y Axis",
        strokeWidth: 2,
        drawPoints: true,
        pointSize: 3,
        valueRange: [yMin - yPadding, yMax + yPadding], // Apply y-axis padding
      });
    }
  }, [dataToDisplay]);

  useEffect(() => {
    preloadData();
  }, [settingDisplayPoints, preloadData]);

  return (
    <GraphInterface
      settingDataInterval={settingDataInterval}
      setSettingDataInterval={setSettingDataInterval}
      settingDisplayPoints={settingDisplayPoints}
      setSettingDisplayPoints={setSettingDisplayPoints}
      settingTestMode={settingTestMode}
      setSettingTestMode={setSettingTestMode}
      isStreaming={isStreaming}
      startStreaming={startStreaming}
      stopStreaming={stopStreaming}
      graphRef={graphRef}
    />
  );
}
