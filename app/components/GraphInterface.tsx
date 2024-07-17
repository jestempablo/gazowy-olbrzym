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
}: GraphInterfaceProps) => {
  return (
    <div>
      <h1>Plot Drawing App</h1>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          marginBottom: "20px",
          gap: "10px",
        }}
      >
        <label>
          Interval (ms):
          <input
            type="number"
            value={settingDataInterval}
            disabled={isStreaming}
            onChange={(e) => setSettingDataInterval(parseInt(e.target.value))}
          />
        </label>
        <label>
          Points per chunk:
          <input
            type="number"
            value={settingDisplayPoints}
            disabled={isStreaming}
            onChange={(e) => setSettingDisplayPoints(parseInt(e.target.value))}
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
