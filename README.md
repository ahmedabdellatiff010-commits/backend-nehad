# Pharmacy Admin Control Panel

Complete admin dashboard and REST API for managing the online pharmacy.

## Features

- ✅ **Products Management** - Create, read, update, delete products with prices and discounts
- ✅ **Categories Management** - Manage product categories
- ✅ **Orders Management** - View and update order status
- ✅ **Pages Content** - Edit home, about, contact page content
- ✅ **Site Settings** - Configure store name, contact info, colors
- ✅ **Statistics Dashboard** - View sales, orders, products overview
- ✅ **REST APIs** - Full REST API for all entities
- ✅ **JSON Storage** - File-based data storage (no database required)
- ✅ **Real-time Updates** - Changes reflect immediately

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Storage**: JSON files
- **API**: REST

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

### 3. Access Admin Dashboard

Open your browser and go to:
```
http://localhost:3000/admin
```

## Project Structure

```
.
├── backend/
│   ├── package.json          # Dependencies
│   ├── index.js              # Main Express server
│   └── data/                 # JSON data files
│       ├── products.json
│       ├── categories.json
│       ├── orders.json
│       ├── pages.json
│       └── settings.json
└── admin/
    ├── index.html            # Admin dashboard HTML
    ├── app.js                # Dashboard logic
    └── styles.css            # Dashboard styles
```

## API Endpoints

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Orders
- `GET /api/orders` - List all orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order (change status)

### Pages
- `GET /api/pages` - List all pages
- `GET /api/pages/:slug` - Get page by slug
- `PUT /api/pages/:slug` - Update page content

### Settings
- `GET /api/settings` - Get site settings
- `PUT /api/settings` - Update site settings

### Statistics
- `GET /api/statistics` - Get site statistics

### Health
- `GET /api/health` - API health check

## Admin Dashboard Sections

### 📊 Dashboard
Overview of key metrics:
- Total products count
- Total orders count
- Total sales amount
- Pending orders count

### 📦 Products Management
- Add new products with prices, discounts, categories
- Edit existing products
- Delete products
- View all products in a table

### 🏷️ Categories Management
- Create new categories
- Edit category details
- Delete categories
- Organize products by category

### 📋 Orders Management
- View all customer orders
- Update order status (Pending → Processing → Completed → Cancelled)
- View order details
- Track order history

### 📄 Pages Content
- Edit home page content
- Edit about page content
- Edit contact page content
- WYSIWYG editor for content

### ⚙️ Site Settings
- Store name and contact info
- Email and phone number
- Store address and hours
- Currency settings
- Primary and secondary colors
- Logo configuration

## Data Format Examples

### Product
```json
{
  "id": "product-1",
  "name": "منتج",
  "price": 100,
  "discount": 20,
  "category": "الفئة",
  "description": "الوصف",
  "stock": 50,
  "createdAt": "2024-01-12T10:30:00Z",
  "updatedAt": "2024-01-12T10:30:00Z"
}
```

### Category
```json
{
  "id": "category-1",
  "name": "الفئة",
  "description": "وصف الفئة",
  "createdAt": "2024-01-12T10:30:00Z"
}
```

### Order
```json
{
  "id": "order-1",
  "customerName": "اسم الزبون",
  "customerEmail": "email@example.com",
  "items": [
    {
      "id": "product-1",
      "name": "المنتج",
      "qty": 2,
      "price": 100
    }
  ],
  "total": 200,
  "status": "pending",
  "createdAt": "2024-01-12T10:30:00Z",
  "updatedAt": "2024-01-12T10:30:00Z"
}
```

## Frontend Integration

The frontend website can fetch data from these APIs:

```javascript
// Get products
fetch('http://localhost:3000/api/products')
  .then(res => res.json())
  .then(products => console.log(products));

// Create order
fetch('http://localhost:3000/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderData)
});
```

## Security Notes

- No authentication implemented (development only)
- Add authentication before production
- Implement HTTPS for secure communication
- Validate all inputs on server side
- Add rate limiting for API endpoints
- Implement CORS properly for production

## Future Enhancements

- [ ] User authentication and authorization
- [ ] Product images upload
- [ ] Email notifications
- [ ] Advanced analytics and reporting
- [ ] Inventory management
- [ ] Customer management
- [ ] Payment gateway integration
- [ ] Backup and restore functionality
- [ ] Audit logs
- [ ] Multi-user support with roles

## License

MIT
