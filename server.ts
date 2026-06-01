import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// Import handlers from Serverless Functions
import improveHandler from "./api/ai/improve.ts";
import improveArgumentHandler from "./api/ai/improve-argument.ts";
import decoupleHandler from "./api/ai/decouple.ts";
import pdfParseHandler from "./api/pdf/parse.ts";

const app = express();

// Register JSON parser for standard APIs
app.use(express.json());

// Register API routes mapping to the Serverless handlers
app.post("/api/ai/improve", improveHandler);
app.post("/api/ai/improve-argument", improveArgumentHandler);
app.post("/api/ai/decouple", decoupleHandler);
app.post("/api/pdf/parse", express.raw({ type: "application/pdf", limit: "15mb" }), pdfParseHandler);

const PORT = 3000;

// Configure Vite integration as middleware or compile path serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
