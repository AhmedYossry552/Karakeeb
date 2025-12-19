import { Category } from '../../../core/types/category.types';

export const STATIC_CATEGORIES: Category[] = [
  {
    _id: '1',
    name: { en: 'papers', ar: 'ورق' },
    categoryName: { en: 'papers', ar: 'ورق' },
    image: '/paper.jpg',
    points: 8,
    quantity: 0,
    price: 3,
    items: [],
    displayName: 'papers'
  },
  {
    _id: '2',
    name: { en: 'plastic', ar: 'بلاستيك' },
    categoryName: { en: 'plastic', ar: 'بلاستيك' },
    image: '/plastic.jpg',
    points: 10,
    quantity: 0,
    price: 5,
    items: [],
    displayName: 'plastic'
  },
  {
    _id: '3',
    name: { en: 'cooking-oil', ar: 'زيت الطهي' },
    categoryName: { en: 'cooking-oil', ar: 'زيت الطهي' },
    image: '/oil.jpg',
    points: 12,
    quantity: 0,
    price: 6,
    items: [],
    displayName: 'cooking-oil'
  },
  {
    _id: '4',
    name: { en: 'e-waste', ar: 'نفايات إلكترونية' },
    categoryName: { en: 'e-waste', ar: 'نفايات إلكترونية' },
    image: '/global-recycling.jpg',
    points: 50,
    quantity: 0,
    price: 20,
    items: [],
    displayName: 'e-waste'
  },
  {
    _id: '5',
    name: { en: 'metals', ar: 'معادن' },
    categoryName: { en: 'metals', ar: 'معادن' },
    image: '/global-recycling.jpg',
    points: 15,
    quantity: 0,
    price: 8,
    items: [],
    displayName: 'metals'
  },
  {
    _id: '6',
    name: { en: 'glass', ar: 'زجاج' },
    categoryName: { en: 'glass', ar: 'زجاج' },
    image: '/global-recycling.jpg',
    points: 12,
    quantity: 0,
    price: 6,
    items: [],
    displayName: 'glass'
  },
  {
    _id: '7',
    name: { en: 'kids toys', ar: 'ألعاب أطفال' },
    categoryName: { en: 'kids toys', ar: 'ألعاب أطفال' },
    image: '/global-recycling.jpg',
    points: 20,
    quantity: 0,
    price: 10,
    items: [],
    displayName: 'kids toys'
  },
  {
    _id: '8',
    name: { en: 'home appliances', ar: 'أجهزة منزلية' },
    categoryName: { en: 'home appliances', ar: 'أجهزة منزلية' },
    image: '/global-recycling.jpg',
    points: 30,
    quantity: 0,
    price: 15,
    items: [],
    displayName: 'home appliances'
  },
  {
    _id: '9',
    name: { en: 'sports equipment', ar: 'معدات رياضية' },
    categoryName: { en: 'sports equipment', ar: 'معدات رياضية' },
    image: '/global-recycling.jpg',
    points: 25,
    quantity: 0,
    price: 12,
    items: [],
    displayName: 'sports equipment'
  }
];

// Icon mapping for categories
export const CATEGORY_ICONS: Record<string, string> = {
  'papers': '📄',
  'plastic': '🥤',
  'cooking-oil': '🛢️',
  'e-waste': '💻',
  'metals': '🔩',
  'glass': '🍶',
  'kids toys': '🧸',
  'home appliances': '🏠',
  'sports equipment': '⚽'
};

