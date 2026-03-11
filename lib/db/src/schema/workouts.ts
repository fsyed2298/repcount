import { pgTable, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workoutsTable = pgTable("workouts", {
  id: text("id").primaryKey(),
  exerciseId: text("exercise_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  detectedWeightKg: real("detected_weight_kg"),
  weightUnit: text("weight_unit").notNull().default("lbs"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  totalVolume: real("total_volume"),
  notes: text("notes"),
});

export const workoutSetsTable = pgTable("workout_sets", {
  id: text("id").primaryKey(),
  workoutId: text("workout_id").notNull().references(() => workoutsTable.id, { onDelete: "cascade" }),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps").notNull(),
  weightKg: real("weight_kg").notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export const insertWorkoutSchema = createInsertSchema(workoutsTable);
export const insertWorkoutSetSchema = createInsertSchema(workoutSetsTable);

export type Workout = typeof workoutsTable.$inferSelect;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type WorkoutSet = typeof workoutSetsTable.$inferSelect;
export type InsertWorkoutSet = z.infer<typeof insertWorkoutSetSchema>;
