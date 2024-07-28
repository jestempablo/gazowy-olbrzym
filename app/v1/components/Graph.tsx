import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { GRAPH_WIDTH } from "../constants";

interface GraphProps {
  graphRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  settingTestMode: boolean;
  isFileUploaded: boolean;
  min: number;
  max: number;
  average: number;
  variance: number;
  xMin: number;
  xMax: number;
  downsampleRate: number;
}

export const Graph = ({
  graphRef,
  isLoading,
  settingTestMode,
  isFileUploaded,
  min,
  max,
  average,
  variance,
  xMin,
  xMax,
  downsampleRate,
}: GraphProps) => {
  return (
    <Card
      style={{
        width: GRAPH_WIDTH,
      }}
    >
      {!settingTestMode && !isFileUploaded ? (
        <CardContent>
          Upload a file or enable test mode to start plotting
        </CardContent>
      ) : isLoading ? (
        <CardContent>
          <CircularProgress />
        </CardContent>
      ) : (
        <>
          <CardMedia>
            <div ref={graphRef} />
          </CardMedia>
          <CardContent>
            <Grid container sx={{ textAlign: "center" }} columnSpacing={2}>
              <Grid item xs={3}>
                Y Min
                <Divider />
              </Grid>
              <Grid item xs={3}>
                Y Max
                <Divider />
              </Grid>
              <Grid item xs={3}>
                Average
                <Divider />
              </Grid>
              <Grid item xs={3}>
                Variance
                <Divider />
              </Grid>
              <Grid item xs={3}>
                <Typography variant="subtitle2">{min}</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="subtitle2">{max}</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="subtitle2">{average}</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="subtitle2">{variance}</Typography>
              </Grid>
              <Grid item xs={3} pt={3}>
                X Min
                <Divider />
              </Grid>
              <Grid item xs={3} pt={3}>
                X Max
                <Divider />
              </Grid>
              <Grid item xs={3} pt={3}>
                Downsample rate
                <Divider />
              </Grid>
              <Grid item xs={3} pt={3}>
                Paweł
                <Divider />
              </Grid>
              <Grid item xs={3}>
                <Typography variant="subtitle2">
                  {Math.ceil(xMin) - Math.floor(downsampleRate / 2)}
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="subtitle2">
                  {Math.floor(xMax) + Math.ceil(downsampleRate / 2)}
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="subtitle2">{downsampleRate}</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="subtitle2">Foryński</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </>
      )}
    </Card>
  );
};
