import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/constants/theme";
import { useWorkout } from "@/context/workout";

function kgToLbs(kg: number) {
  return Math.round(kg * 2.2046 * 10) / 10;
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

function StatCard({ label, value, sub, icon, color }: StatCardProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
        {label}
      </Text>
      {sub && (
        <Text style={[styles.statSub, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>
          {sub}
        </Text>
      )}
    </View>
  );
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, accent } = useTheme();
  const { workouts, fetchWorkouts } = useWorkout();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [volumeUnit, setVolumeUnit] = useState<"lbs" | "kg">("lbs");

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const stats = useMemo(() => {
    const completed = workouts.filter(w => w.completedAt);
    const allSets = workouts.flatMap(w => w.sets);
    const totalReps = allSets.reduce((s, set) => s + set.reps, 0);
    const totalVolumeKg = allSets.reduce((s, set) => s + set.reps * set.weightKg, 0);
    const avgRepsPerSet = allSets.length > 0 ? Math.round(totalReps / allSets.length) : 0;

    const exerciseCounts: Record<string, number> = {};
    for (const w of workouts) {
      exerciseCounts[w.exerciseName] = (exerciseCounts[w.exerciseName] ?? 0) + 1;
    }
    const topExercise = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1])[0];

    const avgDuration =
      completed.length > 0
        ? completed.reduce((sum, w) => {
            const dur = new Date(w.completedAt!).getTime() - new Date(w.startedAt).getTime();
            return sum + dur;
          }, 0) / completed.length / 60000
        : 0;

    return {
      totalWorkouts: workouts.length,
      completedWorkouts: completed.length,
      totalSets: allSets.length,
      totalReps,
      totalVolumeKg,
      avgRepsPerSet,
      topExercise: topExercise ? topExercise[0] : null,
      topExerciseCount: topExercise ? topExercise[1] : 0,
      avgDuration: Math.round(avgDuration),
    };
  }, [workouts]);

  const displayVolumeKg = Math.round(stats.totalVolumeKg).toLocaleString();
  const displayVolumeLbs = kgToLbs(stats.totalVolumeKg).toLocaleString();
  const displayVolume = volumeUnit === "lbs" ? displayVolumeLbs : displayVolumeKg;

  const toggleVolumeUnit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVolumeUnit(u => u === "lbs" ? "kg" : "lbs");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            Stats
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Your progress overview
          </Text>
        </View>

        {workouts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={52} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              No data yet
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Complete workouts to see your progress stats
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              <StatCard
                label="Workouts"
                value={stats.totalWorkouts}
                icon="barbell-outline"
                color={accent}
              />
              <StatCard
                label="Sets Done"
                value={stats.totalSets}
                icon="layers-outline"
                color="#4ECDC4"
              />
              <StatCard
                label="Total Reps"
                value={stats.totalReps.toLocaleString()}
                icon="repeat-outline"
                color="#FF9F0A"
              />

              {/* Volume card with inline toggle */}
              <Pressable
                onPress={toggleVolumeUnit}
                style={[styles.statCard, styles.volumeCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={styles.volumeCardTop}>
                  <View style={[styles.statIcon, { backgroundColor: `rgba(69,183,209,0.12)` }]}>
                    <Ionicons name="trending-up-outline" size={22} color="#45B7D1" />
                  </View>
                  <View style={[styles.unitToggle, { backgroundColor: theme.backgroundTertiary }]}>
                    <View style={[
                      styles.unitTogglePill,
                      { backgroundColor: volumeUnit === "lbs" ? accent : "transparent" }
                    ]}>
                      <Text style={[styles.unitToggleText, {
                        color: volumeUnit === "lbs" ? "#fff" : theme.textTertiary,
                        fontFamily: "Inter_600SemiBold"
                      }]}>lbs</Text>
                    </View>
                    <View style={[
                      styles.unitTogglePill,
                      { backgroundColor: volumeUnit === "kg" ? accent : "transparent" }
                    ]}>
                      <Text style={[styles.unitToggleText, {
                        color: volumeUnit === "kg" ? "#fff" : theme.textTertiary,
                        fontFamily: "Inter_600SemiBold"
                      }]}>kg</Text>
                    </View>
                  </View>
                </View>
                <Text style={[styles.statValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                  {displayVolume}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  Volume
                </Text>
                <Text style={[styles.statSub, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>
                  {volumeUnit === "lbs"
                    ? `= ${displayVolumeKg} kg`
                    : `= ${displayVolumeLbs} lbs`}
                </Text>
              </Pressable>

              <StatCard
                label="Avg Reps/Set"
                value={stats.avgRepsPerSet}
                icon="analytics-outline"
                color="#96CEB4"
              />
              <StatCard
                label="Avg Duration"
                value={stats.avgDuration > 0 ? `${stats.avgDuration}m` : "—"}
                icon="time-outline"
                color="#FF6B6B"
              />
            </View>

            {stats.topExercise && (
              <View style={[styles.topExercise, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="trophy-outline" size={20} color="#FF9F0A" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.topExLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    Most practiced
                  </Text>
                  <Text style={[styles.topExName, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                    {stats.topExercise}
                  </Text>
                </View>
                <View style={[styles.topExBadge, { backgroundColor: `${accent}18` }]}>
                  <Text style={[styles.topExCount, { color: accent, fontFamily: "Inter_600SemiBold" }]}>
                    {stats.topExerciseCount}×
                  </Text>
                </View>
              </View>
            )}

            <View style={[styles.healthNote, { backgroundColor: `rgba(52, 199, 89, 0.08)`, borderColor: "rgba(52,199,89,0.2)" }]}>
              <Ionicons name="heart" size={18} color="#34C759" />
              <Text style={[styles.healthNoteText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                Workout data integrates with Apple Health on your iPhone and Apple Watch for rep tracking
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { marginBottom: 24, gap: 4 },
  title: { fontSize: 32 },
  subtitle: { fontSize: 14 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: "47%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  volumeCard: {
    gap: 6,
  },
  volumeCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  unitToggle: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  unitTogglePill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  unitToggleText: { fontSize: 11 },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 26 },
  statLabel: { fontSize: 13 },
  statSub: { fontSize: 11 },
  topExercise: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  topExLabel: { fontSize: 12 },
  topExName: { fontSize: 17 },
  topExBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  topExCount: { fontSize: 15 },
  healthNote: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  healthNoteText: { flex: 1, fontSize: 13, lineHeight: 19 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, marginTop: 8 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
