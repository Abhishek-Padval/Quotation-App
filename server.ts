import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // --- API Routes ---

  // AI PDF Parsing
  app.post("/api/ai/parse-pdf", async (req, res) => {
    const { file } = req.body;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: file,
            },
          },
          {
            text: "Extract products from this PDF. Return a JSON array of objects with 'name', 'description', and 'base_price' (number). If price is not found, use 0.",
          },
        ],
        config: { responseMimeType: "application/json" }
      });
      const text = response.text?.trim() || "[]";
      res.json(JSON.parse(text));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Features
  app.post("/api/ai/generate", async (req, res) => {
    const { prompt, type } = req.body;
    try {
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: `You are a professional business assistant. Task: ${type}. Keep it professional, concise, and formal.`,
        }
      });
      const response = await model;
      res.json({ text: response.text });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Vite Middleware ---
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
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Frontend build not found. Please run 'npm run build' first.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
