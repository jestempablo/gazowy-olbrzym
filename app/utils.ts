import { DataPoint } from "./types";

export const calculateAggregates = (data: DataPoint[]) => {
  if (data.length === 0) return { min: 0, max: 0, average: 0, variance: 0 };

  const values = data.map((d) => d.y[0]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + (b - average) ** 2, 0) / values.length;

  return { min, max, average, variance };
};
