import "dotenv/config";
import express from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024 } });

const endpoint = (process.env.AZURE_FACE_ENDPOINT || "").replace(/\/$/, "");
const apiKey = process.env.AZURE_FACE_KEY || "";
const port = Number(process.env.PORT || 3000);
const dataDir = path.join(__dirname, "data");

app.use(express.static(path.join(__dirname, "public")));

function safeUsername(v) {
  return String(v || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "_").slice(0, 80);
}

function configured() {
  if (!endpoint || !apiKey) throw new Error("Set AZURE_FACE_ENDPOINT and AZURE_FACE_KEY in environment variables.");
}

async function detect(buffer) {
  configured();
  const url = `${endpoint}/face/v1.2/detect?returnFaceId=true&detectionModel=detection_03&recognitionModel=recognition_04&returnFaceAttributes=qualityForRecognition`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey,
      "Content-Type": "application/octet-stream"
    },
    body: buffer
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error?.message || `Azure detect failed (${r.status})`);
  if (!Array.isArray(body) || body.length !== 1) {
    throw new Error(body?.length > 1 ? "More than one face detected." : "No face detected.");
  }
  return body[0];
}

async function verify(faceId1, faceId2) {
  configured();
  const r = await fetch(`${endpoint}/face/v1.2/verify`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ faceId1, faceId2 })
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error?.message || `Azure verify failed (${r.status})`);
  return body;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, configured: Boolean(endpoint && apiKey) });
});

app.post("/api/register", upload.single("image"), async (req, res, next) => {
  try {
    const username = safeUsername(req.body.username);
    if (!username) return res.status(400).json({ error: "Username is required." });
    if (!req.file) return res.status(400).json({ error: "Image is required." });

    const face = await detect(req.file.buffer);
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, `${username}.jpg`), req.file.buffer);
    await fs.writeFile(path.join(dataDir, `${username}.json`), JSON.stringify({
      username,
      registeredAt: new Date().toISOString(),
      qualityForRecognition: face?.faceAttributes?.qualityForRecognition || null
    }, null, 2));

    res.json({ ok: true, message: `Face registered for ${username}.` });
  } catch (e) { next(e); }
});

app.post("/api/login", upload.single("image"), async (req, res, next) => {
  try {
    const username = safeUsername(req.body.username);
    if (!username) return res.status(400).json({ error: "Username is required." });
    if (!req.file) return res.status(400).json({ error: "Image is required." });

    let reference;
    try {
      reference = await fs.readFile(path.join(dataDir, `${username}.jpg`));
    } catch {
      return res.status(404).json({ error: "No registered face for this username." });
    }

    const [a, b] = await Promise.all([detect(reference), detect(req.file.buffer)]);
    const result = await verify(a.faceId, b.faceId);
    const threshold = 0.75;
    const accepted = Boolean(result.isIdentical) && Number(result.confidence) >= threshold;

    res.json({
      ok: true,
      accepted,
      confidence: result.confidence,
      isIdentical: result.isIdentical,
      threshold,
      message: accepted ? "Login successful." : "Face verification failed."
    });
  } catch (e) { next(e); }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error." });
});

app.listen(port, () => console.log(`Running at http://localhost:${port}`));
