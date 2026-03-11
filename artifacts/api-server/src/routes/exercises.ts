import { Router, type IRouter } from "express";

const router: IRouter = Router();

const EXERCISES = [
  // Chest
  { id: "bench-press", name: "Bench Press", category: "chest", equipment: "barbell", muscleGroup: "Pectorals", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "dumbbell-press", name: "Dumbbell Press", category: "chest", equipment: "dumbbell", muscleGroup: "Pectorals", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "incline-press", name: "Incline Press", category: "chest", equipment: "dumbbell", muscleGroup: "Upper Chest", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "chest-fly", name: "Chest Fly", category: "chest", equipment: "dumbbell", muscleGroup: "Pectorals", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "push-ups", name: "Push Ups", category: "chest", equipment: "bodyweight", muscleGroup: "Pectorals", sfSymbol: "figure.strengthtraining.functional" },

  // Back
  { id: "pull-ups", name: "Pull Ups", category: "back", equipment: "bodyweight", muscleGroup: "Latissimus Dorsi", sfSymbol: "figure.pull.open" },
  { id: "barbell-row", name: "Barbell Row", category: "back", equipment: "barbell", muscleGroup: "Latissimus Dorsi", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "dumbbell-row", name: "Dumbbell Row", category: "back", equipment: "dumbbell", muscleGroup: "Latissimus Dorsi", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "lat-pulldown", name: "Lat Pulldown", category: "back", equipment: "cable", muscleGroup: "Latissimus Dorsi", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "deadlift", name: "Deadlift", category: "back", equipment: "barbell", muscleGroup: "Posterior Chain", sfSymbol: "figure.strengthtraining.traditional" },

  // Shoulders
  { id: "overhead-press", name: "Overhead Press", category: "shoulders", equipment: "barbell", muscleGroup: "Deltoids", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "dumbbell-shoulder-press", name: "Shoulder Press", category: "shoulders", equipment: "dumbbell", muscleGroup: "Deltoids", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "lateral-raise", name: "Lateral Raise", category: "shoulders", equipment: "dumbbell", muscleGroup: "Lateral Deltoid", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "front-raise", name: "Front Raise", category: "shoulders", equipment: "dumbbell", muscleGroup: "Anterior Deltoid", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "face-pull", name: "Face Pull", category: "shoulders", equipment: "cable", muscleGroup: "Rear Deltoid", sfSymbol: "figure.strengthtraining.traditional" },

  // Arms
  { id: "bicep-curl", name: "Bicep Curl", category: "arms", equipment: "dumbbell", muscleGroup: "Biceps", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "hammer-curl", name: "Hammer Curl", category: "arms", equipment: "dumbbell", muscleGroup: "Brachialis", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "barbell-curl", name: "Barbell Curl", category: "arms", equipment: "barbell", muscleGroup: "Biceps", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "tricep-pushdown", name: "Tricep Pushdown", category: "arms", equipment: "cable", muscleGroup: "Triceps", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "skull-crushers", name: "Skull Crushers", category: "arms", equipment: "barbell", muscleGroup: "Triceps", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "dips", name: "Dips", category: "arms", equipment: "bodyweight", muscleGroup: "Triceps", sfSymbol: "figure.strengthtraining.functional" },

  // Legs
  { id: "squat", name: "Squat", category: "legs", equipment: "barbell", muscleGroup: "Quadriceps", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "leg-press", name: "Leg Press", category: "legs", equipment: "machine", muscleGroup: "Quadriceps", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "lunges", name: "Lunges", category: "legs", equipment: "dumbbell", muscleGroup: "Quadriceps", sfSymbol: "figure.walk" },
  { id: "leg-curl", name: "Leg Curl", category: "legs", equipment: "machine", muscleGroup: "Hamstrings", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "leg-extension", name: "Leg Extension", category: "legs", equipment: "machine", muscleGroup: "Quadriceps", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "calf-raise", name: "Calf Raise", category: "legs", equipment: "machine", muscleGroup: "Calves", sfSymbol: "figure.strengthtraining.traditional" },
  { id: "romanian-deadlift", name: "Romanian Deadlift", category: "legs", equipment: "barbell", muscleGroup: "Hamstrings", sfSymbol: "figure.strengthtraining.traditional" },

  // Core
  { id: "plank", name: "Plank", category: "core", equipment: "bodyweight", muscleGroup: "Core", sfSymbol: "figure.core.training" },
  { id: "crunches", name: "Crunches", category: "core", equipment: "bodyweight", muscleGroup: "Rectus Abdominis", sfSymbol: "figure.core.training" },
  { id: "russian-twist", name: "Russian Twist", category: "core", equipment: "dumbbell", muscleGroup: "Obliques", sfSymbol: "figure.core.training" },
  { id: "cable-crunch", name: "Cable Crunch", category: "core", equipment: "cable", muscleGroup: "Rectus Abdominis", sfSymbol: "figure.core.training" },
];

router.get("/exercises", (_req, res) => {
  res.json({ exercises: EXERCISES });
});

export default router;
export { EXERCISES };
