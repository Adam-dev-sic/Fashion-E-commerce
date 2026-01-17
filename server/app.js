// server.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import controllerRoutes from "./routes/controllerRoutes.js"; // your API routes

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const inProd = process.env.NODE_ENV === "production";

// Trust proxy (important when behind proxies like Vercel/Render)
app.set("trust proxy", 1);

// --- Middlewares ---
app.use(express.json());
app.use(cookieParser());

// CORS: only enable open CORS during local development (adjust origins as needed)
if (!inProd) {
  app.use(
    cors({
      origin: ["http://localhost:5173"], // add other dev origins if needed
      credentials: true,
    })
  );
}

// mount API routes (all your backend endpoints behind /api)
app.use("/api", controllerRoutes);

// --- Serve frontend in production ---
if (inProd) {
  // Make sure you build your frontend into client/dist (or client/build)
  const __dirname = path.resolve();
  // prefer dist, fallback to build
  const frontendPath = path.join(__dirname, "../client", "dist"); // or "client/build" depending on your bundler

  app.use(express.static(frontendPath, { maxAge: "1d" }));

  // For any other route, serve index.html (SPA fallback)
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
} else {
  // dev short-circuit so you get a simple message when visiting the backend root
  app.get("/", (req, res) => {
    res.send("API server running (development mode).");
  });
}

// --- Error handler ---
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (production=${inProd})`);
});
