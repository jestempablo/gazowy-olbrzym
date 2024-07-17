import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_DISPLAYED_POINTS,
  DEFAULT_INTERVAL,
  DEFAULT_POINTS_PER_INTERVAL,
} from "../constants";

interface ControlsProps {
  settingDataInterval: number;
  setSettingDataInterval: (interval: number) => void;
  settingDisplayPoints: number;
  setSettingDisplayPoints: (points: number) => void;
  settingPointsPerInterval: number;
  setSettingPointsPerInterval: (points: number) => void;
  settingTestMode: boolean;
  setSettingTestMode: (testMode: boolean) => void;
  isStreaming: boolean;
  startStreaming: () => void;
  stopStreaming: () => void;
  offset: number;
  setOffset: (offset: number) => void;
  handleFileUpload: (file: File) => void;
  isFileUploaded: boolean;
  setIsFileUploaded: (isFileUploaded: boolean) => void;
}

const useDebounceState = (
  originalState: number,
  setOriginalState: (value: number) => void
) => {
  const [value, setValue] = useState(originalState);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setOriginalState(value);
    }, 1500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, setOriginalState]);

  return [value, setValue] as const;
};

export const Controls = ({
  settingDataInterval,
  setSettingDataInterval,
  settingDisplayPoints,
  setSettingDisplayPoints,
  settingPointsPerInterval,
  setSettingPointsPerInterval,
  settingTestMode,
  setSettingTestMode,
  isStreaming,
  startStreaming,
  stopStreaming,
  offset,
  setOffset,
  handleFileUpload,
  isFileUploaded,
  setIsFileUploaded,
}: ControlsProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resetForm = () => {
    setSettingDataInterval(DEFAULT_INTERVAL);
    setSettingDisplayPoints(DEFAULT_DISPLAYED_POINTS);
    setSettingPointsPerInterval(DEFAULT_POINTS_PER_INTERVAL);
    setSettingTestMode(false);
    setOffset(0);
    setIsFileUploaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isDirty = useMemo(() => {
    return (
      settingDataInterval !== DEFAULT_INTERVAL ||
      settingDisplayPoints !== DEFAULT_DISPLAYED_POINTS ||
      settingPointsPerInterval !== DEFAULT_POINTS_PER_INTERVAL ||
      settingTestMode ||
      offset !== 0 ||
      isFileUploaded
    );
  }, [
    offset,
    settingDataInterval,
    settingDisplayPoints,
    settingPointsPerInterval,
    settingTestMode,
    isFileUploaded,
  ]);

  const [offsetDebounced, setOffsetDebounced] = useDebounceState(
    offset,
    setOffset
  );

  const [settingDataIntervalDebounced, setSettingDataIntervalDebounced] =
    useDebounceState(settingDataInterval, setSettingDataInterval);

  const [settingDisplayPointsDebounced, setSettingDisplayPointsDebounced] =
    useDebounceState(settingDisplayPoints, setSettingDisplayPoints);

  const [
    settingPointsPerIntervalDebounced,
    setSettingPointsPerIntervalDebounced,
  ] = useDebounceState(settingPointsPerInterval, setSettingPointsPerInterval);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        marginBottom: "20px",
        gap: "10px",
        width: 400,
      }}
    >
      <label
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>N (displayed points):</span>
        <input
          type="number"
          value={settingDisplayPointsDebounced}
          disabled={isStreaming}
          onChange={(e) =>
            setSettingDisplayPointsDebounced(Number(e.target.value))
          }
        />
      </label>
      <label
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>T (load more interval):</span>
        <input
          type="number"
          value={settingDataIntervalDebounced}
          disabled={isStreaming}
          onChange={(e) =>
            setSettingDataIntervalDebounced(Number(e.target.value))
          }
        />
      </label>
      <label
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>P (points per interval):</span>
        <input
          type="number"
          value={settingPointsPerIntervalDebounced}
          disabled={isStreaming}
          onChange={(e) =>
            setSettingPointsPerIntervalDebounced(Number(e.target.value))
          }
        />
      </label>
      <label
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>S (offset):</span>
        <input
          type="number"
          value={offsetDebounced}
          disabled={isStreaming}
          onChange={(e) => setOffsetDebounced(Number(e.target.value))}
        />
      </label>
      <label>
        Test mode:
        <input
          type="checkbox"
          checked={settingTestMode}
          disabled={isStreaming}
          onChange={(e) => setSettingTestMode(e.target.checked)}
        />
      </label>
      <button onClick={resetForm} disabled={!isDirty}>
        Reset form
      </button>
      <label>
        Upload CSV:
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />
      </label>
      {!isStreaming ? (
        <button
          onClick={startStreaming}
          disabled={isStreaming || (!isFileUploaded && !settingTestMode)}
        >
          Start
        </button>
      ) : (
        <button onClick={stopStreaming} disabled={!isStreaming}>
          Stop
        </button>
      )}
    </div>
  );
};
