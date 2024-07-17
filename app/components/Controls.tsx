import { useMemo, useRef } from "react";
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
      <label>
        N (displayed points):
        <input
          type="number"
          value={settingDisplayPoints}
          disabled={isStreaming}
          onChange={(e) => setSettingDisplayPoints(Number(e.target.value))}
        />
      </label>
      <label>
        T (load more interval):
        <input
          type="number"
          value={settingDataInterval}
          disabled={isStreaming}
          onChange={(e) => setSettingDataInterval(Number(e.target.value))}
        />
      </label>
      <label>
        P (points per interval):
        <input
          type="number"
          value={settingPointsPerInterval}
          disabled={isStreaming}
          onChange={(e) => setSettingPointsPerInterval(Number(e.target.value))}
        />
      </label>
      <label>
        S (offset):
        <input
          type="number"
          value={offset}
          disabled={isStreaming}
          onChange={(e) => setOffset(Number(e.target.value))}
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
