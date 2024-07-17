interface AggregatesProps {
  min: number;
  max: number;
  average: number;
  variance: number;
}

export const Aggregates = ({
  min,
  max,
  average,
  variance,
}: AggregatesProps) => {
  return (
    <div className="aggregates">
      <p>Min: {min}</p>
      <p>Max: {max}</p>
      <p>Average: {average}</p>
      <p>Variance: {variance}</p>
    </div>
  );
};
