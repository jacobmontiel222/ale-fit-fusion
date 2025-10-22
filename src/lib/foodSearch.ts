// Utilidades para búsqueda de alimentos con tolerancia a errores

import { FoodItem, FoodSearchFilters, FoodSearchResult } from '@/types/food';

/**
 * Normaliza un texto removiendo acentos y convirtiéndolo a minúsculas
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Calcula la distancia de Levenshtein entre dos strings
 * (número de ediciones necesarias para transformar una string en otra)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitución
          matrix[i][j - 1] + 1,     // inserción
          matrix[i - 1][j] + 1      // eliminación
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calcula el score de similitud entre dos strings (0-1)
 */
function similarityScore(str1: string, str2: string): number {
  const normalized1 = normalizeText(str1);
  const normalized2 = normalizeText(str2);
  
  // Coincidencia exacta
  if (normalized1 === normalized2) return 1;
  
  // Contiene la búsqueda
  if (normalized2.includes(normalized1)) {
    return 0.8 - (normalized2.length - normalized1.length) * 0.01;
  }
  
  // Distancia de Levenshtein
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  const similarity = 1 - distance / maxLength;
  
  return Math.max(0, similarity);
}

/**
 * Busca alimentos según los filtros aplicados
 */
export function searchFoods(
  foods: FoodItem[],
  filters: FoodSearchFilters,
  minRelevance: number = 0.3
): FoodSearchResult[] {
  const results: FoodSearchResult[] = [];
  
  const normalizedQuery = normalizeText(filters.query);

  for (const food of foods) {
    // Filtrar por categoría
    if (filters.categories.length > 0 && !filters.categories.includes(food.category)) {
      continue;
    }

    // Filtrar por etiquetas
    if (filters.tags.length > 0) {
      const hasAllTags = filters.tags.every(tag => food.tags.includes(tag));
      if (!hasAllTags) continue;
    }

    // Si no hay query de búsqueda, incluir todos los que pasaron los filtros
    if (!filters.query.trim()) {
      results.push({ item: food, relevance: 1 });
      continue;
    }

    // Calcular relevancia basada en coincidencias
    let relevance = 0;

    // Buscar en nombre del alimento
    const nameScore = similarityScore(normalizedQuery, food.name);
    relevance = Math.max(relevance, nameScore);

    // Buscar en marca
    if (food.brand) {
      const brandScore = similarityScore(normalizedQuery, food.brand);
      relevance = Math.max(relevance, brandScore * 0.8);
    }

    // Buscar en términos de búsqueda adicionales
    if (food.searchTerms) {
      for (const term of food.searchTerms) {
        const termScore = similarityScore(normalizedQuery, term);
        relevance = Math.max(relevance, termScore * 0.9);
      }
    }

    // Buscar en categoría
    const categoryScore = similarityScore(normalizedQuery, food.category);
    relevance = Math.max(relevance, categoryScore * 0.6);

    // Solo incluir si supera el umbral mínimo de relevancia
    if (relevance >= minRelevance) {
      results.push({ item: food, relevance });
    }
  }

  // Ordenar por relevancia descendente
  results.sort((a, b) => b.relevance - a.relevance);

  return results;
}

/**
 * Obtiene sugerencias de alimentos similares
 */
export function getSimilarFoods(
  food: FoodItem,
  allFoods: FoodItem[],
  limit: number = 5
): FoodItem[] {
  const similar = allFoods
    .filter(f => f.id !== food.id && f.category === food.category)
    .map(f => ({
      food: f,
      score: similarityScore(food.name, f.name)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.food);

  return similar;
}
