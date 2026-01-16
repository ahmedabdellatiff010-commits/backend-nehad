const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

// ===== Configuration =====
// If you deploy the frontend on Netlify, set FRONTEND_URL env var to that Netlify URL.
const FRONTEND_URL = process.env.FRONTEND_URL || null;
const PORT = process.env.PORT || 3000; // Railway provides PORT via env

// ===== Middleware =====
const corsOptions = FRONTEND_URL ? { origin: FRONTEND_URL } : { origin: true };
app.use(cors(corsOptions));
app.use(express.json());

// ===== Data files =====
const DATA_DIR = path.join(__dirname, "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    return [];
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    // Log, but don't crash the server in production
    console.error("Failed to write JSON to", filePath, err.message);
  }
}

// Load data into memory for quick reads
let products = readJson(PRODUCTS_FILE);
let orders = readJson(ORDERS_FILE);

// ===== Health Check =====
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Pharmacy Admin API is running" });
});

// ===== Serve admin dashboard static files =====
app.use("/admin", express.static(path.join(__dirname, "admin")));

// ===== API Root =====
app.get("/api", (req, res) => {
  res.json({ message: "API root works" });
});

// ===== Products =====
// GET /api/products - return full product list
app.get("/api/products", (req, res) => {
  res.json(products);
});

// GET /api/products/:id - return single product or 404
app.get("/api/products/:id", (req, res) => {
  const id = req.params.id;
  const product = products.find((p) => String(p.id) === String(id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// ===== Categories (derived from products) =====
// GET /api/categories - returns unique categories derived from products
app.get("/api/categories", (req, res) => {
  const map = new Map();
  products.forEach((p) => {
    const name = p.category || "Uncategorized";
    if (!map.has(name)) {
      const id = String(name)
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
        .replace(/(^-|-$)/g, "");
      map.set(name, { id, name, description: "", image: null });
    }
  });
  res.json(Array.from(map.values()));
});

// ===== Orders =====
// POST /api/orders - create a new order (persist to data/orders.json)
app.post("/api/orders", (req, res) => {
  const body = req.body;
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ error: "Invalid order payload" });
  }

  const id = `order-${Date.now()}`;
  const now = new Date().toISOString();
  const newOrder = Object.assign({
    id,
    status: "processing",
    createdAt: now,
    updatedAt: now,
    isViewed: false,
  }, body);

  // Add to in-memory list and persist
  orders.unshift(newOrder);
  writeJson(ORDERS_FILE, orders);

  res.status(201).json(newOrder);
});

// ===== Statistics (used by admin dashboard) =====
app.get('/api/statistics', (req, res) => {
  const totalProducts = products.length;
  const totalOrders = orders.length;
  const totalSales = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'processing').length;
  res.json({ totalProducts, totalOrders, totalSales, pendingOrders });
});

// ===== 404 for unknown API routes =====
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// ===== Fallback 404 =====
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});