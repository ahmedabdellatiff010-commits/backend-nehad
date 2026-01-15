const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ===== Middleware =====
app.use(cors());
app.use(express.json());

// ===== Health Check (مهم جدًا) =====
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Pharmacy Admin API is running",
  });
});

// ===== Admin Dashboard =====
app.use("/admin", express.static(path.join(__dirname, "admin")));

// ===== API Example (اختياري) =====
app.get("/api", (req, res) => {
  res.json({ message: "API root works" });
});

// ===== 404 Handler =====
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ===== Server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});