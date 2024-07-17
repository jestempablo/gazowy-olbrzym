import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const interval = parseInt(url.searchParams.get("interval") || "3000", 10);
  const points = parseInt(url.searchParams.get("points") || "80", 10);
  const test = url.searchParams.get("test") === "true";
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  if (test) {
    const readable = new ReadableStream({
      start(controller) {
        const generateRandomData = () => {
          let index = offset;
          const emitData = () => {
            if (index < 1000) {
              const chunk = Array.from({ length: points }, (_, i) => ({
                x: index + i,
                y: Math.floor(Math.random() * 100),
              }));
              controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
              index += points;
              setTimeout(emitData, interval);
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

      let chunk: { x: number; y: number }[] = [];
      let rows: { x: number; y: number }[] = [];

      readStream.pipe(parser);

      parser.on("data", (row) => {
        rows.push({ x: +row[0], y: +row[1] });
      });

      parser.on("end", () => {
        let index = offset;
        const emitData = () => {
          if (index < rows.length) {
            chunk = rows.slice(index, index + points);
            if (chunk.length > 0) {
              controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
              index += points;
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
