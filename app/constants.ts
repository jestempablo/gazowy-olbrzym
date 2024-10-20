export const DEFAULT_INTERVAL = 500;
export const DEFAULT_DISPLAYED_POINTS = 200000;
export const DEFAULT_POINTS_PER_INTERVAL = 50000;
export const DEFAULT_OFFSET = 0;
export const GRAPH_WIDTH = 800;
export const GRAPH_HEIGHT = 400;
export const DEFAULT_TEST_MODE = false;
export const DB_NAME = "gazowyOlbrzym";
export const DB_STORE_RAW = "rawChunks";
export const DB_STORE_PROCESSED = "processedChunks";
export const DB_VERSION = 1;
export const DYGRAPH_OPTIONS = {
  labels: ["X", "Y"],
  width: GRAPH_WIDTH,
  height: GRAPH_HEIGHT,
  strokeWidth: 1,
  errorBars: true,
  color: "#890089",
  fillAlpha: 0.5,
};
export const CHUNK_SIZE = 1024 * 1024 * 5;
export const DOWNSAMPLE_THRESHOLD = GRAPH_WIDTH * 2;
