// ─── Daily Fitness Score — TypeScript reference implementation ────────────────
//
// This mirrors the SQL function recalculate_daily_fitness_score() exactly.
// The authoritative calculation runs server-side; this file is used for
// client-side previews and unit testing.
//
// Final formula (100 points total):
//   caloriesScore  * 0.30  →  30 pts
//   proteinScore   * 0.20  →  20 pts
//   trainingScore  * 0.25  →  25 pts
//   stepsScore     * 0.15  →  15 pts
//   consistency    * 0.10  →  10 pts

// ─── Calorie subscore ────────────────────────────────────────────────────────
// deviation = |consumed − target| / target
// ≤ 10 %  → 100  |  ≥ 40 % → 0  |  between → linear
export function calculateCalorieSubscore(
  consumed: number,
  goal: number,
): number {
  if (goal <= 0 || consumed === 0) return 0;
  const deviation = Math.abs(consumed - goal) / goal;
  if (deviation <= 0.1) return 100;
  if (deviation >= 0.4) return 0;
  return Math.round((100 * (0.4 - deviation)) / 0.3);
}

// ─── Protein subscore ────────────────────────────────────────────────────────
// Simple progress toward goal, clamped to 100.
export function calculateProteinSubscore(
  consumed: number,
  goal: number,
): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((consumed / goal) * 100));
}

// ─── Training subscore ───────────────────────────────────────────────────────
// Any workout logged today → 100.  None → 0.
// Designed to be extended later (e.g. completed vs. planned).
export function calculateTrainingSubscore(workoutLogged: boolean): number {
  return workoutLogged ? 100 : 0;
}

// ─── Steps / Activity subscore ───────────────────────────────────────────────
export function calculateStepsSubscore(steps: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((steps / goal) * 100));
}

// ─── Consistency subscore ────────────────────────────────────────────────────
// 5 equal-weight checks: food, workout, weight, water, steps.
export function calculateConsistencySubscore(checks: {
  hasFoodLog: boolean;
  hasWorkoutLog: boolean;
  hasWeightLog: boolean;
  hasWaterLog: boolean;
  hasStepsLog: boolean;
}): number {
  const done = Object.values(checks).filter(Boolean).length;
  return Math.round((done / 5) * 100);
}

// ─── Full daily score ─────────────────────────────────────────────────────────

export interface DailyFitnessInput {
  caloriesConsumed: number;
  caloriesGoal: number;
  proteinConsumed: number;
  proteinGoal: number;
  workoutLogged: boolean;
  stepsCount: number;
  stepsGoal: number;
  hasFoodLog: boolean;
  hasWorkoutLog: boolean;
  hasWeightLog: boolean;
  hasWaterLog: boolean;
  hasStepsLog: boolean;
}

export interface DailyScoreBreakdown {
  calorieSubscore: number;     // 0–100
  proteinSubscore: number;     // 0–100
  nutritionSubscore: number;   // 0–100  (0.6*cal + 0.4*prot)
  trainingSubscore: number;    // 0–100
  stepsSubscore: number;       // 0–100
  consistencySubscore: number; // 0–100
  finalScore: number;          // 0–100
}

export function calculateDailyFitnessScore(
  input: DailyFitnessInput,
): DailyScoreBreakdown {
  const calorieSubscore = calculateCalorieSubscore(
    input.caloriesConsumed,
    input.caloriesGoal,
  );
  const proteinSubscore = calculateProteinSubscore(
    input.proteinConsumed,
    input.proteinGoal,
  );
  const nutritionSubscore = Math.round(
    calorieSubscore * 0.6 + proteinSubscore * 0.4,
  );
  const trainingSubscore = calculateTrainingSubscore(input.workoutLogged);
  const stepsSubscore = calculateStepsSubscore(input.stepsCount, input.stepsGoal);
  const consistencySubscore = calculateConsistencySubscore({
    hasFoodLog:    input.hasFoodLog,
    hasWorkoutLog: input.hasWorkoutLog,
    hasWeightLog:  input.hasWeightLog,
    hasWaterLog:   input.hasWaterLog,
    hasStepsLog:   input.hasStepsLog,
  });

  const finalScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        calorieSubscore     * 0.30 +
        proteinSubscore     * 0.20 +
        trainingSubscore    * 0.25 +
        stepsSubscore       * 0.15 +
        consistencySubscore * 0.10,
      ),
    ),
  );

  return {
    calorieSubscore,
    proteinSubscore,
    nutritionSubscore,
    trainingSubscore,
    stepsSubscore,
    consistencySubscore,
    finalScore,
  };
}
