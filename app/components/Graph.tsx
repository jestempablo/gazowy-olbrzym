import { GRAPH_HEIGHT, GRAPH_WIDTH } from "../constants";

interface GraphProps {
  graphRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  settingTestMode: boolean;
  isFileUploaded: boolean;
}

export const Graph = ({
  graphRef,
  isLoading,
  settingTestMode,
  isFileUploaded,
}: GraphProps) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: GRAPH_HEIGHT,
        width: GRAPH_WIDTH,
      }}
    >
      {!settingTestMode && !isFileUploaded ? (
        <div>Upload a file or enable test mode to start plotting</div>
      ) : isLoading ? (
        "Please wait..."
      ) : (
        <div ref={graphRef} />
      )}
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
