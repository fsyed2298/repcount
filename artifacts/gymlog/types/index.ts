export interface Exercise {
  id: string;
  name: string;
  category: "chest" | "back" | "shoulders" | "arms" | "legs" | "core" | "full_body";
  equipment: "dumbbell" | "barbell" | "machine" | "cable" | "bodyweight";
  muscleGroup: string;
  sfSymbol?: string;
}

export interface WorkoutSet {
  id: string;
  workoutId: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  completedAt: string;
}

export interface WorkoutSession {
  id: string;
  exerciseId: string;
  exerciseName: string;
  detectedWeightKg?: number | null;
  weightUnit: "kg" | "lbs";
  startedAt: string;
  completedAt?: string | null;
  sets: WorkoutSet[];
  totalVolume?: number | null;
  notes?: string | null;
}

export interface DetectWeightResult {
  detected: boolean;
  weightKg?: number | null;
  weightLbs?: number | null;
  confidence?: "high" | "medium" | "low" | null;
  description?: string | null;
}

export type WeightUnit = "kg" | "lbs";
