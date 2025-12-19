export const categoryColors: Record<string, string> = {
  'Plastic': 'bg-blue-100 text-blue-800',
  'Paper': 'bg-green-100 text-green-800',
  'E-Waste': 'bg-amber-100 text-amber-800',
  'Glass': 'bg-indigo-100 text-indigo-800',
};

export function getCategoryColor(categoryName: string): string {
  return categoryColors[categoryName] || 'bg-gray-100 text-gray-800';
}

