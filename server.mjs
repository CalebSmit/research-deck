// server.mjs
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

import { Payload } from "./schema.mjs";
import { buildPptxBuffer } from "./buildDeck.mjs";

// ---------- paths / env ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || ""; // optional; set in prod if you want
const APP_BASE = process.env.APP_BASE_URL; // optional; e.g. https://your-app.onrender.com

// static folder for downloadable PPTX files
const STATIC_DIR = path.join(__dirname, "public");
if (!fs.existsSync(STATIC_DIR)) fs.mkdirSync(STATIC_DIR, { recursive: true });

// ---------- app ----------
const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.use("/public", express.static(STATIC_DIR, { maxAge: "1h", index: false }));

// healthcheck
app.get("/", (_req, res) => res.type("text").send("Server is running ✅"));

// optional API-key check for the GPT Action
function checkKey(req, res, next) {
  if (!API_KEY) return next();               // open if no key configured
  if (req.get("x-api-key") === API_KEY) return next();
  return res.status(401).json({ error: "unauthorized" });
}

// ---------- 1) Local download (your existing workflow) ----------
app.post("/build-pptx-report", async (req, res) => {
  try {
    const data = Payload.parse(req.body);                      // validate input
    const deck = await buildPptxBuffer(data);                  // build Buffer

    const filename = `Research_${data.ticker || "Report"}_${data.asOfDate || new Date().toISOString().slice(0,10)}.pptx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(deck);
  } catch (err) {
    console.error("build-pptx-report error:", err);
    res.status(400).json({ error: "bad_request", message: String(err?.message || err) });
  }
});

// ---------- 2) Action endpoint for Custom GPT (returns a URL) ----------
app.post("/api/build-pptx", checkKey, async (req, res) => {
  try {
    const data = Payload.parse(req.body);
    const buf = await buildPptxBuffer(data);

    // Save to /public and return a link
    const id = randomUUID();
    const filePath = path.join(STATIC_DIR, `${id}.pptx`);
    await fs.promises.writeFile(filePath, buf);

    const base = APP_BASE || `${req.protocol}://${req.get("host")}`;
    const downloadUrl = `${base}/public/${id}.pptx`;
    const fileName = `Research_${data.ticker || "Report"}_${data.asOfDate || new Date().toISOString().slice(0,10)}.pptx`;

    res.status(201).json({ fileName, downloadUrl, size: buf.length });
  } catch (err) {
    console.error("api/build-pptx error:", err);
    res.status(400).json({ error: "bad_request", message: String(err?.message || err) });
  }
});

// 404 fallback
app.use((_req, res) => res.status(404).json({ error: "not_found" }));

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});

// at the bottom of server.mjs
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});

