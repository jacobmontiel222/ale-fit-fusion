// Legacy local data export/import — used by Profile.tsx for JSON backup feature

interface WeightEntry {
  date: string;
  kg: number;
}

interface StepsEntry {
  date: string;
  steps: number;
}

interface Profile {
  name?: string;
  weightUnit: 'kg' | 'lb';
  height?: number;
  kcalPerStep?: number;
}

interface Goals {
  dailyCalories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface AppState {
  profile: Profile;
  goals: Goals;
  analyticsWeight: WeightEntry[];
  analyticsSteps: StepsEntry[];
  meals: any[];
  recipes: any[];
}

// Export all local data as JSON
export function exportJSON(): string {
  return JSON.stringify({
    profile: localStorage.getItem('profile') ? JSON.parse(localStorage.getItem('profile')!) : {},
    goals: localStorage.getItem('goals') ? JSON.parse(localStorage.getItem('goals')!) : {},
    analyticsWeight: localStorage.getItem('analyticsWeight') ? JSON.parse(localStorage.getItem('analyticsWeight')!) : [],
    analyticsSteps: localStorage.getItem('analyticsSteps') ? JSON.parse(localStorage.getItem('analyticsSteps')!) : [],
    meals: [],
    recipes: [],
  }, null, 2);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidWeightEntry(e: unknown): e is WeightEntry {
  if (!e || typeof e !== 'object') return false;
  const { date, kg } = e as Record<string, unknown>;
  return typeof date === 'string' && ISO_DATE_RE.test(date) &&
    typeof kg === 'number' && kg > 0 && kg < 500;
}

function isValidStepsEntry(e: unknown): e is StepsEntry {
  if (!e || typeof e !== 'object') return false;
  const { date, steps } = e as Record<string, unknown>;
  return typeof date === 'string' && ISO_DATE_RE.test(date) &&
    typeof steps === 'number' && steps >= 0 && steps < 200000;
}

function isValidProfile(p: unknown): p is Partial<Profile> {
  if (!p || typeof p !== 'object') return false;
  const { weightUnit, height, kcalPerStep } = p as Record<string, unknown>;
  if (weightUnit !== undefined && weightUnit !== 'kg' && weightUnit !== 'lb') return false;
  if (height !== undefined && (typeof height !== 'number' || height < 50 || height > 300)) return false;
  if (kcalPerStep !== undefined && (typeof kcalPerStep !== 'number' || kcalPerStep < 0 || kcalPerStep > 1)) return false;
  return true;
}

function isValidGoals(g: unknown): g is Partial<Goals> {
  if (!g || typeof g !== 'object') return false;
  const { dailyCalories, protein, fat, carbs } = g as Record<string, unknown>;
  if (dailyCalories !== undefined && (typeof dailyCalories !== 'number' || dailyCalories < 0 || dailyCalories > 20000)) return false;
  if (protein !== undefined && (typeof protein !== 'number' || protein < 0 || protein > 2000)) return false;
  if (fat !== undefined && (typeof fat !== 'number' || fat < 0 || fat > 2000)) return false;
  if (carbs !== undefined && (typeof carbs !== 'number' || carbs < 0 || carbs > 2000)) return false;
  return true;
}

// Import and merge JSON data
export function importJSON(jsonString: string): boolean {
  try {
    const raw: unknown = JSON.parse(jsonString);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const imported = raw as Record<string, unknown>;

    if (imported.analyticsWeight !== undefined) {
      if (!Array.isArray(imported.analyticsWeight)) return false;
      const validEntries = imported.analyticsWeight.filter(isValidWeightEntry);
      const current: WeightEntry[] = localStorage.getItem('analyticsWeight')
        ? JSON.parse(localStorage.getItem('analyticsWeight')!)
        : [];
      const merged = [...current];
      validEntries.forEach(entry => {
        const index = merged.findIndex(e => e.date === entry.date);
        if (index >= 0) merged[index] = entry;
        else merged.push(entry);
      });
      merged.sort((a, b) => a.date.localeCompare(b.date));
      localStorage.setItem('analyticsWeight', JSON.stringify(merged));
    }

    if (imported.analyticsSteps !== undefined) {
      if (!Array.isArray(imported.analyticsSteps)) return false;
      const validEntries = imported.analyticsSteps.filter(isValidStepsEntry);
      const current: StepsEntry[] = localStorage.getItem('analyticsSteps')
        ? JSON.parse(localStorage.getItem('analyticsSteps')!)
        : [];
      const merged = [...current];
      validEntries.forEach(entry => {
        const index = merged.findIndex(e => e.date === entry.date);
        if (index >= 0) merged[index] = entry;
        else merged.push(entry);
      });
      merged.sort((a, b) => a.date.localeCompare(b.date));
      localStorage.setItem('analyticsSteps', JSON.stringify(merged));
    }

    if (imported.profile !== undefined) {
      if (!isValidProfile(imported.profile)) return false;
      const current = localStorage.getItem('profile') ? JSON.parse(localStorage.getItem('profile')!) : {};
      localStorage.setItem('profile', JSON.stringify({ ...current, ...imported.profile }));
    }

    if (imported.goals !== undefined) {
      if (!isValidGoals(imported.goals)) return false;
      const current = localStorage.getItem('goals') ? JSON.parse(localStorage.getItem('goals')!) : {};
      localStorage.setItem('goals', JSON.stringify({ ...current, ...imported.goals }));
    }

    return true;
  } catch {
    return false;
  }
}
