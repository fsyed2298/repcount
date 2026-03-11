import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/constants/theme";
import { WorkoutSession } from "@/types";

interface WorkoutHistoryCardProps {
  workout: WorkoutSession;
  onPress?: () => void;
  onDelete?: () => void;
}

function kgToLbs(kg: number): number {
  return Math.round(kg * 2.2046 * 10) / 10;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(startedAt: string, completedAt?: string | null): string {
  if (!completedAt) return "In progress";
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const mins = Math.round((end - start) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function WorkoutHistoryCard({ workout, onPress, onDelete }: WorkoutHistoryCardProps) {
  const { theme, accent } = useTheme();
  const totalVolume = workout.totalVolume ??
    workout.sets.reduce((sum, s) => sum + s.reps * s.weightKg, 0);
  const totalReps = workout.sets.reduce((sum, s) => sum + s.reps, 0);
  const totalSets = workout.sets.length;
  const displayVolume = workout.weightUnit === "lbs" ? kgToLbs(totalVolume) : Math.round(totalVolume);
  const isCompleted = !!workout.completedAt;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.exerciseName, { color: theme.text, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
            {workout.exerciseName}
          </Text>
          <Text style={[styles.date, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {formatDate(workout.startedAt)}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {isCompleted ? (
            <View style={[styles.completedBadge, { backgroundColor: `rgba(52, 199, 89, 0.12)` }]}>
              <Ionicons name="checkmark-circle" size={12} color={theme.success} />
              <Text style={[styles.completedText, { color: theme.success, fontFamily: "Inter_500Medium" }]}>Done</Text>
            </View>
          ) : (
            <View style={[styles.completedBadge, { backgroundColor: `${accent}18` }]}>
              <Ionicons name="time-outline" size={12} color={accent} />
              <Text style={[styles.completedText, { color: accent, fontFamily: "Inter_500Medium" }]}>Active</Text>
            </View>
          )}
          {onDelete && (
            <Pressable
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                onDelete();
              }}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={16} color={theme.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {totalSets}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>
            sets
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {totalReps}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>
            reps
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {displayVolume > 0 ? displayVolume.toLocaleString() : "—"}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>
            {workout.weightUnit} vol
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {formatDuration(workout.startedAt, workout.completedAt)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>
            time
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  headerLeft: {
    flex: 1,
    gap: 3,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exerciseName: {
    fontSize: 17,
  },
  date: {
    fontSize: 13,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  completedText: {
    fontSize: 11,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  stat: {
    alignItems: "center",
    gap: 2,
    flex: 1,
  },
  statValue: {
    fontSize: 16,
  },
  statLabel: {
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
});
