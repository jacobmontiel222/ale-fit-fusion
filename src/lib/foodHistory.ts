// Food history management
export interface HistoryItem {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  servingSize: number;
  servingUnit: string;
  meal: string;
  addedAt: string;
}

const HISTORY_KEY = 'foodHistory';
const MAX_HISTORY_ITEMS = 50;

export function getFoodHistory(): HistoryItem[] {
  try {
    const history = localStorage.getItem(HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

export function addToHistory(item: Omit<HistoryItem, 'id' | 'addedAt'>): void {
  const history = getFoodHistory();
  
  const newItem: HistoryItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    addedAt: new Date().toISOString(),
  };
  
  // Add to beginning of array (most recent first)
  history.unshift(newItem);
  
  // Keep only the most recent items
  const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);
  
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
