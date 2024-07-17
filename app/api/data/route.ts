import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

// Helper function to convert web stream to Node.js stream
function webStreamToNodeStream(
  webStream: ReadableStream<Uint8Array>
): Readable {
  const reader = webStream.getReader();
  const nodeStream = new Readable({
    read() {
      reader
        .read()
        .then(({ done, value }) => {
          if (done) {
            this.push(null);
          } else {
            this.push(Buffer.from(value));
          }
        })
        .catch((err) => {
          this.emit("error", err);
        });
    },
  });
  return nodeStream;
}

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
      let index = 0;

      readStream.pipe(parser);

      parser.on("data", (row) => {
        rows.push({ x: +row[0], y: [+row[1], 0] });
      });

      parser.on("end", () => {
        const emitData = () => {
          if (index + offset < rows.length) {
            const chunk = rows.slice(
              index + offset,
              index + offset + points * downsample
            );
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

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof Blob)) {
    return new NextResponse("No file uploaded or invalid file", {
      status: 400,
    });
  }

  const filePath = path.resolve("./public", "data.csv");
  const fileStream = fs.createWriteStream(filePath);

  const readable = webStreamToNodeStream(file.stream());

  await new Promise((resolve, reject) => {
    readable.pipe(fileStream);
    readable.on("end", resolve);
    readable.on("error", reject);
  });

  return new NextResponse("File uploaded successfully", { status: 200 });
}
