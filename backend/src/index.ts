import "dotenv/config";
import express from "express";
import cors from "cors";
import chatRouter from "./routes/chat.js";

const app = express();

const PORT = Number(process.env.PORT) || 3000;

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_ORIGIN
  })
);

app.use(express.json());

// Health check used to verify that the backend is running.
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "AI User Guide Assistant backend is running"
  });
});

app.use("/api/chat", chatRouter);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});