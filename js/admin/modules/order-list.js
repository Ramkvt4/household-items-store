/**
 * Admin Order List Module
 * Orders table, summary stats, search/filter/sort, detail modal, CSV export
 */

const AdminOrderList = (() => {
  let orders = [];
  let selectedOrderId = null;
  let searchQuery = '';
  let statusFilter = 'all';
  let sortBy = 'newest';

  function init() {
    bindEvents();
  }

  function bindEvents() {
    document.getElementById('orders-search')?.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      render();
    });

    document.getElementById('orders-filter')?.addEventListener('change', (e) => {
      statusFilter = e.target.value;
      render();
    });

    document.getElementById('orders-sort')?.addEventListener('change', (e) => {
      sortBy = e.target.value;
      render();
    });

    document.getElementById('orders-export-btn')?.addEventListener('click', exportCsv);
    document.getElementById('order-detail-close')?.addEventListener('click', closeDetailModal);
    document.getElementById('order-detail-overlay')?.addEventListener('click', closeDetailModal);
    document.getElementById('order-status-save')?.addEventListener('click', saveStatus);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDetailModal();
    });
  }

  function start() {
    const loading = document.getElementById('orders-loading');
    const table = document.getElementById('orders-table');
    const empty = document.getElementById('orders-empty');

    if (loading) loading.hidden = false;
    if (table) table.hidden = true;
    if (empty) empty.hidden = true;

    AdminOrderService.subscribeAll(
      (data) => {
        orders = data;
        if (loading) loading.hidden = true;
        render();

        if (selectedOrderId) {
          const stillExists = orders.some((o) => o.id === selectedOrderId);
          if (stillExists) {
            refreshDetailModal();
          } else {
            closeDetailModal();
          }
        }
      },
      (error) => {
        if (loading) loading.hidden = true;
        AdminUI.showToast('Failed to load orders: ' + error.message, 'error');
      }
    );
  }

  function stop() {
    AdminOrderService.stopListening();
  }

  function getVisibleOrders() {
    let list = orders.slice();

    if (statusFilter !== 'all') {
      list = list.filter((o) => o.orderStatus === statusFilter);
    }

    if (searchQuery) {
      list = list.filter((o) => {
        const name = (o.customer?.fullName || '').toLowerCase();
        const email = (o.customer?.email || '').toLowerCase();
        const number = (o.orderNumber || '').toLowerCase();
        return (
          name.includes(searchQuery) ||
          email.includes(searchQuery) ||
          number.includes(searchQuery)
        );
      });
    }

    list.sort((a, b) => {
      const aMs = AdminOrderService.getTimestampMs(a.createdAt);
      const bMs = AdminOrderService.getTimestampMs(b.createdAt);
      const aTotal = Number(a.grandTotal) || 0;
      const bTotal = Number(b.grandTotal) || 0;

      switch (sortBy) {
        case 'oldest':
          return aMs - bMs;
        case 'highest':
          return bTotal - aTotal;
        case 'lowest':
          return aTotal - bTotal;
        case 'newest':
        default:
          return bMs - aMs;
      }
    });

    return list;
  }

  function render() {
    updateStats();
    renderTable(getVisibleOrders());
  }

  function updateStats() {
    const total = orders.length;
    const pending = orders.filter((o) =>
      AdminOrderService.PENDING_STATUSES.includes(o.orderStatus)
    ).length;
    const delivered = orders.filter((o) => o.orderStatus === 'delivered').length;
    const cancelled = orders.filter((o) => o.orderStatus === 'cancelled').length;
    const revenue = orders
      .filter((o) => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

    setText('order-stat-total', String(total));
    setText('order-stat-pending', String(pending));
    setText('order-stat-delivered', String(delivered));
    setText('order-stat-cancelled', String(cancelled));
    setText('order-stat-revenue', '₹' + formatAmount(revenue));
  }

  function renderTable(visible) {
    const tbody = document.getElementById('orders-tbody');
    const table = document.getElementById('orders-table');
    const empty = document.getElementById('orders-empty');
    const loading = document.getElementById('orders-loading');

    if (!tbody || !table || !empty) return;
    if (loading) loading.hidden = true;

    if (visible.length === 0) {
      table.hidden = true;
      empty.hidden = false;
      empty.querySelector('p').textContent = orders.length
        ? 'No orders match your search or filters.'
        : 'No orders yet.';
      return;
    }

    table.hidden = false;
    empty.hidden = true;

    tbody.innerHTML = visible
      .map((order) => {
        const itemCount = getItemCount(order.items);
        const status = order.orderStatus || 'placed';

        return `
          <tr>
            <td><strong>${escape(order.orderNumber || '—')}</strong></td>
            <td>${escape(order.customer?.fullName || '—')}</td>
            <td>${escape(order.customer?.email || '—')}</td>
            <td>${escape(formatDate(order.createdAt))}</td>
            <td>${itemCount}</td>
            <td>₹${formatAmount(order.grandTotal)}</td>
            <td>${escape(AdminOrderService.getPaymentMethodLabel(order.paymentMethod))}</td>
            <td>
              <span class="admin-badge ${statusBadgeClass(status)}">
                ${escape(AdminOrderService.getStatusLabel(status))}
              </span>
            </td>
            <td>
              <div class="admin-table__actions">
                <button type="button" class="btn btn--secondary btn--sm" data-view-order="${escape(order.id)}">View</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('[data-view-order]').forEach((btn) => {
      btn.addEventListener('click', () => openDetailModal(btn.dataset.viewOrder));
    });
  }

  function openDetailModal(orderId) {
    selectedOrderId = orderId;
    refreshDetailModal();
    const modal = document.getElementById('order-detail-modal');
    if (modal) modal.hidden = false;
  }

  function closeDetailModal() {
    selectedOrderId = null;
    const modal = document.getElementById('order-detail-modal');
    if (modal) modal.hidden = true;
  }

  function refreshDetailModal() {
    const order = orders.find((o) => o.id === selectedOrderId);
    if (!order) return;

    const status = order.orderStatus || 'placed';
    setText('order-detail-number', order.orderNumber || '—');
    setHtml('order-detail-customer', renderCustomer(order));
    setHtml('order-detail-shipping', renderShipping(order.shippingAddress));
    setText('order-detail-phone', order.customer?.mobile || '—');
    setText(
      'order-detail-payment',
      AdminOrderService.getPaymentMethodLabel(order.paymentMethod)
    );
    setHtml('order-detail-items', renderItems(order.items));
    setHtml('order-detail-totals', renderTotals(order));
    setHtml('order-detail-timeline', renderTimeline(order));

    const statusSelect = document.getElementById('order-status-select');
    if (statusSelect) {
      statusSelect.innerHTML = AdminOrderService.ORDER_STATUSES.map(
        (s) =>
          `<option value="${s}" ${s === status ? 'selected' : ''}>${AdminOrderService.getStatusLabel(s)}</option>`
      ).join('');
    }

    const badge = document.getElementById('order-detail-status-badge');
    if (badge) {
      badge.className = `admin-badge ${statusBadgeClass(status)}`;
      badge.textContent = AdminOrderService.getStatusLabel(status);
    }
  }

  async function saveStatus() {
    if (!selectedOrderId) return;

    const select = document.getElementById('order-status-select');
    const newStatus = select?.value;
    if (!newStatus) return;

    const order = orders.find((o) => o.id === selectedOrderId);
    if (!order || order.orderStatus === newStatus) {
      AdminUI.showToast('Status unchanged', 'info');
      return;
    }

    const btn = document.getElementById('order-status-save');
    if (btn) btn.disabled = true;

    try {
      const email = AuthService.getCurrentUser()?.email || '';
      await AdminOrderService.updateStatus(selectedOrderId, newStatus, email);
      AdminUI.showToast('Order status updated', 'success');
    } catch (error) {
      AdminUI.showToast('Status update failed: ' + error.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function renderCustomer(order) {
    const c = order.customer || {};
    return `
      <p><strong>${escape(c.fullName || '—')}</strong></p>
      <p class="admin-detail__muted">${escape(c.email || '—')}</p>
    `;
  }

  function renderShipping(address) {
    if (!address || typeof address !== 'object') {
      return '<p>—</p>';
    }

    const lines = [
      address.houseNo,
      address.street,
      address.landmark ? `Landmark: ${address.landmark}` : '',
      [address.city, address.state].filter(Boolean).join(', '),
      address.pinCode ? `PIN: ${address.pinCode}` : '',
    ].filter(Boolean);

    if (!lines.length) return '<p>—</p>';

    return lines.map((line) => `<p>${escape(line)}</p>`).join('');
  }

  function renderItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return '<p class="admin-detail__muted">No products in this order.</p>';
    }

    return `
      <div class="admin-order-items">
        ${items
          .map((item) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            const subtotal = qty * price;
            const image = resolveImage(item.image);

            return `
              <div class="admin-order-item">
                <img class="admin-order-item__img" src="${escape(image)}" alt="" loading="lazy"
                  onerror="this.src='../assets/images/products/placeholder.svg'">
                <div class="admin-order-item__info">
                  <strong>${escape(item.name || 'Product')}</strong>
                  ${item.brand ? `<span class="admin-detail__muted">${escape(item.brand)}</span>` : ''}
                  <span>Qty: ${qty} · ₹${formatAmount(price)} each</span>
                </div>
                <div class="admin-order-item__subtotal">₹${formatAmount(subtotal)}</div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  function renderTotals(order) {
    return `
      <div class="admin-order-totals">
        <div><span>Subtotal</span><span>₹${formatAmount(order.subtotal)}</span></div>
        <div><span>Discount</span><span>−₹${formatAmount(order.discount)}</span></div>
        <div><span>Delivery</span><span>₹${formatAmount(order.delivery)}</span></div>
        <div class="admin-order-totals__grand"><span>Grand Total</span><span>₹${formatAmount(order.grandTotal)}</span></div>
      </div>
    `;
  }

  function renderTimeline(order) {
    const history = Array.isArray(order.statusHistory) ? order.statusHistory.slice() : [];
    const events = [];

    events.push({
      status: 'placed',
      at: order.createdAt,
      by: null,
    });

    history.forEach((entry) => {
      if (!entry || entry.status === 'placed') return;
      events.push({
        status: entry.status,
        at: entry.at,
        by: entry.by,
      });
    });

    const current = order.orderStatus || 'placed';
    if (current !== 'placed' && !events.some((e) => e.status === current)) {
      events.push({
        status: current,
        at: order.updatedAt || order.createdAt,
        by: null,
      });
    }

    events.sort(
      (a, b) =>
        AdminOrderService.getTimestampMs(a.at) - AdminOrderService.getTimestampMs(b.at)
    );

    return `
      <ol class="admin-timeline">
        ${events
          .map(
            (event) => `
          <li class="admin-timeline__item">
            <span class="admin-badge ${statusBadgeClass(event.status)}">
              ${escape(AdminOrderService.getStatusLabel(event.status))}
            </span>
            <span class="admin-timeline__meta">
              ${escape(formatDateTime(event.at))}
              ${event.by ? ` · ${escape(event.by)}` : ''}
            </span>
          </li>
        `
          )
          .join('')}
      </ol>
    `;
  }

  function exportCsv() {
    const visible = getVisibleOrders();
    if (!visible.length) {
      AdminUI.showToast('No orders to export', 'info');
      return;
    }

    const headers = [
      'Order Number',
      'Customer Name',
      'Customer Email',
      'Phone',
      'Order Date',
      'Items Count',
      'Subtotal',
      'Discount',
      'Delivery',
      'Total Amount',
      'Payment Method',
      'Status',
    ];

    const rows = visible.map((order) => [
      order.orderNumber || '',
      order.customer?.fullName || '',
      order.customer?.email || '',
      order.customer?.mobile || '',
      formatDate(order.createdAt),
      getItemCount(order.items),
      Number(order.subtotal) || 0,
      Number(order.discount) || 0,
      Number(order.delivery) || 0,
      Number(order.grandTotal) || 0,
      AdminOrderService.getPaymentMethodLabel(order.paymentMethod),
      AdminOrderService.getStatusLabel(order.orderStatus),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    AdminUI.showToast(`Exported ${visible.length} order(s)`, 'success');
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

  function getItemCount(items) {
    if (!Array.isArray(items) || !items.length) return 0;
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }

  function formatAmount(value) {
    return Number(value || 0).toLocaleString('en-IN');
  }

  function formatDate(value) {
    const ms = AdminOrderService.getTimestampMs(value);
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatDateTime(value) {
    const ms = AdminOrderService.getTimestampMs(value);
    if (!ms) return '—';
    return new Date(ms).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function escape(str) {
    return AdminUI.escapeHtml(str == null ? '' : String(str));
  }

  function csvEscape(value) {
    const str = String(value ?? '');
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  return {
    init,
    start,
    stop,
    openDetailModal,
  };
})();

if (typeof window !== 'undefined') {
  window.AdminOrderList = AdminOrderList;
}
