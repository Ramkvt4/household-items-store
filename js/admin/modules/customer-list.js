/**
 * Admin Customer List Module
 * Customer table, stats, search/filter/sort, detail modal, CSV export
 */

const AdminCustomerList = (() => {
  let customers = [];
  let orders = [];
  let selectedCustomerId = null;
  let searchQuery = '';
  let statusFilter = 'all';
  let sortBy = 'newest';
  let ordersUnsub = null;

  function init() {
    bindEvents();
  }

  function bindEvents() {
    document.getElementById('customers-search')?.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      render();
    });

    document.getElementById('customers-filter')?.addEventListener('change', (e) => {
      statusFilter = e.target.value;
      render();
    });

    document.getElementById('customers-sort')?.addEventListener('change', (e) => {
      sortBy = e.target.value;
      render();
    });

    document.getElementById('customers-export-btn')?.addEventListener('click', exportCsv);
    document.getElementById('customer-detail-close')?.addEventListener('click', closeDetailModal);
    document.getElementById('customer-detail-overlay')?.addEventListener('click', closeDetailModal);

    document.getElementById('customer-activate-btn')?.addEventListener('click', () =>
      setStatus(AdminCustomerService.ACCOUNT_STATUSES.ACTIVE, 'Customer activated')
    );
    document.getElementById('customer-block-btn')?.addEventListener('click', () =>
      setStatus(AdminCustomerService.ACCOUNT_STATUSES.BLOCKED, 'Customer blocked')
    );
    document.getElementById('customer-unblock-btn')?.addEventListener('click', () =>
      setStatus(AdminCustomerService.ACCOUNT_STATUSES.ACTIVE, 'Customer unblocked')
    );
    document.getElementById('customer-delete-btn')?.addEventListener('click', softDeleteCustomer);

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const customerModal = document.getElementById('customer-detail-modal');
      if (customerModal && !customerModal.hidden) {
        closeDetailModal();
      }
    });
  }

  function start() {
    const loading = document.getElementById('customers-loading');
    const table = document.getElementById('customers-table');
    const empty = document.getElementById('customers-empty');

    if (loading) loading.hidden = false;
    if (table) table.hidden = true;
    if (empty) empty.hidden = true;

    listenOrders();
    listenCustomers(loading);
  }

  function listenOrders() {
    const db = FirebaseConfig.db;
    if (!db) return;

    if (ordersUnsub) {
      ordersUnsub();
      ordersUnsub = null;
    }

    ordersUnsub = db
      .collection(FirebaseConfig.collections.orders)
      .onSnapshot(
        (snapshot) => {
          orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          render();
          if (selectedCustomerId) refreshDetailModal();
        },
        (error) => {
          console.error('[AdminCustomerList] Orders listen failed:', error);
        }
      );
  }

  function listenCustomers(loading) {
    AdminCustomerService.subscribeAll(
      (data) => {
        customers = data;
        if (loading) loading.hidden = true;
        render();

        if (selectedCustomerId) {
          const stillVisible = customers.some((c) => c.id === selectedCustomerId);
          if (stillVisible) {
            refreshDetailModal();
          } else {
            closeDetailModal();
          }
        }
      },
      (error) => {
        if (loading) loading.hidden = true;
        AdminUI.showToast('Failed to load customers: ' + error.message, 'error');
      }
    );
  }

  function stop() {
    AdminCustomerService.stopListening();
    if (ordersUnsub) {
      ordersUnsub();
      ordersUnsub = null;
    }
  }

  function getCustomerOrders(userId) {
    return orders.filter((o) => o.userId === userId);
  }

  function getOrderStats(userId) {
    const list = getCustomerOrders(userId);
    const completed = list.filter((o) => o.orderStatus === 'delivered').length;
    const cancelled = list.filter((o) => o.orderStatus === 'cancelled').length;
    const totalPurchased = list
      .filter((o) => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

    return {
      ordersCount: list.length,
      completedOrders: completed,
      cancelledOrders: cancelled,
      totalPurchased,
      recentOrders: list
        .slice()
        .sort(
          (a, b) =>
            AdminCustomerService.getTimestampMs(b.createdAt) -
            AdminCustomerService.getTimestampMs(a.createdAt)
        ),
    };
  }

  function resolvePhone(customer) {
    if (customer.phone) return customer.phone;
    const latest = getOrderStats(customer.id).recentOrders[0];
    return latest?.customer?.mobile || '';
  }

  function getVisibleCustomers() {
    let list = customers.filter((c) => {
      // Soft-deleted users hidden from default "all" list
      if (statusFilter === 'all') {
        return c.accountStatus !== AdminCustomerService.ACCOUNT_STATUSES.DELETED;
      }
      return true;
    });

    switch (statusFilter) {
      case 'verified':
        list = list.filter((c) => c.emailVerified);
        break;
      case 'unverified':
        list = list.filter(
          (c) =>
            !c.emailVerified &&
            c.accountStatus !== AdminCustomerService.ACCOUNT_STATUSES.DELETED
        );
        break;
      case 'with_orders':
        list = list.filter((c) => getOrderStats(c.id).ordersCount > 0);
        break;
      case 'without_orders':
        list = list.filter(
          (c) =>
            getOrderStats(c.id).ordersCount === 0 &&
            c.accountStatus !== AdminCustomerService.ACCOUNT_STATUSES.DELETED
        );
        break;
      case 'blocked':
        list = list.filter(
          (c) => c.accountStatus === AdminCustomerService.ACCOUNT_STATUSES.BLOCKED
        );
        break;
      case 'active':
        list = list.filter(
          (c) => c.accountStatus === AdminCustomerService.ACCOUNT_STATUSES.ACTIVE
        );
        break;
      case 'deleted':
        list = list.filter(
          (c) => c.accountStatus === AdminCustomerService.ACCOUNT_STATUSES.DELETED
        );
        break;
      default:
        break;
    }

    if (searchQuery) {
      list = list.filter((c) => {
        const name = (c.displayName || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const phone = resolvePhone(c).toLowerCase();
        return (
          name.includes(searchQuery) ||
          email.includes(searchQuery) ||
          phone.includes(searchQuery)
        );
      });
    }

    list.sort((a, b) => {
      const aStats = getOrderStats(a.id);
      const bStats = getOrderStats(b.id);
      const aMs = AdminCustomerService.getTimestampMs(a.createdAt);
      const bMs = AdminCustomerService.getTimestampMs(b.createdAt);

      switch (sortBy) {
        case 'oldest':
          return aMs - bMs;
        case 'highest_purchase':
          return bStats.totalPurchased - aStats.totalPurchased;
        case 'lowest_purchase':
          return aStats.totalPurchased - bStats.totalPurchased;
        case 'most_orders':
          return bStats.ordersCount - aStats.ordersCount;
        case 'newest':
        default:
          return bMs - aMs;
      }
    });

    return list;
  }

  function render() {
    updateStats();
    renderTable(getVisibleCustomers());
  }

  function updateStats() {
    const visibleBase = customers.filter(
      (c) => c.accountStatus !== AdminCustomerService.ACCOUNT_STATUSES.DELETED
    );
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const total = visibleBase.length;
    const verified = visibleBase.filter((c) => c.emailVerified).length;
    const withOrders = visibleBase.filter((c) => getOrderStats(c.id).ordersCount > 0).length;
    const newCustomers = visibleBase.filter(
      (c) => AdminCustomerService.getTimestampMs(c.createdAt) >= thirtyDaysAgo
    ).length;

    setText('customer-stat-total', String(total));
    setText('customer-stat-verified', String(verified));
    setText('customer-stat-with-orders', String(withOrders));
    setText('customer-stat-new', String(newCustomers));
  }

  function renderTable(visible) {
    const tbody = document.getElementById('customers-tbody');
    const table = document.getElementById('customers-table');
    const empty = document.getElementById('customers-empty');
    const loading = document.getElementById('customers-loading');

    if (!tbody || !table || !empty) return;
    if (loading) loading.hidden = true;

    if (visible.length === 0) {
      table.hidden = true;
      empty.hidden = false;
      empty.querySelector('p').textContent = customers.length
        ? 'No customers match your search or filters.'
        : 'No registered customers yet.';
      return;
    }

    table.hidden = false;
    empty.hidden = true;

    tbody.innerHTML = visible
      .map((customer) => {
        const stats = getOrderStats(customer.id);
        const status = customer.accountStatus || 'active';
        const photo = customer.photoURL || '../assets/images/products/placeholder.svg';

        return `
          <tr>
            <td>
              <img class="admin-table__thumb admin-table__thumb--avatar" src="${escape(photo)}" alt=""
                onerror="this.src='../assets/images/products/placeholder.svg'">
            </td>
            <td><strong>${escape(customer.displayName || '—')}</strong></td>
            <td>${escape(customer.email || '—')}</td>
            <td>${escape(resolvePhone(customer) || '—')}</td>
            <td>${escape(formatDate(customer.createdAt))}</td>
            <td>${stats.ordersCount}</td>
            <td>₹${formatAmount(stats.totalPurchased)}</td>
            <td>
              <span class="admin-badge ${accountBadgeClass(status)}">
                ${escape(accountStatusLabel(status))}
              </span>
            </td>
            <td>
              <div class="admin-table__actions">
                <button type="button" class="btn btn--secondary btn--sm" data-view-customer="${escape(customer.id)}">View</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('[data-view-customer]').forEach((btn) => {
      btn.addEventListener('click', () => openDetailModal(btn.dataset.viewCustomer));
    });
  }

  async function openDetailModal(customerId) {
    selectedCustomerId = customerId;
    const modal = document.getElementById('customer-detail-modal');
    if (modal) modal.hidden = false;
    await refreshDetailModal();
  }

  function closeDetailModal() {
    selectedCustomerId = null;
    const modal = document.getElementById('customer-detail-modal');
    if (modal) modal.hidden = true;
  }

  async function refreshDetailModal() {
    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) return;

    const stats = getOrderStats(customer.id);
    const status = customer.accountStatus || 'active';
    const photo = customer.photoURL || '../assets/images/products/placeholder.svg';

    setText('customer-detail-name', customer.displayName || '—');
    setText('customer-detail-email', customer.email || '—');
    setText('customer-detail-phone', resolvePhone(customer) || '—');
    setHtml('customer-detail-address', renderAddress(customer.savedAddress));
    setText('customer-detail-registered', formatDate(customer.createdAt));
    setText('customer-detail-last-login', formatDateTime(customer.lastLoginAt));
    setText(
      'customer-detail-verified',
      customer.emailVerified ? 'Verified' : 'Unverified'
    );
    setText('customer-detail-orders-total', String(stats.ordersCount));
    setText('customer-detail-orders-completed', String(stats.completedOrders));
    setText('customer-detail-orders-cancelled', String(stats.cancelledOrders));
    setText('customer-detail-purchased', '₹' + formatAmount(stats.totalPurchased));

    const avatar = document.getElementById('customer-detail-avatar');
    if (avatar) {
      avatar.src = photo;
      avatar.onerror = () => {
        avatar.src = '../assets/images/products/placeholder.svg';
      };
    }

    const badge = document.getElementById('customer-detail-status-badge');
    if (badge) {
      badge.className = `admin-badge ${accountBadgeClass(status)}`;
      badge.textContent = accountStatusLabel(status);
    }

    updateActionButtons(status);
    setHtml('customer-detail-orders', renderOrderHistory(stats.recentOrders));

    setText('customer-detail-wishlist', '…');
    setText('customer-detail-cart', '…');
    setText('customer-detail-reviews', '…');

    const engagement = await AdminCustomerService.getEngagementCounts(customer.id);
    if (selectedCustomerId !== customer.id) return;

    setText('customer-detail-wishlist', String(engagement.wishlistCount));
    setText('customer-detail-cart', String(engagement.cartItemsCount));
    setText('customer-detail-reviews', String(engagement.reviewsCount));
  }

  function updateActionButtons(status) {
    const activateBtn = document.getElementById('customer-activate-btn');
    const blockBtn = document.getElementById('customer-block-btn');
    const unblockBtn = document.getElementById('customer-unblock-btn');
    const deleteBtn = document.getElementById('customer-delete-btn');

    const isActive = status === AdminCustomerService.ACCOUNT_STATUSES.ACTIVE;
    const isBlocked = status === AdminCustomerService.ACCOUNT_STATUSES.BLOCKED;
    const isDeleted = status === AdminCustomerService.ACCOUNT_STATUSES.DELETED;

    if (activateBtn) activateBtn.hidden = !isDeleted;
    if (blockBtn) blockBtn.hidden = !isActive;
    if (unblockBtn) unblockBtn.hidden = !isBlocked;
    if (deleteBtn) deleteBtn.hidden = isDeleted;
  }

  function renderAddress(address) {
    if (!address || typeof address !== 'object') {
      return '<p class="admin-detail__muted">No saved address</p>';
    }

    const lines = [
      address.houseNo,
      address.street,
      address.landmark ? `Landmark: ${address.landmark}` : '',
      [address.city, address.state].filter(Boolean).join(', '),
      address.pinCode ? `PIN: ${address.pinCode}` : '',
    ].filter(Boolean);

    if (!lines.length) {
      return '<p class="admin-detail__muted">No saved address</p>';
    }

    return lines.map((line) => `<p>${escape(line)}</p>`).join('');
  }

  function renderOrderHistory(orderList) {
    if (!orderList.length) {
      return '<p class="admin-detail__muted">No orders for this customer.</p>';
    }

    return `
      <div class="admin-table-wrap">
        <table class="admin-table admin-table--customer-orders">
          <thead>
            <tr>
              <th>Order Number</th>
              <th>Date</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Items</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${orderList
              .map((order) => {
                const status = order.orderStatus || 'placed';
                const itemCount = Array.isArray(order.items)
                  ? order.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
                  : 0;

                return `
                  <tr>
                    <td><strong>${escape(order.orderNumber || '—')}</strong></td>
                    <td>${escape(formatDate(order.createdAt))}</td>
                    <td>
                      <span class="admin-badge ${orderStatusBadgeClass(status)}">
                        ${escape(AdminOrderService.getStatusLabel(status))}
                      </span>
                    </td>
                    <td>₹${formatAmount(order.grandTotal)}</td>
                    <td>${itemCount}</td>
                    <td>
                      <button type="button" class="btn btn--secondary btn--sm" data-open-order="${escape(order.id)}">
                        View Order
                      </button>
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function bindOrderHistoryButtons() {
    document.querySelectorAll('#customer-detail-orders [data-open-order]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const orderId = btn.dataset.openOrder;
        if (typeof AdminOrderList?.openDetailModal === 'function') {
          AdminOrderList.openDetailModal(orderId);
        } else {
          AdminUI.showToast('Order details unavailable', 'error');
        }
      });
    });
  }

  async function setStatus(status, successMessage) {
    if (!selectedCustomerId) return;

    const email = AuthService.getCurrentUser()?.email || '';
    try {
      await AdminCustomerService.updateAccountStatus(selectedCustomerId, status, email);
      AdminUI.showToast(successMessage, 'success');
    } catch (error) {
      AdminUI.showToast('Status update failed: ' + error.message, 'error');
    }
  }

  async function softDeleteCustomer() {
    if (!selectedCustomerId) return;
    const customer = customers.find((c) => c.id === selectedCustomerId);
    const name = customer?.displayName || customer?.email || 'this customer';

    if (!confirm(`Mark "${name}" as deleted? They will be hidden from the default list and cannot sign in.`)) {
      return;
    }

    await setStatus(
      AdminCustomerService.ACCOUNT_STATUSES.DELETED,
      'Customer marked as deleted'
    );
    closeDetailModal();
  }

  function exportCsv() {
    const visible = getVisibleCustomers();
    if (!visible.length) {
      AdminUI.showToast('No customers to export', 'info');
      return;
    }

    const headers = [
      'Customer Name',
      'Email',
      'Phone',
      'Registration Date',
      'Orders Count',
      'Total Purchased',
      'Email Verified',
      'Account Status',
    ];

    const rows = visible.map((customer) => {
      const stats = getOrderStats(customer.id);
      return [
        customer.displayName || '',
        customer.email || '',
        resolvePhone(customer),
        formatDate(customer.createdAt),
        stats.ordersCount,
        stats.totalPurchased,
        customer.emailVerified ? 'Yes' : 'No',
        accountStatusLabel(customer.accountStatus),
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    AdminUI.showToast(`Exported ${visible.length} customer(s)`, 'success');
  }

  function accountStatusLabel(status) {
    const labels = {
      active: 'Active',
      blocked: 'Blocked',
      deleted: 'Deleted',
    };
    return labels[status] || status || 'Active';
  }

  function accountBadgeClass(status) {
    const map = {
      active: 'admin-badge--delivered',
      blocked: 'admin-badge--cancelled',
      deleted: 'admin-badge--packed',
    };
    return map[status] || 'admin-badge--delivered';
  }

  function orderStatusBadgeClass(status) {
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

  function formatAmount(value) {
    return Number(value || 0).toLocaleString('en-IN');
  }

  function formatDate(value) {
    const ms = AdminCustomerService.getTimestampMs(value);
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatDateTime(value) {
    const ms = AdminCustomerService.getTimestampMs(value);
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
    if (id === 'customer-detail-orders') {
      bindOrderHistoryButtons();
    }
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
  };
})();

if (typeof window !== 'undefined') {
  window.AdminCustomerList = AdminCustomerList;
}
