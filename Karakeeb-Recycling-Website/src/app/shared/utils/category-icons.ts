// Category icon mapping utility
export interface CategoryIconConfig {
  icon: string; // SVG path or icon name
  color: string;
}

export const categoryIcons: Record<string, CategoryIconConfig> = {
  'plastic': {
    icon: 'M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z',
    color: 'text-blue-500'
  },
  'paper': {
    icon: 'M448 336V48c0-26.5-21.5-48-48-48H96C69.5 0 48 21.5 48 48v288c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48zM91.9 43.2c.9-.2 1.8-.2 2.7-.2h256c.9 0 1.8 0 2.7.2L352 208H96L91.9 43.2zM416 352H96v-96h320v96z',
    color: 'text-green-500'
  },
  'papers': {
    icon: 'M448 336V48c0-26.5-21.5-48-48-48H96C69.5 0 48 21.5 48 48v288c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48zM91.9 43.2c.9-.2 1.8-.2 2.7-.2h256c.9 0 1.8 0 2.7.2L352 208H96L91.9 43.2zM416 352H96v-96h320v96z',
    color: 'text-green-500'
  },
  'e-waste': {
    icon: 'M448 384H64V128H32v256c0 17.7 14.3 32 32 32h384c17.7 0 32-14.3 32-32V128h-32v256zM96 0C78.3 0 64 14.3 64 32v32h320V32c0-17.7-14.3-32-32-32H96zM320 64H128c-17.7 0-32 14.3-32 32v192c0 17.7 14.3 32 32 32h192c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32z',
    color: 'text-yellow-500'
  },
  'metals': {
    icon: 'M448 0L320 96v192l128-96V0zM192 96L64 0v192l128 96V96zM256 192l-64-48v192l64 48V192z',
    color: 'text-gray-600'
  },
  'cooking-oil': {
    icon: 'M224 136V0h-64v136H64v64h96v136h64V200h96v-64H224z',
    color: 'text-red-500'
  },
  'glass': {
    icon: 'M448 384H64V128H32v256c0 17.7 14.3 32 32 32h384c17.7 0 32-14.3 32-32V128h-32v256z',
    color: 'text-blue-400'
  },
  'kids toys': {
    icon: 'M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z',
    color: 'text-red-500'
  },
  'home appliances': {
    icon: 'M448 384H64V128H32v256c0 17.7 14.3 32 32 32h384c17.7 0 32-14.3 32-32V128h-32v256zM96 0C78.3 0 64 14.3 64 32v32h320V32c0-17.7-14.3-32-32-32H96zM320 64H128c-17.7 0-32 14.3-32 32v192c0 17.7 14.3 32 32 32h192c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32z',
    color: 'text-blue-500'
  },
  'sports equipment': {
    icon: 'M448 336V48c0-26.5-21.5-48-48-48H96C69.5 0 48 21.5 48 48v288c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48z',
    color: 'text-green-500'
  }
};

export function getCategoryIcon(categoryName: string): CategoryIconConfig {
  const normalizedName = categoryName.toLowerCase().trim();
  
  // Try exact match first
  if (categoryIcons[normalizedName]) {
    return categoryIcons[normalizedName];
  }
  
  // Try with spaces replaced by hyphens
  const hyphenated = normalizedName.replace(/\s+/g, '-');
  if (categoryIcons[hyphenated]) {
    return categoryIcons[hyphenated];
  }
  
  // Try with hyphens replaced by spaces
  const spaced = normalizedName.replace(/-/g, ' ');
  if (categoryIcons[spaced]) {
    return categoryIcons[spaced];
  }
  
  // Default fallback
  return {
    icon: 'M448 384H64V128H32v256c0 17.7 14.3 32 32 32h384c17.7 0 32-14.3 32-32V128h-32v256z',
    color: 'text-green-500'
  };
}

