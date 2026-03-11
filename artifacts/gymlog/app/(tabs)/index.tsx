import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/constants/theme";
import { useWorkout } from "@/context/workout";
import { WorkoutHistoryCard } from "@/components/ui/WorkoutHistoryCard";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme, accent } = useTheme();
  const { workouts, fetchWorkouts, deleteWorkout, activeWorkout, isLoading } = useWorkout();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchWorkouts();
  }, []);

  useEffect(() => {
    if (activeWorkout) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [activeWorkout]);

  const recentWorkouts = workouts.slice(0, 5);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Ready to lift?
            </Text>
            <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              RepCount
            </Text>
          </View>
          <View style={[styles.logoContainer, { backgroundColor: `${accent}18` }]}>
            <Ionicons name="barbell" size={26} color={accent} />
          </View>
        </View>

        {/* Active Workout Banner */}
        {activeWorkout && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Pressable
              style={[styles.activeBanner, { backgroundColor: accent }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/workout-active");
              }}
            >
              <View style={styles.activeBannerLeft}>
                <View style={styles.pulseDot} />
                <View>
                  <Text style={[styles.activeBannerTitle, { fontFamily: "Inter_700Bold" }]}>
                    Workout in progress
                  </Text>
                  <Text style={[styles.activeBannerSub, { fontFamily: "Inter_400Regular" }]}>
                    {activeWorkout.exerciseName} · {activeWorkout.sets.length} sets
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
            </Pressable>
          </Animated.View>
        )}

        {/* Start Workout Button */}
        {!activeWorkout && (
          <Pressable
            style={({ pressed }) => [
              styles.startButton,
              { backgroundColor: accent, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/camera");
            }}
          >
            <View style={styles.startButtonInner}>
              <View style={styles.startIconRow}>
                <View style={[styles.startIconCircle, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <Ionicons name="camera" size={28} color="#FFFFFF" />
                </View>
                <View style={[styles.startIconCircle, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <Ionicons name="barbell" size={28} color="#FFFFFF" />
                </View>
              </View>
              <Text style={[styles.startButtonTitle, { fontFamily: "Inter_700Bold" }]}>
                Start Workout
              </Text>
              <Text style={[styles.startButtonSub, { fontFamily: "Inter_400Regular" }]}>
                Scan weight · Detect exercise · Track reps
              </Text>
            </View>
          </Pressable>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable
            style={({ pressed }) => [
              styles.quickAction,
              { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/exercise-select");
            }}
          >
            <Ionicons name="list" size={22} color={accent} />
            <Text style={[styles.quickActionText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
              Browse{"\n"}Exercises
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.quickAction,
              { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/history");
            }}
          >
            <Ionicons name="time" size={22} color="#4ECDC4" />
            <Text style={[styles.quickActionText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
              Workout{"\n"}History
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.quickAction,
              { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/stats");
            }}
          >
            <Ionicons name="bar-chart" size={22} color="#FF9F0A" />
            <Text style={[styles.quickActionText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
              Progress{"\n"}Stats
            </Text>
          </Pressable>
        </View>

        {/* Recent Workouts */}
        {recentWorkouts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                Recent
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/history")}>
                <Text style={[styles.seeAll, { color: accent, fontFamily: "Inter_500Medium" }]}>
                  See all
                </Text>
              </Pressable>
            </View>
            {recentWorkouts.map(workout => (
              <WorkoutHistoryCard
                key={workout.id}
                workout={workout}
                onDelete={() => deleteWorkout(workout.id)}
              />
            ))}
          </View>
        )}

        {workouts.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              No workouts yet
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Tap "Start Workout" to scan a weight{"\n"}and begin tracking
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: { fontSize: 14, marginBottom: 2 },
  title: { fontSize: 32 },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  activeBanner: {
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  activeBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  activeBannerTitle: { color: "#fff", fontSize: 15 },
  activeBannerSub: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  startButton: {
    borderRadius: 22,
    marginBottom: 20,
    overflow: "hidden",
  },
  startButtonInner: {
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  startIconRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  startIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonTitle: { color: "#fff", fontSize: 22 },
  startButtonSub: { color: "rgba(255,255,255,0.75)", fontSize: 14, textAlign: "center" },
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  quickAction: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    alignItems: "flex-start",
  },
  quickActionText: { fontSize: 13, lineHeight: 18 },
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 20 },
  seeAll: { fontSize: 14 },
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, marginTop: 8 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
