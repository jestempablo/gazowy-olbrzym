import {
  Button,
  FormControlLabel,
  InputAdornment,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
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
  isLoading: boolean;
  downsampleRate: number;
  isPaused: boolean;
  setIsPaused: (isPaused: boolean) => void;
}

const useDebounceState = (
  originalState: number,
  setOriginalState: (value: number) => void,
  setIsDebounceActive: (value: boolean) => void
) => {
  const [value, setValue] = useState(originalState);
  const [hasError, setHasError] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setValueWithErrorCheck = (newValue: number, isError?: boolean) => {
    setHasError(isError || false);
    setValue(newValue);
  };

  useEffect(() => {
    setIsDebounceActive(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!hasError) {
      timeoutRef.current = setTimeout(() => {
        if (!hasError) setOriginalState(value);

        setIsDebounceActive(false);
      }, 1500);
    } else {
      setIsDebounceActive(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, setOriginalState, setIsDebounceActive, hasError]);

  return [value, setValueWithErrorCheck] as const;
};

const clearLeadingZeros = (value: string | number) => {
  if (value === "0" || value === 0) return "0";
  return value.toString().replace(/^0+/, "");
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
  isLoading,
  downsampleRate,
  isPaused,
  setIsPaused,
}: ControlsProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resetForm = () => {
    setSettingDataInterval(DEFAULT_INTERVAL);
    setSettingDataIntervalDebounced(DEFAULT_INTERVAL);
    setSettingDisplayPoints(DEFAULT_DISPLAYED_POINTS);
    setSettingDisplayPointsDebounced(DEFAULT_DISPLAYED_POINTS);
    setSettingPointsPerInterval(DEFAULT_POINTS_PER_INTERVAL);
    setSettingPointsPerIntervalDebounced(DEFAULT_POINTS_PER_INTERVAL);
    setSettingTestMode(false);
    setOffset(0);
    setOffsetDebounced(0);
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

  const [isDebounceActive, setIsDebounceActive] = useState(false);

  const [offsetDebounced, setOffsetDebounced] = useDebounceState(
    offset,
    setOffset,
    setIsDebounceActive
  );

  const [settingDataIntervalDebounced, setSettingDataIntervalDebounced] =
    useDebounceState(
      settingDataInterval,
      setSettingDataInterval,
      setIsDebounceActive
    );

  const [settingDisplayPointsDebounced, setSettingDisplayPointsDebounced] =
    useDebounceState(
      settingDisplayPoints,
      setSettingDisplayPoints,
      setIsDebounceActive
    );

  const [
    settingPointsPerIntervalDebounced,
    setSettingPointsPerIntervalDebounced,
  ] = useDebounceState(
    settingPointsPerInterval,
    setSettingPointsPerInterval,
    setIsDebounceActive
  );

  return (
    <Stack spacing={2} sx={{ width: 800, pb: 2 }}>
      <TextField
        label={`N (displayed points${
          downsampleRate > 1 ? `, downsampled by ${downsampleRate}` : ""
        })`}
        type="number"
        value={clearLeadingZeros(settingDisplayPointsDebounced)}
        disabled={isStreaming}
        onChange={(e) =>
          setSettingDisplayPointsDebounced(
            Number(e.target.value),
            settingDisplayPointsDebounced > 100000000 ||
              settingDisplayPointsDebounced < downsampleRate
          )
        }
        helperText={`Min value: ${downsampleRate}, max value: 100000000`}
        error={
          settingDisplayPointsDebounced > 100000000 ||
          settingDisplayPointsDebounced < downsampleRate
        }
      />

      <TextField
        label="T (load more interval, ms)"
        type="number"
        value={clearLeadingZeros(settingDataIntervalDebounced)}
        disabled={isStreaming}
        onChange={(e) =>
          setSettingDataIntervalDebounced(
            Number(e.target.value),
            settingDataIntervalDebounced < 16
          )
        }
        helperText="Min value: 16"
        error={settingDataIntervalDebounced < 16}
      />

      <TextField
        label={`P (points per interval)`}
        type="number"
        value={clearLeadingZeros(settingPointsPerIntervalDebounced)}
        disabled={isStreaming}
        onChange={(e) =>
          setSettingPointsPerIntervalDebounced(
            Number(e.target.value),
            settingPointsPerIntervalDebounced < 1
          )
        }
        helperText={`Min value: 1`}
        error={settingPointsPerIntervalDebounced < 1}
      />

      <TextField
        label="S (offset)"
        type="number"
        value={clearLeadingZeros(offsetDebounced)}
        disabled={isStreaming}
        onChange={(e) =>
          setOffsetDebounced(Number(e.target.value), offsetDebounced < 0)
        }
        helperText="Min value: 0"
        error={offsetDebounced < 0}
      />

      <FormControlLabel
        control={
          <Switch
            checked={settingTestMode}
            disabled={isStreaming}
            onChange={(e) => setSettingTestMode(e.target.checked)}
          />
        }
        label="Test mode"
      />

      <input
        ref={fileInputRef}
        type="file"
        id="upload-csv"
        accept=".csv"
        disabled={isStreaming}
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
            setSettingTestMode(false);
          }
        }}
      />

      <TextField
        value={
          fileInputRef.current?.value
            ? fileInputRef.current?.value.split("\\").pop()
            : "No CSV file chosen"
        }
        disabled
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <label htmlFor="upload-csv">
                <Button
                  variant="contained"
                  color="primary"
                  component="span"
                  disabled={isStreaming}
                  size="small"
                >
                  {!isFileUploaded ? "Upload CSV" : "Choose different file"}
                </Button>
              </label>
            </InputAdornment>
          ),
        }}
      />
      <Button
        onClick={resetForm}
        disabled={!isDirty || isStreaming}
        variant="outlined"
        color="warning"
        size="small"
      >
        Reset form
      </Button>
      {!isStreaming ? (
        <Button
          onClick={isPaused ? () => setIsPaused(false) : startStreaming}
          disabled={
            isDebounceActive ||
            isLoading ||
            (!isFileUploaded && !settingTestMode)
          }
          size="large"
        >
          {isDebounceActive
            ? "Please wait momentarily"
            : isPaused
            ? "Reset to start"
            : "Start"}
        </Button>
      ) : (
        <Button onClick={stopStreaming} disabled={!isStreaming} size="large">
          Pause
        </Button>
      )}
    </Stack>
  );
};
