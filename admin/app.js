/**
 * Admin Dashboard - Main Application
 * Controls all admin functionality and API interactions
 */

const API_BASE = 'http://localhost:3000/api';

// Small HTML escape helper for admin (avoid dependency on AppUtils)
function escapeHtml(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============= APP STATE =============

const app = {
  currentSection: 'dashboard',
  currentEditId: null,
  editMode: 'create',
  currentImage: null,
  newOrdersCount: 0,
  lastOrderCheck: null,

  // Show toast notification
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.style.cssText = `
      background:${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
      color:white;
      padding:12px 16px;
      border-radius:6px;
      margin-bottom:8px;
      animation:slideIn 0.3s ease;
      max-width:400px;
      word-wrap:break-word;
    `;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },
  
  // Initialize app
  async init() {
    this.attachEventListeners();
    this.showSection('dashboard');
    await this.loadDashboard();
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
    // Poll for new orders every 5 seconds
    this.checkForNewOrders();
    setInterval(() => this.checkForNewOrders(), 5000);
  },

  // Attach event listeners
  attachEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.target.dataset.section;
        this.switchSection(section);
      });
    });

    // Product buttons
    document.getElementById('btn-add-product')?.addEventListener('click', () => this.openProductModal());
    // Offers buttons
    document.getElementById('btn-add-offer')?.addEventListener('click', () => this.openOfferModal());
    document.getElementById('btn-add-category')?.addEventListener('click', () => this.openCategoryModal());

    // Page buttons
    document.getElementById('btn-add-page')?.addEventListener('click', () => this.openPageModal());

    // Modal
    document.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('btn-cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-form').addEventListener('submit', (e) => this.handleFormSubmit(e));

    // Settings form
    document.getElementById('settings-form')?.addEventListener('submit', (e) => this.handleSettingsSubmit(e));
  },

  // Switch sections
  switchSection(sectionName) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(sectionName).classList.add('active');
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    
    this.currentSection = sectionName;
    
    // Load section data
    if (sectionName === 'products') this.loadProducts();
    if (sectionName === 'offers') this.loadOffers();
    if (sectionName === 'categories') this.loadCategories();
    if (sectionName === 'orders') this.loadOrders();
    if (sectionName === 'pages') this.loadPages();
    if (sectionName === 'settings') this.loadSettings();
    if (sectionName === 'ratings') this.loadRatings();
  },

  showSection(sectionName) {
    this.switchSection(sectionName);
  },

  // ============= DASHBOARD =============

  async loadDashboard() {
    try {
      const response = await fetch(`${API_BASE}/statistics`);
      const stats = await response.json();
      
      document.getElementById('stat-products').textContent = stats.totalProducts;
      document.getElementById('stat-orders').textContent = stats.totalOrders;
      document.getElementById('stat-sales').textContent = stats.totalSales;
      document.getElementById('stat-pending').textContent = stats.pendingOrders;
    } catch (err) {
      console.error('Error loading statistics:', err);
    }
  },

  // ============= PRODUCTS =============

  async loadProducts() {
    try {
      const response = await fetch(`${API_BASE}/products`);
      const products = await response.json();
      
      const tbody = document.getElementById('products-tbody');
      tbody.innerHTML = products.map(p => `
        <tr>
          <td>${p.id}</td>
          <td>${p.name}</td>
          <td>${p.price} جنيه</td>
          <td>${p.discount || 0}%</td>
          <td>${p.category || '-'}</td>
          <td>
            <button class="btn btn-small" onclick="app.editProduct('${p.id}')">تعديل</button>
            <button class="btn btn-danger btn-small" onclick="app.deleteProduct('${p.id}')">حذف</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      this.showToast('خطأ في تحميل المنتجات', 'error');
      console.error(err);
    }
  },

  async openProductModal(productId = null) {
    this.editMode = productId ? 'edit' : 'create';
    this.currentEditId = productId;
    this.currentImage = null; // Reset on modal open
    
    const formFields = document.getElementById('form-fields');
    const modalTitle = document.getElementById('modal-title');
    
    modalTitle.textContent = productId ? 'تعديل المنتج' : 'إضافة منتج جديد';
    
    formFields.innerHTML = `
      <div class="form-group">
        <label>معرف المنتج</label>
        <input type="text" id="field-id" placeholder="product-123" ${productId ? 'disabled' : ''}>
      </div>
      <div class="form-group">
        <label>الاسم *</label>
        <input type="text" id="field-name" placeholder="اسم المنتج" required>
      </div>
      <div class="form-group">
        <label>السعر *</label>
        <input type="number" id="field-price" placeholder="السعر" required>
      </div>
      <div class="form-group">
        <label>نسبة الخصم (%)</label>
        <input type="number" id="field-discount" placeholder="0" min="0" max="100">
      </div>
      <div class="form-group">
        <label>الفئة</label>
        <select id="field-category">
          <option value="">جارٍ التحميل...</option>
        </select>
        <input type="text" id="field-category-custom" placeholder="أدخل فئة جديدة" style="display:none;margin-top:8px">
      </div>
      <div class="form-group">
        <label>الوصف</label>
        <textarea id="field-description" placeholder="وصف المنتج"></textarea>
      </div>
      <div class="form-group">
        <label>الكمية</label>
        <input type="number" id="field-stock" placeholder="0">
      </div>
      <div class="form-group">
        <label>صورة المنتج</label>
        <input type="file" id="field-image" accept="image/*">
        <div id="image-preview" style="margin-top:8px;"><img id="image-preview-img" src="" alt="" style="max-width:140px;display:none;border-radius:8px;border:1px solid rgba(0,0,0,0.06)"></div>
      </div>
    `;

    // Populate category select from API, then load product if editing
    try {
      const resp = await fetch(`${API_BASE}/categories`);
      if (resp.ok) {
        const cats = await resp.json();
        const sel = document.getElementById('field-category');
        if (sel) {
          const options = ['<option value="">اختر فئة</option>']
            .concat((cats || []).map(c => `<option value="${escapeHtml(c.name || '')}">${escapeHtml(c.name || '')}</option>`))
            .concat(['<option value="__other__">أخرى</option>']);
          sel.innerHTML = options.join('');

          const custom = document.getElementById('field-category-custom');
          sel.addEventListener('change', (e) => {
            if (custom) {
              if (e.target.value === '__other__') {
                custom.style.display = 'block';
                custom.focus();
              } else {
                custom.style.display = 'none';
                custom.value = '';
              }
            }
          });
        }
      } else {
        const sel = document.getElementById('field-category');
        if (sel) sel.innerHTML = '<option value="">اختر فئة</option><option value="__other__">أخرى</option>';
      }
    } catch (err) {
      console.error('Error loading categories for product modal:', err);
    }

    if (productId) {
      this.loadProductForEdit(productId);
    }

    document.getElementById('modal').classList.add('active');
    // attach image input preview handler
    const imgInput = document.getElementById('field-image');
    if (imgInput) {
      imgInput.addEventListener('change', (e) => {
        const f = e.target.files[0];
        const imgEl = document.getElementById('image-preview-img');
        if (f && imgEl) {
          imgEl.src = URL.createObjectURL(f);
          imgEl.style.display = 'block';
        } else if (imgEl) {
          if (this.currentImage) {
            imgEl.src = this.currentImage;
            imgEl.style.display = 'block';
          } else {
            imgEl.style.display = 'none';
          }
        }
      });
    }
  },

  async loadProductForEdit(productId) {
    try {
      // Validate productId
      if (!productId || productId.trim() === '') {
        this.showToast('معرف المنتج غير صحيح', 'error');
        console.warn('Invalid product ID:', productId);
        return;
      }
      
      console.log('Loading product:', productId);
      const response = await fetch(`${API_BASE}/products/${productId}`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`خطأ ${response.status}: فشل تحميل المنتج`);
      }
      
      const product = await response.json();
      console.log('Product loaded:', product);
      
      // Validate product data
      if (!product || typeof product !== 'object') {
        throw new Error('بيانات المنتج غير صحيحة');
      }
      
      // Populate form fields with safe access
      const idField = document.getElementById('field-id');
      const nameField = document.getElementById('field-name');
      const priceField = document.getElementById('field-price');
      const discountField = document.getElementById('field-discount');
      const categoryField = document.getElementById('field-category');
      const descriptionField = document.getElementById('field-description');
      const stockField = document.getElementById('field-stock');
      
      console.log('Setting form values...');
      if (idField) idField.value = String(product.id || '');
      if (nameField) nameField.value = String(product.name || '');
      if (priceField) priceField.value = String(product.price || '');
      if (discountField) discountField.value = String(product.discount || 0);
      if (categoryField) {
        // If select exists, try to set option; otherwise set input value
        if (categoryField.tagName === 'SELECT') {
          const desired = String(product.category || '');
          const found = Array.from(categoryField.options).some(o => o.value === desired);
          if (found) {
            categoryField.value = desired;
            const customEl = document.getElementById('field-category-custom');
            if (customEl) { customEl.style.display = 'none'; customEl.value = ''; }
          } else if (desired) {
            // Use 'other' and populate custom input
            categoryField.value = '__other__';
            const customEl = document.getElementById('field-category-custom');
            if (customEl) { customEl.style.display = 'block'; customEl.value = desired; }
          } else {
            categoryField.value = '';
          }
        } else {
          categoryField.value = String(product.category || '');
        }
      }
      if (descriptionField) descriptionField.value = String(product.description || '');
      if (stockField) stockField.value = String(product.stock || 0);
      console.log('Form values set successfully');
      
      // set existing image preview
      this.currentImage = product.image || null;
      if (this.currentImage) {
        const imgEl = document.getElementById('image-preview-img');
        if (imgEl) {
          imgEl.src = this.currentImage;
          imgEl.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('Load product error:', err);
      this.showToast('خطأ في تحميل بيانات المنتج: ' + err.message, 'error');
    }
  },

  async editProduct(productId) {
    this.openProductModal(productId);
  },

  async deleteProduct(productId) {
    this.showDeleteConfirmation(productId, 'product', async () => {
      try {
        const response = await fetch(`${API_BASE}/products/${productId}`, { method: 'DELETE' });
        if (response.ok) {
          this.showToast('تم حذف المنتج بنجاح', 'success');
          this.loadProducts();
          this.loadDashboard();
        } else {
          const error = await response.json();
          this.showToast(error.error || 'خطأ في حذف المنتج', 'error');
        }
      } catch (err) {
        this.showToast('خطأ في حذف المنتج', 'error');
      }
    });
  },

  // ============= CATEGORIES =============

  async loadCategories() {
    try {
      const response = await fetch(`${API_BASE}/categories`);
      if (!response.ok) throw new Error('فشل تحميل الفئات');
      const categories = await response.json();

      const tbody = document.getElementById('categories-tbody');
      if (!tbody) return;

      tbody.innerHTML = (categories || []).map(c => `
        <tr>
          <td>
            ${c.image ? `<img src="${escapeHtml(c.image)}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:4px">` : '—'}
          </td>
          <td>${escapeHtml(c.id || '')}</td>
          <td>${escapeHtml(c.name || '')}</td>
          <td>${escapeHtml(c.description || '-')}</td>
          <td>
            <button class="btn btn-small" onclick="app.editCategory('${escapeHtml(c.id || '')}')">تعديل</button>
            <button class="btn btn-danger btn-small" onclick="app.deleteCategory('${escapeHtml(c.id || '')}')">حذف</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Load categories error:', err);
      this.showToast('خطأ في تحميل الفئات: ' + err.message, 'error');
    }
  },

  openCategoryModal(categoryId = null) {
    this.editMode = categoryId ? 'edit' : 'create';
    this.currentEditId = categoryId;
    this.currentImage = null; // Reset on modal open
    
    const formFields = document.getElementById('form-fields');
    const modalTitle = document.getElementById('modal-title');
    
    modalTitle.textContent = categoryId ? 'تعديل الفئة' : 'إضافة فئة جديدة';
    
    formFields.innerHTML = `
      <div class="form-group">
        <label>معرف الفئة</label>
        <input type="text" id="field-id" placeholder="category-123" ${categoryId ? 'disabled' : ''}>
      </div>
      <div class="form-group">
        <label>الاسم *</label>
        <input type="text" id="field-name" placeholder="اسم الفئة" required>
      </div>
      <div class="form-group">
        <label>الوصف</label>
        <textarea id="field-description" placeholder="وصف الفئة"></textarea>
      </div>
      <div class="form-group">
        <label>صورة الفئة</label>
        <input type="file" id="field-category-image" accept="image/*">
        <div id="image-preview" style="margin-top:8px;"><img id="image-preview-img" src="" alt="" style="max-width:140px;display:none;border-radius:8px;border:1px solid rgba(0,0,0,0.06)"></div>
      </div>
    `;

    // Attach image input preview handler
    const imgInput = document.getElementById('field-category-image');
    if (imgInput) {
      imgInput.addEventListener('change', (e) => {
        const f = e.target.files[0];
        const imgEl = document.getElementById('image-preview-img');
        if (f && imgEl) {
          imgEl.src = URL.createObjectURL(f);
          imgEl.style.display = 'block';
        } else if (imgEl) {
          if (this.currentImage) {
            imgEl.src = this.currentImage;
            imgEl.style.display = 'block';
          } else {
            imgEl.style.display = 'none';
          }
        }
      });
    }

    if (categoryId) {
      this.loadCategoryForEdit(categoryId);
    }

    document.getElementById('modal').classList.add('active');
  },

  async loadCategoryForEdit(categoryId) {
    try {
      if (!categoryId || categoryId.trim() === '') {
        this.showToast('معرف الفئة غير صحيح', 'error');
        return;
      }

      const response = await fetch(`${API_BASE}/categories/${categoryId}`);
      if (!response.ok) throw new Error(`فشل تحميل الفئة (${response.status})`);
      const category = await response.json();

      const idField = document.getElementById('field-id');
      const nameField = document.getElementById('field-name');
      const descField = document.getElementById('field-description');

      if (idField) idField.value = category.id || '';
      if (nameField) nameField.value = category.name || '';
      if (descField) descField.value = category.description || '';

      // Set existing image preview
      this.currentImage = category.image || null;
      if (this.currentImage) {
        const imgEl = document.getElementById('image-preview-img');
        if (imgEl) {
          imgEl.src = this.currentImage;
          imgEl.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('Load category error:', err);
      this.showToast('خطأ في تحميل بيانات الفئة: ' + err.message, 'error');
    }
  },

  async editCategory(categoryId) {
    this.openCategoryModal(categoryId);
  },

  async deleteCategory(categoryId) {
    this.showDeleteConfirmation(categoryId, 'category', async () => {
      try {
        const response = await fetch(`${API_BASE}/categories/${categoryId}`, { method: 'DELETE' });
        if (response.ok) {
          this.showToast('تم حذف الفئة بنجاح', 'success');
          this.loadCategories();
        } else {
          const error = await response.json();
          this.showToast(error.error || 'خطأ في حذف الفئة', 'error');
        }
      } catch (err) {
        this.showToast('خطأ في حذف الفئة', 'error');
      }
    });
  },

  // ============= ORDERS =============

  async loadOrders() {
    try {
      const response = await fetch(`${API_BASE}/orders`);
      let orders = await response.json();
      
      // Sort by newest first (descending createdAt)
      orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      const tbody = document.getElementById('orders-tbody');
      tbody.innerHTML = orders.map(o => `
        <tr class="order-row ${!o.isViewed ? 'order-new' : ''}" data-order-id="${o.id}">
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              ${!o.isViewed ? '<span class="new-badge" title="طلب جديد">NEW</span>' : ''}
              ${o.id}
            </div>
          </td>
          <td>${o.customerName || 'غير محدد'}</td>
          <td>${o.total || 0} جنيه</td>
          <td>
            <select onchange="app.updateOrderStatus('${o.id}', this.value)" class="status-select">
              <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>معلق</option>
              <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>قيد المعالجة</option>
              <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>مكتمل</option>
              <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>ملغى</option>
            </select>
          </td>
          <td>${new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
          <td>
            <button class="btn btn-small" onclick="app.viewOrder('${o.id}')">عرض</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      this.showToast('خطأ في تحميل الطلبات', 'error');
    }
  },

  async updateOrderStatus(orderId, status) {
    try {
      const response = await fetch(`${API_BASE}/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, isViewed: true })
      });
      
      if (response.ok) {
        this.showToast('تم تحديث حالة الطلب', 'success');
        this.loadOrders();
        this.loadDashboard();
      }
    } catch (err) {
      this.showToast('خطأ في تحديث الطلب', 'error');
    }
  },

  async viewOrder(orderId) {
    const errorEl = document.getElementById('order-modal-error');
    const detailsEl = document.getElementById('order-details');
    errorEl.style.display = 'none';
    detailsEl.innerHTML = '<p style="text-align:center">جاري التحميل...</p>';
    
    try {
      const response = await fetch(`${API_BASE}/orders/${orderId}`);
      if (!response.ok) throw new Error('فشل تحميل الطلب');
      
      const order = await response.json();
      
      // Mark as viewed if not already viewed
      if (!order.isViewed) {
        await fetch(`${API_BASE}/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isViewed: true })
        });
        // Remove new badge from table
        const orderRow = document.querySelector(`[data-order-id="${orderId}"]`);
        if (orderRow) {
          orderRow.classList.remove('order-new');
          const badge = orderRow.querySelector('.new-badge');
          if (badge) badge.remove();
        }
        this.loadOrders();
      }
      const statusMap = { pending: 'معلق', processing: 'قيد المعالجة', completed: 'مكتمل', cancelled: 'ملغى' };
      const productsHtml = Array.isArray(order.items) ? order.items.map(item => `
        <div style="padding:8px 0;border-bottom:1px solid #eee">
          <strong>${item.name}</strong> × ${item.qty} = ${item.price * item.qty} جنيه
        </div>
      `).join('') : '<p style="color:#999">لا توجد منتجات</p>';
      
      const html = `
        <div style="padding:12px;background:#f5f5f5;border-radius:6px">
          <p><strong>معرف الطلب:</strong> ${order.id}</p>
          <p><strong>اسم الزبون:</strong> ${order.customerName || '-'}</p>
          <p><strong>رقم الهاتف:</strong> ${order.customerPhone || '-'}</p>
          <p><strong>العنوان:</strong> ${order.customerAddress || '-'}</p>
          <p><strong>التاريخ والوقت:</strong> ${new Date(order.createdAt).toLocaleString('ar-EG')}</p>
          <p><strong>الحالة:</strong> ${statusMap[order.status] || order.status}</p>
        </div>
        <h3 style="margin-top:16px">المنتجات:</h3>
        <div style="padding:8px 0">${productsHtml}</div>
        <div style="padding:12px;background:#f5f5f5;border-radius:6px;margin-top:12px">
          <p style="font-size:18px;font-weight:bold"><strong>الإجمالي:</strong> ${order.total || 0} جنيه</p>
        </div>
      `;
      
      detailsEl.innerHTML = html;
      document.getElementById('order-modal').classList.add('active');
    } catch (err) {
      errorEl.textContent = 'خطأ في تحميل الطلب: ' + err.message;
      errorEl.style.display = 'block';
      console.error(err);
    }
  },

  closeOrderModal() {
    document.getElementById('order-modal').classList.remove('active');
    document.getElementById('order-details').innerHTML = '';
    document.getElementById('order-modal-error').style.display = 'none';
  },

  // ============= PAGES =============

  async loadPages() {
    try {
      console.log('Loading pages...');
      const response = await fetch(`${API_BASE}/pages`);
      console.log('Pages API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`فشل تحميل الصفحات - HTTP ${response.status}`);
      }
      
      const pages = await response.json();
      console.log('Pages data received:', pages);
      
      const container = document.getElementById('pages-list');
      if (!container) {
        console.error('pages-list container not found');
        this.showToast('خطأ: لم يتم العثور على عنصر الصفحات', 'error');
        return;
      }
      
      if (!Array.isArray(pages) || pages.length === 0) {
        console.log('No pages found');
        container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted)">لا توجد صفحات حالياً. <button class="btn btn-primary" style="margin-top:10px" onclick="app.openPageModal()">إضافة الأولى</button></div>';
        return;
      }
      
      console.log('Rendering', pages.length, 'pages');
      container.innerHTML = pages.map(p => `
        <div class="page-card">
          ${p.image ? `<img src="${escapeHtml(p.image)}" alt="">` : ''}
          <h3>${escapeHtml(p.title || p.slug || '')}</h3>
          <p class="page-slug">معرف الصفحة: <code>${escapeHtml(p.slug || '')}</code></p>
          <p class="page-desc">${escapeHtml((p.content || '').substring(0, 100))}...</p>
          <div class="page-actions">
            <button class="btn btn-small" onclick="app.editPage('${escapeHtml(p.slug || '')}')">تعديل</button>
            <button class="btn btn-danger btn-small" onclick="app.deletePage('${escapeHtml(p.slug || '')}')">حذف</button>
          </div>
        </div>
      `).join('');
      
      console.log('Pages rendered successfully');
    } catch (err) {
      console.error('Load pages error:', err);
      this.showToast('خطأ في تحميل الصفحات: ' + err.message, 'error');
      
      const container = document.getElementById('pages-list');
      if (container) {
        container.innerHTML = `<div style="padding:20px;text-align:center;color:red">خطأ: ${escapeHtml(err.message)}</div>`;
      }
    }
  },

  // ============= OFFERS =============

  async loadOffers() {
    try {
      const response = await fetch(`${API_BASE}/products`);
      if (!response.ok) throw new Error('فشل تحميل المنتجات');
      const products = await response.json();

      // Offers are products with discount > 0
      const offers = (products || []).filter(p => p.discount && p.discount > 0);

      const tbody = document.getElementById('offers-tbody');
      if (!tbody) return;

      tbody.innerHTML = offers.map(p => {
        const price = p.price || 0;
        const discount = p.discount || 0;
        const finalPrice = discount > 0 ? Math.round(price * (1 - discount / 100)) : price;
        return `
          <tr>
            <td>${escapeHtml(p.id)}</td>
            <td>${escapeHtml(p.name)}</td>
            <td>${price} جنيه</td>
            <td>${discount}%</td>
            <td>${finalPrice} جنيه</td>
            <td>
              <button class="btn btn-small" onclick="app.editOffer('${escapeHtml(p.id)}')">تعديل</button>
              <button class="btn btn-danger btn-small" onclick="app.deleteOffer('${escapeHtml(p.id)}')">حذف</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Load offers error:', err);
      this.showToast('خطأ في تحميل العروض', 'error');
    }
  },

  openOfferModal(productId = null) {
    this.editMode = productId ? 'edit' : 'create';
    this.currentEditId = productId;
    this.currentImage = null;

    const formFields = document.getElementById('form-fields');
    const modalTitle = document.getElementById('modal-title');
    modalTitle.textContent = productId ? 'تعديل العرض' : 'إضافة عرض جديد';

    // Build a form that allows selecting a product and setting discount
    formFields.innerHTML = `
      <div class="form-group">
        <label>اختر المنتج *</label>
        <select id="field-offer-product" required>
          <option value="">جارٍ التحميل...</option>
        </select>
      </div>
      <div class="form-group">
        <label>نسبة الخصم (%)</label>
        <input type="number" id="field-offer-discount" placeholder="مثال: 20" min="0" max="100" required>
      </div>
      <div class="form-group">
        <label>ملاحظات العرض (اختياري)</label>
        <textarea id="field-offer-notes" placeholder="ملاحظات داخلية"></textarea>
      </div>
      <div class="form-group">
        <label>بداية العرض (تاريخ ووقت)</label>
        <input type="datetime-local" id="field-offer-start">
      </div>
      <div class="form-group">
        <label>انتهاء العرض (تاريخ ووقت)</label>
        <input type="datetime-local" id="field-offer-end">
      </div>
    `;

    // Load products into select
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/products`);
        if (!resp.ok) throw new Error('فشل تحميل المنتجات');
        const products = await resp.json();
        const sel = document.getElementById('field-offer-product');
        if (!sel) return;
        const options = ['<option value="">اختر منتجاً</option>']
          .concat((products || []).map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} (${escapeHtml(String(p.id))})</option>`));
        sel.innerHTML = options.join('');

        if (productId) {
          sel.value = productId;
          // Pre-fill discount and dates when editing
          try {
            const resp2 = await fetch(`${API_BASE}/products/${productId}`);
            if (resp2.ok) {
              const prod = await resp2.json();
              const disc = document.getElementById('field-offer-discount');
              const start = document.getElementById('field-offer-start');
              const end = document.getElementById('field-offer-end');
              if (disc) disc.value = prod.discount || 0;
              if (start && prod.offerStart) start.value = (new Date(prod.offerStart)).toISOString().slice(0,16);
              if (end && prod.offerEnd) end.value = (new Date(prod.offerEnd)).toISOString().slice(0,16);
            }
          } catch (e) { /* ignore preload errors */ }
        }
      } catch (err) {
        console.error('Error loading products for offer modal:', err);
      }
    })();

    document.getElementById('modal').classList.add('active');
  },

  async editOffer(productId) {
    // Open product modal for editing; admin should edit discount
    this.openProductModal(productId);
  },

  async deleteOffer(productId) {
    // To remove an offer, set discount to 0 (do not delete product)
    this.showDeleteConfirmation(productId, 'offer', async () => {
      try {
        const response = await fetch(`${API_BASE}/products/${productId}`);
        if (!response.ok) throw new Error('منتج غير موجود');
        const product = await response.json();
        product.discount = 0;
        product.isOffer = false;
        delete product.offerStart;
        delete product.offerEnd;
        const upd = await fetch(`${API_BASE}/products/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product)
        });
        if (upd.ok) {
          this.showToast('تم إزالة العرض', 'success');
          this.loadOffers();
          this.loadProducts();
        } else {
          const err = await upd.json();
          this.showToast(err.error || 'فشل إزالة العرض', 'error');
        }
      } catch (err) {
        console.error('Delete offer error:', err);
        this.showToast('خطأ في إزالة العرض', 'error');
      }
    });
  },

  openPageModal(slug = null) {
    this.editMode = slug ? 'edit' : 'create';
    this.currentEditId = slug;
    this.currentImage = null; // Reset on modal open
    
    const formFields = document.getElementById('form-fields');
    const modalTitle = document.getElementById('modal-title');
    
    modalTitle.textContent = slug ? 'تعديل القسم' : 'إضافة قسم جديد';
    
    formFields.innerHTML = `
      <div class="form-group">
        <label>معرف القسم (URL) *</label>
        <input type="text" id="field-slug" placeholder="about-us" ${slug ? 'disabled' : ''} required>
      </div>
      <div class="form-group">
        <label>عنوان القسم *</label>
        <input type="text" id="field-title" placeholder="عنوان القسم" required>
      </div>
      <div class="form-group">
        <label>محتوى القسم *</label>
        <textarea id="field-content" placeholder="محتوى القسم" style="height:300px" required></textarea>
      </div>
      <div class="form-group">
        <label>صورة القسم</label>
        <input type="file" id="field-page-image" accept="image/*">
        <div id="image-preview" style="margin-top:8px;"><img id="image-preview-img" src="" alt="" style="max-width:140px;display:none;border-radius:8px;border:1px solid rgba(0,0,0,0.06)"></div>
      </div>
    `;

    // Attach image input preview handler
    const imgInput = document.getElementById('field-page-image');
    if (imgInput) {
      imgInput.addEventListener('change', (e) => {
        const f = e.target.files[0];
        const imgEl = document.getElementById('image-preview-img');
        if (f && imgEl) {
          imgEl.src = URL.createObjectURL(f);
          imgEl.style.display = 'block';
        } else if (imgEl) {
          if (this.currentImage) {
            imgEl.src = this.currentImage;
            imgEl.style.display = 'block';
          } else {
            imgEl.style.display = 'none';
          }
        }
      });
    }

    if (slug) {
      this.loadPageForEdit(slug);
    }

    document.getElementById('modal').classList.add('active');
  },

  async loadPageForEdit(slug) {
    try {
      if (!slug || slug.trim() === '') {
        this.showToast('معرف القسم غير صحيح', 'error');
        return;
      }

      const response = await fetch(`${API_BASE}/pages/${slug}`);
      if (!response.ok) throw new Error(`فشل تحميل القسم (${response.status})`);
      const page = await response.json();

      const slugField = document.getElementById('field-slug');
      const titleField = document.getElementById('field-title');
      const contentField = document.getElementById('field-content');

      if (slugField) slugField.value = page.slug || '';
      if (titleField) titleField.value = page.title || '';
      if (contentField) contentField.value = page.content || '';

      // Set existing image preview
      this.currentImage = page.image || null;
      if (this.currentImage) {
        const imgEl = document.getElementById('image-preview-img');
        if (imgEl) {
          imgEl.src = this.currentImage;
          imgEl.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('Load page error:', err);
      this.showToast('خطأ في تحميل بيانات القسم: ' + err.message, 'error');
    }
  },

  async deletePage(slug) {
    this.showDeleteConfirmation(slug, 'page', async () => {
      try {
        const response = await fetch(`${API_BASE}/pages/${slug}`, { method: 'DELETE' });
        if (response.ok) {
          this.showToast('تم حذف القسم بنجاح', 'success');
          this.loadPages();
        } else {
          const error = await response.json();
          this.showToast(error.error || 'خطأ في حذف القسم', 'error');
        }
      } catch (err) {
        this.showToast('خطأ في حذف القسم', 'error');
      }
    });
  },

  async editPage(slug) {
    this.openPageModal(slug);
  },

  // ============= SETTINGS =============

  async loadSettings() {
    try {
      const response = await fetch(`${API_BASE}/settings`);
      const settings = await response.json();
      
      document.getElementById('setting-store-name').value = settings.storeName || '';
      document.getElementById('setting-email').value = settings.storeEmail || '';
      document.getElementById('setting-phone').value = settings.storePhone || '';
      document.getElementById('setting-address').value = settings.storeAddress || '';
      document.getElementById('setting-hours').value = settings.storeHours || '';
      document.getElementById('setting-currency').value = settings.currency || '';
      document.getElementById('setting-primary-color').value = settings.primaryColor || '#ff750c';
      document.getElementById('setting-secondary-color').value = settings.secondaryColor || '#2C3E50';
    } catch (err) {
      this.showToast('خطأ في تحميل الإعدادات', 'error');
    }
  },

  async handleSettingsSubmit(e) {
    e.preventDefault();
    
    const settings = {
      storeName: document.getElementById('setting-store-name').value,
      storeEmail: document.getElementById('setting-email').value,
      storePhone: document.getElementById('setting-phone').value,
      storeAddress: document.getElementById('setting-address').value,
      storeHours: document.getElementById('setting-hours').value,
      currency: document.getElementById('setting-currency').value,
      primaryColor: document.getElementById('setting-primary-color').value,
      secondaryColor: document.getElementById('setting-secondary-color').value
    };
    
    try {
      const response = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        this.showToast('تم حفظ الإعدادات بنجاح', 'success');
      }
    } catch (err) {
      this.showToast('خطأ في حفظ الإعدادات', 'error');
    }
  },

  // ============= MODAL HANDLING =============

  closeModal() {
    document.getElementById('modal').classList.remove('active');
    document.getElementById('form-fields').innerHTML = '';
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    
    // Detect which form we're submitting
    const isOffer = !!document.getElementById('field-offer-product');
    const isProduct = !!document.getElementById('field-price');
    const isPage = !!document.getElementById('field-slug');

    // ===== OFFERS =====
    if (isOffer) {
      const productId = document.getElementById('field-offer-product')?.value;
      const discountVal = document.getElementById('field-offer-discount')?.value;
      const offerStartVal = document.getElementById('field-offer-start')?.value;
      const offerEndVal = document.getElementById('field-offer-end')?.value;

      if (!productId) {
        this.showToast('يرجى اختيار منتج', 'error');
        return;
      }

      const discount = Number(discountVal);
      if (Number.isNaN(discount) || discount < 0 || discount > 100) {
        this.showToast('نسبة الخصم يجب أن تكون بين 0 و 100', 'error');
        return;
      }

      try {
        // Get the product, update discount field only
        const resp = await fetch(`${API_BASE}/products/${productId}`);
        if (!resp.ok) throw new Error('فشل تحميل المنتج');
        const product = await resp.json();
        product.discount = discount;
        product.isOffer = true;
        if (offerStartVal) product.offerStart = new Date(offerStartVal).toISOString();
        if (offerEndVal) product.offerEnd = new Date(offerEndVal).toISOString();

        const upd = await fetch(`${API_BASE}/products/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product)
        });

        if (upd.ok) {
          this.showToast('تم إضافة/تحديث العرض بنجاح', 'success');
          this.closeModal();
          this.loadOffers();
          this.loadProducts();
          this.loadDashboard();
        } else {
          const err = await upd.json();
          this.showToast(err.error || 'فشل حفظ العرض', 'error');
        }
      } catch (err) {
        console.error('Offer save error:', err);
        this.showToast('خطأ في حفظ العرض', 'error');
      }

      return;
    }
    
    let data = {};
    let endpoint = 'products';
    let urlId = this.currentEditId;

    // ===== PRODUCTS =====
    if (isProduct) {
      // Ensure discount field exists in products form (if not present, add it)
      const discField = document.getElementById('field-discount');
      if (!discField) {
        // Load modal fields again to include discount
      }
      const formId = document.getElementById('field-id')?.value || this.currentEditId;
      
      data = {
        name: document.getElementById('field-name')?.value,
        description: document.getElementById('field-description')?.value,
      };
      
      if (!this.currentEditId) {
        data.id = formId;
      }

      const priceVal = document.getElementById('field-price')?.value;
      const discountVal = document.getElementById('field-discount')?.value;
      const stockVal = document.getElementById('field-stock')?.value;
      
      if (!priceVal || priceVal === '') {
        this.showToast('السعر مطلوب', 'error');
        return;
      }
      
      data.price = parseFloat(priceVal);
      data.discount = parseFloat(discountVal) || 0;
      // Read category from select or custom input if provided
      const sel = document.getElementById('field-category');
      const custom = document.getElementById('field-category-custom');
      let categoryVal = '';
      if (custom && custom.value && custom.value.trim()) {
        categoryVal = custom.value.trim();
      } else if (sel) {
        if (sel.value === '__other__') {
          categoryVal = (custom && custom.value) ? custom.value.trim() : '';
        } else {
          categoryVal = sel.value || '';
        }
      }
      data.category = categoryVal;
      data.stock = parseInt(stockVal) || 0;

      try {
        const imageInput = document.getElementById('field-image');
        if (imageInput && imageInput.files && imageInput.files[0]) {
          const imgForm = new FormData();
          imgForm.append('image', imageInput.files[0]);
          const up = await fetch(`${API_BASE}/upload`, { method: 'POST', body: imgForm });
          if (up.ok) {
            const uploaded = await up.json();
            data.image = uploaded.url || uploaded.filename;
          }
        } else if (this.currentImage) {
          data.image = this.currentImage;
        }
      } catch (err) {
        console.error('Image upload failed', err);
      }

      endpoint = 'products';
    }

    // ===== CATEGORIES =====
    else if (!isPage) {
      const formId = document.getElementById('field-id')?.value || this.currentEditId;
      
      data = {
        name: document.getElementById('field-name')?.value,
        description: document.getElementById('field-description')?.value,
      };
      
      if (!this.currentEditId) {
        data.id = formId;
      }

      // Handle image upload for categories
      try {
        const imageInput = document.getElementById('field-category-image');
        if (imageInput && imageInput.files && imageInput.files[0]) {
          const imgForm = new FormData();
          imgForm.append('image', imageInput.files[0]);
          const up = await fetch(`${API_BASE}/upload`, { method: 'POST', body: imgForm });
          if (up.ok) {
            const uploaded = await up.json();
            data.image = uploaded.url || uploaded.filename;
          }
        } else if (this.currentImage) {
          data.image = this.currentImage;
        }
      } catch (err) {
        console.error('Image upload failed', err);
      }

      endpoint = 'categories';
    }

    // ===== PAGES =====
    else if (isPage) {
      const slug = document.getElementById('field-slug')?.value;
      
      if (!slug || slug.trim() === '') {
        this.showToast('معرف القسم مطلوب', 'error');
        return;
      }
      
      const title = document.getElementById('field-title')?.value;
      const content = document.getElementById('field-content')?.value;
      
      if (!title || title.trim() === '') {
        this.showToast('عنوان القسم مطلوب', 'error');
        return;
      }
      
      if (!content || content.trim() === '') {
        this.showToast('محتوى القسم مطلوب', 'error');
        return;
      }

      data = {
        slug,
        title,
        content
      };

      // Handle image upload for pages
      try {
        const imageInput = document.getElementById('field-page-image');
        if (imageInput && imageInput.files && imageInput.files[0]) {
          const imgForm = new FormData();
          imgForm.append('image', imageInput.files[0]);
          const up = await fetch(`${API_BASE}/upload`, { method: 'POST', body: imgForm });
          if (up.ok) {
            const uploaded = await up.json();
            data.image = uploaded.url || uploaded.filename;
          }
        } else if (this.currentImage) {
          data.image = this.currentImage;
        }
      } catch (err) {
        console.error('Image upload failed', err);
      }

      endpoint = 'pages';
      urlId = slug; // For pages, use slug as the ID in URL
    }

    // Remove undefined and null fields
    Object.keys(data).forEach(key => {
      if (data[key] === undefined || data[key] === null || data[key] === '') {
        delete data[key];
      }
    });

    try {
      const url = urlId ? 
        `${API_BASE}/${endpoint}/${urlId}` : 
        `${API_BASE}/${endpoint}`;
      
      const method = urlId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        this.showToast('تم الحفظ بنجاح', 'success');
        this.closeModal();
        
        if (isProduct) {
          this.loadProducts();
          this.loadDashboard();
        } else if (!isPage) {
          this.loadCategories();
        } else {
          this.loadPages();
        }
      } else {
        const error = await response.json();
        this.showToast(error.error || 'خطأ في الحفظ', 'error');
      }
    } catch (err) {
      this.showToast('خطأ في معالجة الطلب', 'error');
      console.error(err);
    }
  },

  // Check for new orders periodically
  async checkForNewOrders() {
    try {
      const response = await fetch(`${API_BASE}/orders`);
      const orders = await response.json();
      
      const newOrders = orders.filter(o => !o.isViewed);
      const previousCount = this.newOrdersCount;
      this.newOrdersCount = newOrders.length;
      
      // Update notification badge
      this.updateNewOrdersBadge();
      
      // Show notification if new orders arrived
      if (this.newOrdersCount > previousCount && this.newOrdersCount > 0) {
        const newCount = this.newOrdersCount - previousCount;
        this.showToast(`وصل ${newCount} طلب جديد! 🛒`, 'success');
      }
    } catch (err) {
      console.error('Error checking for new orders:', err);
    }
  },

  // Update the new orders count badge in header
  updateNewOrdersBadge() {
    let badge = document.getElementById('new-orders-badge');
    
    if (this.newOrdersCount > 0) {
      if (!badge) {
        // Create badge if it doesn't exist
        const ordersNav = document.querySelector('[data-section="orders"]');
        if (ordersNav) {
          badge = document.createElement('span');
          badge.id = 'new-orders-badge';
          badge.className = 'new-orders-badge';
          ordersNav.appendChild(badge);
        }
      }
      
      if (badge) {
        badge.textContent = this.newOrdersCount;
        badge.style.display = 'inline-flex';
      }
    } else {
      if (badge) {
        badge.style.display = 'none';
      }
    }
  },

  // Show delete confirmation dialog (no alert/confirm)
  showDeleteConfirmation(id, type, onConfirm) {
    const typeNames = { product: 'المنتج', category: 'الفئة', page: 'القسم', review: 'التعليق' };
    const typeName = typeNames[type] || 'العنصر';
    
    // Create confirmation modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;
    
    modal.innerHTML = `
      <div style="background:white;padding:24px;border-radius:8px;max-width:400px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.2)">
        <h3 style="margin-top:0;color:#333">تأكيد الحذف</h3>
        <p style="color:#666;margin:16px 0">هل أنت متأكد من حذف هذا ${typeName}؟</p>
        <p style="color:#999;font-size:12px;margin:12px 0">لا يمكن التراجع عن هذا الإجراء</p>
        <div style="display:flex;gap:12px;margin-top:20px;justify-content:center">
          <button id="cancel-btn" style="padding:8px 20px;border:1px solid #ddd;background:white;border-radius:4px;cursor:pointer;font-weight:600">إلغاء</button>
          <button id="confirm-btn" style="padding:8px 20px;border:none;background:#ef4444;color:white;border-radius:4px;cursor:pointer;font-weight:600">حذف</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('cancel-btn').addEventListener('click', () => {
      modal.remove();
    });
    
    document.getElementById('confirm-btn').addEventListener('click', async () => {
      modal.remove();
      await onConfirm();
    });
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  },

  // ============= RATINGS / REVIEWS MANAGEMENT =============
  async loadRatings() {
    try {
      const response = await fetch(`${API_BASE}/reviews`);
      if (!response.ok) throw new Error('فشل في جلب التقييمات');
      const reviews = await response.json();
      const tbody = document.getElementById('ratings-tbody');
      if (!tbody) return;
      if (!Array.isArray(reviews) || reviews.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:var(--muted);text-align:center">لا توجد تقييمات حالياً.</td></tr>`;
        return;
      }

      tbody.innerHTML = reviews.map(r => `
        <tr>
          <td>${escapeHtml(r.productId || '')}</td>
          <td>${escapeHtml(String(r.rating || 0))}</td>
          <td>${escapeHtml((r.text || '').substring(0, 200))}</td>
          <td>
            <button class="btn btn-small" onclick="app.viewProductFromReview('${escapeHtml(r.productId || '')}')">عرض المنتج</button>
            <button class="btn btn-danger btn-small" onclick="app.deleteReview('${escapeHtml(r.id || '')}')">حذف</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('loadRatings error:', err);
      this.showToast('خطأ في تحميل التقييمات', 'error');
    }
  },

  async deleteReview(reviewId) {
    this.showDeleteConfirmation(reviewId, 'review', async () => {
      try {
        const resp = await fetch(`${API_BASE}/reviews/${reviewId}`, { method: 'DELETE' });
        if (resp.ok) {
          this.showToast('تم حذف التعليق', 'success');
          this.loadRatings();
        } else {
          const err = await resp.json();
          this.showToast(err.error || 'خطأ في حذف التعليق', 'error');
        }
      } catch (err) {
        console.error('deleteReview error:', err);
        this.showToast('خطأ في حذف التعليق', 'error');
      }
    });
  },

  viewProductFromReview(productId) {
    if (!productId) return;
    // Open product in a new tab for quick inspection
    const url = `/product.html?id=${encodeURIComponent(productId)}`;
    window.open(url, '_blank');
  },

  // ============= UTILITIES =============

  updateClock() {
    const now = new Date();
    document.getElementById('current-time').textContent = 
      now.toLocaleTimeString('ar-EG') + ' | ' + now.toLocaleDateString('ar-EG');
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => app.init());
