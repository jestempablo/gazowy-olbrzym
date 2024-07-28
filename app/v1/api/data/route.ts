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

// Optimized downsampling function
function downsampleData(
  data: { x: number; y: [number, number] }[],
  factor: number
) {
  const downsampled: { x: number; y: [number, number] }[] = [];
  let sumX = 0;
  let sumY = 0;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < data.length; i++) {
    sumX += data[i].x;
    sumY += data[i].y[0];
    minY = Math.min(minY, data[i].y[0]);
    maxY = Math.max(maxY, data[i].y[0]);

    if ((i + 1) % factor === 0 || i === data.length - 1) {
      const avgX = sumX / factor;
      const avgY = sumY / factor;
      const error = (maxY - minY) / factor;
      downsampled.push({ x: avgX, y: [avgY, error] });

      // Reset accumulators
      sumX = 0;
      sumY = 0;
      minY = Infinity;
      maxY = -Infinity;
    }
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
    parseInt(url.searchParams.get("downsample") || "1", 10)
  );

  if (test) {
    let lastY = Math.floor(Math.random() * 100); // Initialize lastY with a random value

    const readable = new ReadableStream({
      start(controller) {
        const generateRandomData = () => {
          let index = offset;
          const emitData = () => {
            if (index < 1000000000) {
              const chunk: {
                x: number;
                y: [number, number];
              }[] = Array.from({ length: points * downsample }, (_, i) => {
                const newY = lastY + (Math.random() - 0.5) * 10; // Generate newY close to lastY
                lastY = newY; // Update lastY for the next iteration
                return {
                  x: index + i,
                  y: [newY, 0],
                };
              });

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
