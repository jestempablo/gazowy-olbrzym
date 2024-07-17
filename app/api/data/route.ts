import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse";
import fs from "fs";
import path from "path";

// Downsampling function
function downsampleData(
  data: { x: number; y: [number, number] }[],
  factor: number
) {
  const downsampled: { x: number; y: [number, number] }[] = [];

  for (let i = 0; i < data.length; i += factor) {
    const chunk = data.slice(i, i + factor);
    const avgX = chunk.reduce((sum, point) => sum + point.x, 0) / chunk.length;
    const avgY =
      chunk.reduce((sum, point) => sum + point.y[0], 0) / chunk.length;
    const minY = Math.min(...chunk.map((point) => point.y[0]));
    const maxY = Math.max(...chunk.map((point) => point.y[0]));
    const error = (maxY - minY) / factor;

    downsampled.push({ x: avgX, y: [avgY, error] });
  }

  return downsampled;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const interval = parseInt(url.searchParams.get("interval") || "3000", 10);
  const points = parseInt(url.searchParams.get("points") || "80", 10);
  const test = url.searchParams.get("test") === "true";
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const downsample = Math.max(
    1,
    parseInt(url.searchParams.get("downsample") || "3", 10)
  );

  if (test) {
    const readable = new ReadableStream({
      start(controller) {
        const generateRandomData = () => {
          let index = offset;
          const emitData = () => {
            if (index < 100000) {
              const chunk: {
                x: number;
                y: [number, number];
              }[] = Array.from({ length: points * downsample }, (_, i) => ({
                x: index + i,
                y: [Math.floor(Math.random() * 100), 0],
              }));

              const downsampledChunk = downsampleData(chunk, downsample);
              controller.enqueue(
                `data: ${JSON.stringify(downsampledChunk)}\n\n`
              );
              index += points * downsample;
              setTimeout(emitData, interval / downsample);
            } else {
              controller.enqueue("event: end\n\n");
              controller.close();
            }
          };
          emitData();
        };
        generateRandomData();
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const filePath = path.resolve("./public", "data.csv");

  const readable = new ReadableStream({
    start(controller) {
      const readStream = fs.createReadStream(filePath);
      const parser = parse({ columns: false, trim: true });

      let rows: { x: number; y: [number, number] }[] = [];

      readStream.pipe(parser);

      parser.on("data", (row) => {
        rows.push({ x: +row[0], y: [+row[1], 0] });
      });

      parser.on("end", () => {
        let index = offset;
        const emitData = () => {
          if (index < rows.length) {
            const chunk = rows.slice(index, index + points * downsample);
            if (chunk.length > 0) {
              const downsampledChunk = downsampleData(chunk, downsample);
              controller.enqueue(
                `data: ${JSON.stringify(downsampledChunk)}\n\n`
              );
              index += points * downsample;
              setTimeout(emitData, interval);
            }
          } else {
            controller.enqueue("event: end\n\n");
            controller.close();
          }
        };
        emitData();
      });

      parser.on("error", (error) => {
        console.error("Error reading file:", error);
        controller.enqueue("event: error\n\n");
        controller.close();
      });
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
