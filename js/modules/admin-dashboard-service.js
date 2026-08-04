/**
 * Admin Dashboard Service
 * Independent realtime listeners + analytics aggregation (compat SDK)
 */

const AdminDashboardService = (() => {
  let db = null;
  let unsubs = [];

  const PENDING_STATUSES = [
    'placed',
    'confirmed',
    'packed',
    'shipped',
    'out_for_delivery',
  ];

  const STATUS_KEYS = [
    'placed',
    'confirmed',
    'packed',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled',
  ];

  function init(firestore) {
    db = firestore;
  }

  function getTimestampMs(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (value instanceof Date) return value.getTime();
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function startOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function startOfWeek(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const mondayOffset = (day + 6) % 7;
    d.setDate(d.getDate() - mondayOffset);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function startOfMonth(date = new Date()) {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function startOfYear(date = new Date()) {
    const d = new Date(date);
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function isRevenueOrder(order) {
    return order && order.orderStatus !== 'cancelled';
  }

  function sumRevenue(orders, fromMs = 0) {
    return orders
      .filter((o) => isRevenueOrder(o) && getTimestampMs(o.createdAt) >= fromMs)
      .reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
  }

  /**
   * Subscribe independently to products, orders, and users.
   * Does not use AdminOrderService/AdminCustomerService listeners.
   * @param {(payload: { products: Array, orders: Array, customers: Array }) => void} onData
   * @param {(error: Error) => void} [onError]
   * @returns {() => void}
   */
  function subscribeAll(onData, onError) {
    stopListening();
    if (!db) {
      onError?.(new Error('Firestore not initialized'));
      return stopListening;
    }

    let products = [];
    let orders = [];
    let customers = [];

    const emit = () => onData({ products, orders, customers });

    const productsUnsub = db
      .collection(FirebaseConfig.collections.products)
      .onSnapshot(
        (snapshot) => {
          products = snapshot.docs
            .map((doc) => ProductUtils.normalize({ id: doc.id, ...doc.data() }))
            .filter(Boolean);
          emit();
        },
        (error) => {
          console.error('[AdminDashboardService] Products listen failed:', error);
          onError?.(error);
        }
      );

    const ordersUnsub = db
      .collection(FirebaseConfig.collections.orders)
      .onSnapshot(
        (snapshot) => {
          orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          emit();
        },
        (error) => {
          console.error('[AdminDashboardService] Orders listen failed:', error);
          onError?.(error);
        }
      );

    const customersUnsub = db
      .collection(FirebaseConfig.collections.users)
      .onSnapshot(
        (snapshot) => {
          customers = snapshot.docs.map((doc) => {
            const data = doc.data() || {};
            return {
              id: doc.id,
              displayName: data.displayName || '',
              email: data.email || '',
              phone: data.phone || '',
              accountStatus: data.accountStatus || 'active',
              createdAt: data.createdAt || null,
            };
          });
          emit();
        },
        (error) => {
          console.error('[AdminDashboardService] Customers listen failed:', error);
          onError?.(error);
        }
      );

    unsubs = [productsUnsub, ordersUnsub, customersUnsub];
    return stopListening;
  }

  function stopListening() {
    unsubs.forEach((fn) => {
      try {
        fn?.();
      } catch (_) {
        /* ignore */
      }
    });
    unsubs = [];
  }

  /**
   * Build full dashboard analytics snapshot.
   * @param {{ products: Array, orders: Array, customers: Array }} data
   */
  function buildAnalytics({ products, orders, customers }) {
    const now = new Date();
    const todayMs = startOfDay(now);
    const weekMs = startOfWeek(now);
    const monthMs = startOfMonth(now);
    const yearMs = startOfYear(now);

    const activeCustomers = customers.filter((c) => c.accountStatus !== 'deleted');
    const revenueOrders = orders.filter(isRevenueOrder);

    const statusCounts = Object.fromEntries(STATUS_KEYS.map((s) => [s, 0]));
    orders.forEach((o) => {
      const status = o.orderStatus || 'placed';
      if (statusCounts[status] != null) statusCounts[status] += 1;
    });

    const pendingOrders = orders.filter((o) =>
      PENDING_STATUSES.includes(o.orderStatus || 'placed')
    ).length;

    const outOfStock = products.filter((p) => Number(p.stock) <= 0 || p.inStock === false);
    const lowStock = products
      .filter((p) => Number(p.stock) <= 5)
      .sort((a, b) => Number(a.stock) - Number(b.stock));

    const productSales = {};
    revenueOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const id = item.productId || item.name;
        if (!id) return;
        if (!productSales[id]) {
          productSales[id] = {
            productId: item.productId || null,
            name: item.name || 'Product',
            image: item.image || '',
            unitsSold: 0,
            revenue: 0,
          };
        }
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        productSales[id].unitsSold += qty;
        productSales[id].revenue += qty * price;
        if (item.name) productSales[id].name = item.name;
        if (item.image) productSales[id].image = item.image;
      });
    });

    const productById = Object.fromEntries(products.map((p) => [p.id, p]));

    const bestSelling = Object.values(productSales)
      .map((row) => {
        const product = row.productId ? productById[row.productId] : null;
        return {
          ...row,
          name: product?.name || row.name,
          image: product?.image || row.image,
          rating: product ? Number(product.rating) || 0 : 0,
        };
      })
      .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
      .slice(0, 10);

    const categoryMap = Object.fromEntries(
      (typeof CATEGORIES !== 'undefined' ? CATEGORIES : []).map((c) => [c.id, c.name])
    );

    const categoryStats = {};
    products.forEach((p) => {
      const key = p.category || 'uncategorized';
      if (!categoryStats[key]) {
        categoryStats[key] = {
          categoryId: key,
          category: categoryMap[key] || key,
          productsCount: 0,
          unitsSold: 0,
          revenue: 0,
        };
      }
      categoryStats[key].productsCount += 1;
    });

    Object.values(productSales).forEach((row) => {
      const product = row.productId ? productById[row.productId] : null;
      const key = product?.category || 'uncategorized';
      if (!categoryStats[key]) {
        categoryStats[key] = {
          categoryId: key,
          category: categoryMap[key] || key,
          productsCount: 0,
          unitsSold: 0,
          revenue: 0,
        };
      }
      categoryStats[key].unitsSold += row.unitsSold;
      categoryStats[key].revenue += row.revenue;
    });

    const categorySummary = Object.values(categoryStats).sort(
      (a, b) => b.revenue - a.revenue || b.productsCount - a.productsCount
    );

    const customerPurchases = {};
    revenueOrders.forEach((order) => {
      const uid = order.userId;
      if (!uid) return;
      if (!customerPurchases[uid]) {
        customerPurchases[uid] = {
          userId: uid,
          name: order.customer?.fullName || '',
          email: order.customer?.email || '',
          orders: 0,
          totalPurchase: 0,
          lastOrderAt: null,
        };
      }
      const bucket = customerPurchases[uid];
      bucket.orders += 1;
      bucket.totalPurchase += Number(order.grandTotal) || 0;
      const ms = getTimestampMs(order.createdAt);
      if (ms >= getTimestampMs(bucket.lastOrderAt)) {
        bucket.lastOrderAt = order.createdAt;
      }
      if (order.customer?.fullName) bucket.name = order.customer.fullName;
      if (order.customer?.email) bucket.email = order.customer.email;
    });

    activeCustomers.forEach((c) => {
      if (!customerPurchases[c.id]) return;
      if (c.displayName) customerPurchases[c.id].name = c.displayName;
      if (c.email) customerPurchases[c.id].email = c.email;
    });

    const topCustomers = Object.values(customerPurchases)
      .sort((a, b) => b.totalPurchase - a.totalPurchase || b.orders - a.orders)
      .slice(0, 10);

    const recentOrders = orders
      .slice()
      .sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt))
      .slice(0, 10);

    const recentCustomers = activeCustomers
      .slice()
      .sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt))
      .slice(0, 10)
      .map((c) => {
        const allOrders = orders.filter((o) => o.userId === c.id);
        return {
          ...c,
          ordersCount: allOrders.length,
        };
      });

    return {
      kpis: {
        totalRevenue: sumRevenue(orders),
        todayRevenue: sumRevenue(orders, todayMs),
        totalOrders: orders.length,
        pendingOrders,
        deliveredOrders: statusCounts.delivered || 0,
        cancelledOrders: statusCounts.cancelled || 0,
        totalCustomers: activeCustomers.length,
        totalProducts: products.length,
        outOfStock: outOfStock.length,
        lowStock: products.filter((p) => Number(p.stock) <= 5).length,
      },
      revenue: {
        today: sumRevenue(orders, todayMs),
        week: sumRevenue(orders, weekMs),
        month: sumRevenue(orders, monthMs),
        year: sumRevenue(orders, yearMs),
        lifetime: sumRevenue(orders),
      },
      statusCounts,
      bestSelling,
      lowStock,
      recentOrders,
      recentCustomers,
      categorySummary,
      topCustomers,
      products,
      orders,
      customers: activeCustomers,
    };
  }

  return {
    init,
    subscribeAll,
    stopListening,
    buildAnalytics,
    getTimestampMs,
    STATUS_KEYS,
  };
})();

if (typeof window !== 'undefined') {
  window.AdminDashboardService = AdminDashboardService;
}
