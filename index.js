/**
 * Pharmacy Admin Control Panel - Main Server
 * Express.js API with JSON file storage
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const fs = require('fs');
const multer = require('multer');

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded files folder from project root /uploads
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));


// Serve images folder (hero, categories, etc.)
const IMAGES_DIR = path.join(__dirname, '..', 'image');
app.use('/image', express.static(IMAGES_DIR));


// Serve admin dashboard at /admin
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// Serve frontend website from root (/)
// Frontend files are in the parent directory (project root)
const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR));

// Multer setup for handling image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${name}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Ensure /admin opens index.html
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/index.html'));
});
// Data directory
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Helper: Read JSON file
function readJSON(filename) {
  try {
    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return null;
    }
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
    return null;
  }
}

// Helper: Write JSON file
function writeJSON(filename, data) {
  try {
    const filepath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filename}:`, err.message);
    return false;
  }
}

// ============= PRODUCTS API =============

app.get('/api/products', (req, res) => {
  const products = readJSON('products.json') || [];
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const products = readJSON('products.json') || [];
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

app.post('/api/products', (req, res) => {
  const products = readJSON('products.json') || [];
  const newProduct = {
    id: req.body.id || `product-${Date.now()}`,
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  const existingIndex = products.findIndex(p => p.id === newProduct.id);
  if (existingIndex >= 0) {
    return res.status(400).json({ error: 'Product ID already exists' });
  }
  
  products.push(newProduct);
  if (writeJSON('products.json', products)) {
    res.status(201).json(newProduct);
  } else {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', (req, res) => {
  const products = readJSON('products.json') || [];
  const index = products.findIndex(p => p.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  products[index] = { ...products[index], ...req.body, updatedAt: new Date().toISOString() };
  
  if (writeJSON('products.json', products)) {
    res.json(products[index]);
  } else {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', (req, res) => {
  const products = readJSON('products.json') || [];
  const index = products.findIndex(p => p.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  const deleted = products.splice(index, 1);
  
  if (writeJSON('products.json', products)) {
    res.json(deleted[0]);
  } else {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ============= CATEGORIES API =============

app.get('/api/categories', (req, res) => {
  const categories = readJSON('categories.json') || [];
  res.json(categories);
});

app.get('/api/categories/:id', (req, res) => {
  const categories = readJSON('categories.json') || [];
  const category = categories.find(c => c.id === req.params.id);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }
  res.json(category);
});

app.post('/api/categories', (req, res) => {
  const categories = readJSON('categories.json') || [];
  const newCategory = {
    id: req.body.id || `category-${Date.now()}`,
    name: req.body.name || '',
    description: req.body.description || '',
    image: req.body.image || null,
    createdAt: new Date().toISOString()
  };
  
  categories.push(newCategory);
  if (writeJSON('categories.json', categories)) {
    res.status(201).json(newCategory);
  } else {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/categories/:id', (req, res) => {
  const categories = readJSON('categories.json') || [];
  const index = categories.findIndex(c => c.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Category not found' });
  }
  
  const updated = {
    ...categories[index],
    name: req.body.name !== undefined ? req.body.name : categories[index].name,
    description: req.body.description !== undefined ? req.body.description : categories[index].description,
    image: req.body.image !== undefined ? req.body.image : categories[index].image
  };
  
  categories[index] = updated;
  
  if (writeJSON('categories.json', categories)) {
    res.json(categories[index]);
  } else {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  const categories = readJSON('categories.json') || [];
  const index = categories.findIndex(c => c.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Category not found' });
  }
  
  const deleted = categories.splice(index, 1);
  
  if (writeJSON('categories.json', categories)) {
    res.json(deleted[0]);
  } else {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ============= ORDERS API =============

app.get('/api/orders', (req, res) => {
  const orders = readJSON('orders.json') || [];
  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const orders = readJSON('orders.json') || [];
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

app.post('/api/orders', (req, res) => {
  const orders = readJSON('orders.json') || [];
  const newOrder = {
    id: req.body.id || `order-${Date.now()}`,
    status: 'pending',
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  orders.push(newOrder);
  if (writeJSON('orders.json', orders)) {
    res.status(201).json(newOrder);
  } else {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.put('/api/orders/:id', (req, res) => {
  const orders = readJSON('orders.json') || [];
  const index = orders.findIndex(o => o.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  orders[index] = { ...orders[index], ...req.body, updatedAt: new Date().toISOString() };
  
  if (writeJSON('orders.json', orders)) {
    res.json(orders[index]);
  } else {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// ============= PAGES API =============

app.get('/api/pages', (req, res) => {
  const pages = readJSON('pages.json') || [];
  res.json(pages);
});

app.get('/api/pages/:slug', (req, res) => {
  const pages = readJSON('pages.json') || [];
  const page = pages.find(p => p.slug === req.params.slug);
  if (!page) {
    return res.status(404).json({ error: 'Page not found' });
  }
  res.json(page);
});

app.post('/api/pages', (req, res) => {
  const pages = readJSON('pages.json') || [];
  const newPage = {
    slug: req.body.slug || `page-${Date.now()}`,
    title: req.body.title,
    content: req.body.content,
    image: req.body.image || null,
    createdAt: new Date().toISOString()
  };
  
  // Check if page with same slug already exists
  if (pages.find(p => p.slug === newPage.slug)) {
    return res.status(400).json({ error: 'Page with this slug already exists' });
  }
  
  pages.push(newPage);
  if (writeJSON('pages.json', pages)) {
    res.status(201).json(newPage);
  } else {
    res.status(500).json({ error: 'Failed to create page' });
  }
});

app.put('/api/pages/:slug', (req, res) => {
  const pages = readJSON('pages.json') || [];
  const index = pages.findIndex(p => p.slug === req.params.slug);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Page not found' });
  }
  
  pages[index] = { ...pages[index], ...req.body, updatedAt: new Date().toISOString() };
  
  if (writeJSON('pages.json', pages)) {
    res.json(pages[index]);
  } else {
    res.status(500).json({ error: 'Failed to update page' });
  }
});

app.delete('/api/pages/:slug', (req, res) => {
  const pages = readJSON('pages.json') || [];
  const index = pages.findIndex(p => p.slug === req.params.slug);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Page not found' });
  }
  
  const deleted = pages.splice(index, 1);
  
  if (writeJSON('pages.json', pages)) {
    res.json(deleted[0]);
  } else {
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

// ============= SETTINGS API =============

app.get('/api/settings', (req, res) => {
  const settings = readJSON('settings.json') || {
    storeName: 'صيدلية NEHAD ABDELRAMAN',
    storeEmail: 'info@pharmacy.com',
    storePhone: '+20 100 000 0000',
    storeAddress: 'Cairo, Egypt',
    storeHours: '9:00 AM - 10:00 PM',
    currency: 'جنيه',
    primaryColor: '#ff750c',
    secondaryColor: '#2C3E50'
  };
  res.json(settings);
});

app.put('/api/settings', (req, res) => {
  const settings = req.body;
  
  if (writeJSON('settings.json', settings)) {
    res.json(settings);
  } else {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============= STATISTICS API =============

app.get('/api/statistics', (req, res) => {
  const products = readJSON('products.json') || [];
  const orders = readJSON('orders.json') || [];
  
  const totalSales = orders.reduce((sum, order) => {
    return sum + (order.total || order.items?.reduce((s, i) => s + (i.price * i.qty), 0) || 0);
  }, 0);
  
  const stats = {
    totalProducts: products.length,
    totalOrders: orders.length,
    totalSales: Math.round(totalSales),
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    completedOrders: orders.filter(o => o.status === 'completed').length,
    averageOrderValue: orders.length > 0 ? Math.round(totalSales / orders.length) : 0,
    productsWithDiscount: products.filter(p => p.discount && p.discount > 0).length
  };
  
  res.json(stats);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Pharmacy Admin API is running' });
});

// ===== Image upload endpoint =====
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ filename: req.file.filename, url });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ============= REVIEWS API =============
// Stored in data/reviews.json as an array of { id, productId, rating, text, ts }
app.get('/api/reviews', (req, res) => {
  const reviews = readJSON('reviews.json') || [];
  const product = req.query.product;
  if (product) {
    return res.json(reviews.filter(r => r.productId === product));
  }
  res.json(reviews);
});

app.post('/api/reviews', (req, res) => {
  try {
    const reviews = readJSON('reviews.json') || [];
    const newReview = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      productId: req.body.productId || req.body.id || null,
      rating: Number(req.body.rating) || 0,
      text: req.body.text || '',
      ts: req.body.ts || Date.now()
    };

    if (!newReview.productId) return res.status(400).json({ error: 'Product ID required' });

    reviews.unshift(newReview);
    if (writeJSON('reviews.json', reviews)) {
      return res.status(201).json(newReview);
    }
    return res.status(500).json({ error: 'Failed to save review' });
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/reviews/:id', (req, res) => {
  try {
    const reviews = readJSON('reviews.json') || [];
    const idx = reviews.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Review not found' });
    const deleted = reviews.splice(idx, 1)[0];
    if (writeJSON('reviews.json', reviews)) {
      return res.json(deleted);
    }
    return res.status(500).json({ error: 'Failed to delete review' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SPA fallback: serve index.html for unknown frontend routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═════════════════════════════════════════════════════╗
║   Pharmacy Website + Admin Control Panel - Running  ║
║   Website: http://192.168.1.7:${PORT}                   ║
║   API Server: http://192.168.1.7:${PORT}/api           ║
║   Admin Dashboard: http://192.168.1.7:${PORT}/admin    ║
║   Uploads: http://192.168.1.7:${PORT}/uploads          ║
╚═════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
