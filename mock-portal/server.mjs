import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.MOCK_PORT || 4177;

app.use(express.static(__dirname));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "mock-supplier-portal",
    port: PORT,
  });
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Mock supplier portal running on http://localhost:${PORT}`);
});
