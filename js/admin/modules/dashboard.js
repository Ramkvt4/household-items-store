/**
 * Admin Dashboard Module
 * Analytics landing view — KPIs, tables, quick actions
 */

const AdminDashboard = (() => {
  let analytics = null;

  function init() {
    bindEvents();
  }

  function bindEvents() {
    document.getElementById('dash-action-add-product')?.addEventListener('click', () => {
      AdminProductForm.open();
    });
    document.getElementById('dash-action-orders')?.addEventListener('click', () => {
      AdminUI.showView('orders');
    });
    document.getElementById('dash-action-customers')?.addEventListener('click', () => {
      AdminUI.showView('customers');
    });
    document.getElementById('dash-action-export-products')?.addEventListener('click', exportProductsCsv);
    document.getElementById('dash-action-export-orders')?.addEventListener('click', () => {
      AdminUI.showView('orders');
      setTimeout(() => document.getElementById('orders-export-btn')?.click(), 0);
    });
    document.getElementById('dash-action-export-customers')?.addEventListener('click', () => {
      AdminUI.showView('customers');
      setTimeout(() => document.getElementById('customers-export-btn')?.click(), 0);
    });
  }

  function start() {
    const loading = document.getElementById('dashboard-loading');
    const content = document.getElementById('dashboard-content');
    if (loading) loading.hidden = false;
    if (content) content.hidden = true;

    AdminDashboardService.subscribeAll(
      (data) => {
        analytics = AdminDashboardService.buildAnalytics(data);
        if (loading) loading.hidden = true;
        if (content) content.hidden = false;
        render();
      },
      (error) => {
        if (loading) loading.hidden = true;
        if (content) content.hidden = false;
        AdminUI.showToast('Dashboard failed to load: ' + error.message, 'error');
      }
    );
  }

  function stop() {
    AdminDashboardService.stopListening();
  }

  function render() {
    if (!analytics) return;

    renderKpis();
    renderRevenue();
    renderOrderStatus();
    renderBestSelling();
    renderLowStock();
    renderRecentOrders();
    renderRecentCustomers();
    renderCategorySummary();
    renderTopCustomers();
  }

  function renderKpis() {
    const k = analytics.kpis;
    setText('dash-kpi-revenue', '₹' + formatAmount(k.totalRevenue));
    setText('dash-kpi-today-revenue', '₹' + formatAmount(k.todayRevenue));
    setText('dash-kpi-orders', String(k.totalOrders));
    setText('dash-kpi-pending', String(k.pendingOrders));
    setText('dash-kpi-delivered', String(k.deliveredOrders));
    setText('dash-kpi-cancelled', String(k.cancelledOrders));
    setText('dash-kpi-customers', String(k.totalCustomers));
    setText('dash-kpi-products', String(k.totalProducts));
    setText('dash-kpi-outstock', String(k.outOfStock));
    setText('dash-kpi-lowstock', String(k.lowStock));
  }

  function renderRevenue() {
    const r = analytics.revenue;
    setText('dash-rev-today', '₹' + formatAmount(r.today));
    setText('dash-rev-week', '₹' + formatAmount(r.week));
    setText('dash-rev-month', '₹' + formatAmount(r.month));
    setText('dash-rev-year', '₹' + formatAmount(r.year));
    setText('dash-rev-lifetime', '₹' + formatAmount(r.lifetime));
  }

  function renderOrderStatus() {
    const counts = analytics.statusCounts;
    const host = document.getElementById('dash-order-status');
    if (!host) return;

    const items = [
      ['placed', 'Placed', 'admin-badge--placed'],
      ['confirmed', 'Confirmed', 'admin-badge--confirmed'],
      ['packed', 'Packed', 'admin-badge--packed'],
      ['shipped', 'Shipped', 'admin-badge--shipped'],
      ['delivered', 'Delivered', 'admin-badge--delivered'],
      ['cancelled', 'Cancelled', 'admin-badge--cancelled'],
    ];

    host.innerHTML = items
      .map(
        ([key, label, badge]) => `
        <div class="admin-stat admin-stat--compact">
          <div class="admin-stat__label">
            <span class="admin-badge ${badge}">${label}</span>
          </div>
          <div class="admin-stat__value">${counts[key] || 0}</div>
        </div>
      `
      )
      .join('');
  }

  function renderBestSelling() {
    const tbody = document.getElementById('dash-bestselling-tbody');
    const empty = document.getElementById('dash-bestselling-empty');
    if (!tbody) return;

    const rows = analytics.bestSelling || [];
    if (!rows.length) {
      tbody.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;
    tbody.innerHTML = rows
      .map((row) => {
        const image = resolveImage(row.image);
        return `
          <tr>
            <td>
              <img class="admin-table__thumb" src="${escape(image)}" alt=""
                onerror="this.src='../assets/images/products/placeholder.svg'">
            </td>
            <td><strong>${escape(row.name)}</strong></td>
            <td>${row.unitsSold}</td>
            <td>₹${formatAmount(row.revenue)}</td>
            <td>${row.rating ? Number(row.rating).toFixed(1) : '—'}</td>
          </tr>
        `;
      })
      .join('');
  }

  function renderLowStock() {
    const tbody = document.getElementById('dash-lowstock-tbody');
    const empty = document.getElementById('dash-lowstock-empty');
    if (!tbody) return;

    const rows = analytics.lowStock || [];
    if (!rows.length) {
      tbody.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;
    tbody.innerHTML = rows
      .map((p) => {
        const stock = Number(p.stock) || 0;
        const image = resolveImage(p.image);
        return `
          <tr class="${stock <= 0 ? 'admin-row--danger' : 'admin-row--warn'}">
            <td>
              <img class="admin-table__thumb" src="${escape(image)}" alt=""
                onerror="this.src='../assets/images/products/placeholder.svg'">
            </td>
            <td><strong>${escape(p.name)}</strong></td>
            <td>
              <span class="admin-badge ${stock <= 0 ? 'admin-badge--danger' : 'admin-badge--packed'}">
                ${stock}
              </span>
            </td>
            <td>
              <button type="button" class="btn btn--secondary btn--sm" data-edit-product="${escape(p.id)}">
                Edit Product
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('[data-edit-product]').forEach((btn) => {
      btn.addEventListener('click', () => AdminProductForm.open(btn.dataset.editProduct));
    });
  }

  function renderRecentOrders() {
    const tbody = document.getElementById('dash-recent-orders-tbody');
    const empty = document.getElementById('dash-recent-orders-empty');
    if (!tbody) return;

    const rows = analytics.recentOrders || [];
    if (!rows.length) {
      tbody.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;
    tbody.innerHTML = rows
      .map((order) => {
        const status = order.orderStatus || 'placed';
        return `
          <tr>
            <td><strong>${escape(order.orderNumber || '—')}</strong></td>
            <td>${escape(order.customer?.fullName || '—')}</td>
            <td>${escape(formatDate(order.createdAt))}</td>
            <td>₹${formatAmount(order.grandTotal)}</td>
            <td>
              <span class="admin-badge ${statusBadgeClass(status)}">
                ${escape(AdminOrderService.getStatusLabel(status))}
              </span>
            </td>
            <td>
              <button type="button" class="btn btn--secondary btn--sm" data-view-order="${escape(order.id)}">
                View
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('[data-view-order]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (typeof AdminOrderList?.openDetailModal === 'function') {
          AdminOrderList.openDetailModal(btn.dataset.viewOrder);
        }
      });
    });
  }

  function renderRecentCustomers() {
    const tbody = document.getElementById('dash-recent-customers-tbody');
    const empty = document.getElementById('dash-recent-customers-empty');
    if (!tbody) return;

    const rows = analytics.recentCustomers || [];
    if (!rows.length) {
      tbody.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;
    tbody.innerHTML = rows
      .map(
        (c) => `
        <tr>
          <td><strong>${escape(c.displayName || '—')}</strong></td>
          <td>${escape(c.email || '—')}</td>
          <td>${escape(formatDate(c.createdAt))}</td>
          <td>${c.ordersCount}</td>
        </tr>
      `
      )
      .join('');
  }

  function renderCategorySummary() {
    const tbody = document.getElementById('dash-category-tbody');
    const empty = document.getElementById('dash-category-empty');
    if (!tbody) return;

    const rows = analytics.categorySummary || [];
    if (!rows.length) {
      tbody.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;
    tbody.innerHTML = rows
      .map(
        (row) => `
        <tr>
          <td><strong>${escape(row.category)}</strong></td>
          <td>${row.productsCount}</td>
          <td>${row.unitsSold}</td>
          <td>₹${formatAmount(row.revenue)}</td>
        </tr>
      `
      )
      .join('');
  }

  function renderTopCustomers() {
    const tbody = document.getElementById('dash-top-customers-tbody');
    const empty = document.getElementById('dash-top-customers-empty');
    if (!tbody) return;

    const rows = analytics.topCustomers || [];
    if (!rows.length) {
      tbody.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;
    tbody.innerHTML = rows
      .map(
        (c) => `
        <tr>
          <td><strong>${escape(c.name || '—')}</strong></td>
          <td>${c.orders}</td>
          <td>₹${formatAmount(c.totalPurchase)}</td>
          <td>${escape(formatDate(c.lastOrderAt))}</td>
        </tr>
      `
      )
      .join('');
  }

  function exportProductsCsv() {
    const products = analytics?.products || [];
    if (!products.length) {
      AdminUI.showToast('No products to export', 'info');
      return;
    }

    const headers = [
      'Name',
      'Brand',
      'Category',
      'Price',
      'Stock',
      'Rating',
      'Active',
    ];
    const categoryMap = Object.fromEntries(
      (typeof CATEGORIES !== 'undefined' ? CATEGORIES : []).map((c) => [c.id, c.name])
    );

    const rows = products.map((p) => [
      p.name || '',
      p.brand || '',
      categoryMap[p.category] || p.category || '',
      Number(p.price) || 0,
      Number(p.stock) || 0,
      Number(p.rating) || 0,
      p.active ? 'Yes' : 'No',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    AdminUI.showToast(`Exported ${products.length} product(s)`, 'success');
  }

  function statusBadgeClass(status) {
    const map = {
      placed: 'admin-badge--placed',
      confirmed: 'admin-badge--confirmed',
      packed: 'admin-badge--packed',
      shipped: 'admin-badge--shipped',
      out_for_delivery: 'admin-badge--ofd',
      delivered: 'admin-badge--delivered',
      cancelled: 'admin-badge--cancelled',
    };
    return map[status] || 'admin-badge--placed';
  }

  function resolveImage(image) {
    if (!image) return '../assets/images/products/placeholder.svg';
    if (image.startsWith('http') || image.startsWith('../')) return image;
    return '../' + image;
  }

  function formatAmount(value) {
    return Number(value || 0).toLocaleString('en-IN');
  }

  function formatDate(value) {
    const ms = AdminDashboardService.getTimestampMs(value);
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function escape(str) {
    return AdminUI.escapeHtml(str == null ? '' : String(str));
  }

  function csvEscape(value) {
    const str = String(value ?? '');
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  }

  return { init, start, stop };
})();

if (typeof window !== 'undefined') {
  window.AdminDashboard = AdminDashboard;
}
