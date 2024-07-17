interface GraphInterfaceProps {
  settingDataInterval: number;
  setSettingDataInterval: (interval: number) => void;
  settingDisplayPoints: number;
  setSettingDisplayPoints: (points: number) => void;
  settingTestMode: boolean;
  setSettingTestMode: (testMode: boolean) => void;
  isStreaming: boolean;
  startStreaming: () => void;
  stopStreaming: () => void;
  graphRef: React.RefObject<HTMLDivElement>;
  offset: number;
  setOffset: (offset: number) => void;
  settingPointsPerInterval: number;
  setSettingPointsPerInterval: (points: number) => void;
}

export const GraphInterface = ({
  settingDataInterval,
  setSettingDataInterval,
  settingDisplayPoints,
  setSettingDisplayPoints,
  settingTestMode,
  setSettingTestMode,
  isStreaming,
  startStreaming,
  stopStreaming,
  graphRef,
  offset,
  setOffset,
  settingPointsPerInterval,
  setSettingPointsPerInterval,
}: GraphInterfaceProps) => {
  return (
    <div>
      <h1>Plot Drawing App</h1>
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
            onChange={(e) =>
              setSettingPointsPerInterval(Number(e.target.value))
            }
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
        {!isStreaming ? (
          <button onClick={startStreaming} disabled={isStreaming}>
            Start
          </button>
        ) : (
          <button onClick={stopStreaming} disabled={!isStreaming}>
            Stop
          </button>
        )}
      </div>
      <div ref={graphRef}></div>
    </div>
  );
};

/*
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
    */
