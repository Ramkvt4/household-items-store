/**
 * Static category definitions (used by storefront and admin)
 */

const CATEGORIES = [
  { id: 'refrigerators', name: 'Refrigerators', icon: '❄️' },
  { id: 'washing-machines', name: 'Washing Machines', icon: '🧺' },
  { id: 'air-conditioners', name: 'Air Conditioners', icon: '🌬️' },
  { id: 'microwaves', name: 'Microwaves', icon: '📻' },
  { id: 'televisions', name: 'Televisions', icon: '📺' },
  { id: 'kitchen', name: 'Kitchen Appliances', icon: '🍳' },
  { id: 'water-purifiers', name: 'Water Purifiers', icon: '💧' },
  { id: 'vacuum-cleaners', name: 'Vacuum Cleaners', icon: '🧹' },
];

if (typeof window !== 'undefined') {
  window.CATEGORIES = CATEGORIES;
}
