import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Accelerometer } from "expo-sensors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/constants/theme";
import { useWorkout } from "@/context/workout";
import { SetRow } from "@/components/ui/SetRow";

function kgToLbs(kg: number) {
  return Math.round(kg * 2.2046 * 10) / 10;
}
function lbsToKg(lbs: number) {
  return Math.round((lbs / 2.2046) * 100) / 100;
}

const ACCEL_THRESHOLD = 1.0;
const MIN_REP_MS = 550;
const WINDOW_SIZE = 15;

export default function WorkoutActiveScreen() {
  const insets = useSafeAreaInsets();
  const { theme, accent } = useTheme();
  const { activeWorkout, addSet, completeWorkout, weightUnit } = useWorkout();

  const [targetReps, setTargetReps] = useState(10);
  const [weight, setWeight] = useState(() => {
    if (activeWorkout?.detectedWeightKg) {
      return weightUnit === "lbs"
        ? kgToLbs(activeWorkout.detectedWeightKg)
        : activeWorkout.detectedWeightKg;
    }
    return weightUnit === "lbs" ? 25 : 10;
  });

  const [timer, setTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTimer, setRestTimer] = useState(90);

  const [isTracking, setIsTracking] = useState(false);
  const [currentReps, setCurrentReps] = useState(0);
  const [lastAddedSetId, setLastAddedSetId] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const repFlashAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accelWindowRef = useRef<number[]>([]);
  const lastRepTimeRef = useRef(0);
  const accelSubRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);
  const currentRepsRef = useRef(0);
  const targetRepsRef = useRef(targetReps);
  const isLoggingRef = useRef(false);

  useEffect(() => { targetRepsRef.current = targetReps; }, [targetReps]);

  useEffect(() => {
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (isResting) {
      restTimerRef.current = setInterval(() => {
        setRestTimer(t => {
          if (t <= 1) {
            setIsResting(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (restTimerRef.current) clearInterval(restTimerRef.current);
            return 90;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    }
    return () => { if (restTimerRef.current) clearInterval(restTimerRef.current); };
  }, [isResting]);

  const handleLogSet = useCallback(async (repsToLog: number) => {
    if (!activeWorkout || isLoggingRef.current) return;
    isLoggingRef.current = true;

    const weightKg = activeWorkout.isBodyweight
      ? 0
      : weightUnit === "lbs" ? lbsToKg(weight) : weight;
    const setNumber = (activeWorkout.sets.length) + 1;

    const newSet = await addSet(activeWorkout.id, repsToLog, weightKg, setNumber);
    isLoggingRef.current = false;

    if (newSet) {
      setLastAddedSetId(newSet.id);
      setIsResting(true);
      setRestTimer(90);
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 120, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [activeWorkout, weightUnit, weight, addSet, pulseAnim]);

  const stopTracking = useCallback(async (repsToLog?: number) => {
    setIsTracking(false);
    accelSubRef.current?.remove();
    accelSubRef.current = null;
    Accelerometer.setUpdateInterval(1000);

    const reps = repsToLog ?? currentRepsRef.current;
    setCurrentReps(0);
    currentRepsRef.current = 0;

    if (reps > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await handleLogSet(reps);
    }
  }, [handleLogSet]);

  const startTracking = useCallback(() => {
    if (isResting) {
      Alert.alert("Still resting", "Wait for rest timer to finish, or skip it first.");
      return;
    }
    accelWindowRef.current = [];
    lastRepTimeRef.current = 0;
    currentRepsRef.current = 0;
    setCurrentReps(0);
    setIsTracking(true);

    Accelerometer.setUpdateInterval(80);
    accelSubRef.current = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x * x + y * y + z * z);
      accelWindowRef.current.push(mag);
      if (accelWindowRef.current.length > WINDOW_SIZE) {
        accelWindowRef.current.shift();
      }
      if (accelWindowRef.current.length < 5) return;

      const avg = accelWindowRef.current.reduce((a, b) => a + b, 0) / accelWindowRef.current.length;
      const deviation = Math.abs(mag - avg);
      const now = Date.now();

      if (deviation > ACCEL_THRESHOLD && now - lastRepTimeRef.current > MIN_REP_MS) {
        lastRepTimeRef.current = now;
        currentRepsRef.current += 1;
        const newCount = currentRepsRef.current;
        setCurrentReps(newCount);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        Animated.sequence([
          Animated.timing(repFlashAnim, { toValue: 1.15, duration: 100, useNativeDriver: true }),
          Animated.timing(repFlashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();

        if (newCount >= targetRepsRef.current) {
          stopTracking(newCount);
        }
      }
    });
  }, [isResting, stopTracking, repFlashAnim]);

  useEffect(() => {
    return () => {
      accelSubRef.current?.remove();
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const adjustTargetReps = (delta: number) => {
    setTargetReps(r => Math.max(1, r + delta));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const adjustWeight = (delta: number) => {
    const step = weightUnit === "lbs" ? 2.5 : 1.25;
    setWeight(w => Math.max(0, Math.round((w + delta * step) * 4) / 4));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleComplete = () => {
    if (!activeWorkout) return;
    if (isTracking) stopTracking();
    Alert.alert(
      "Complete Workout",
      `Finish ${activeWorkout.exerciseName} with ${activeWorkout.sets.length} sets?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await completeWorkout(activeWorkout.id);
            router.replace("/(tabs)/history");
          },
        },
      ]
    );
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!activeWorkout) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.noWorkoutText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
          No active workout
        </Text>
        <Pressable onPress={() => router.replace("/(tabs)")}>
          <Text style={[styles.backLinkText, { color: accent, fontFamily: "Inter_500Medium" }]}>
            Go Home
          </Text>
        </Pressable>
      </View>
    );
  }

  const isBodyweight = !!activeWorkout.isBodyweight;
  const totalVol = activeWorkout.sets.reduce((sum, s) => sum + s.reps * s.weightKg, 0);
  const displayVol = weightUnit === "lbs" ? kgToLbs(totalVol) : Math.round(totalVol);
  const progressPct = isTracking && targetReps > 0 ? Math.min(currentReps / targetReps, 1) : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, { backgroundColor: isTracking ? "#34C759" : accent }]} />
            <Text style={[styles.liveText, { color: isTracking ? "#34C759" : accent, fontFamily: "Inter_600SemiBold" }]}>
              {isTracking ? "TRACKING" : "LIVE"}
            </Text>
          </View>
          <Text style={[styles.exerciseName, { color: theme.text, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
            {activeWorkout.exerciseName}
          </Text>
          <Text style={[styles.timerText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {formatTime(timer)}
          </Text>
        </View>
        <Pressable
          style={[styles.doneBtn, { backgroundColor: theme.backgroundTertiary }]}
          onPress={handleComplete}
        >
          <Text style={[styles.doneBtnText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Finish
          </Text>
        </Pressable>
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {activeWorkout.sets.length}
          </Text>
          <Text style={[styles.statLbl, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>Sets</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {activeWorkout.sets.reduce((s, set) => s + set.reps, 0)}
          </Text>
          <Text style={[styles.statLbl, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>Reps</Text>
        </View>
        {!isBodyweight && (
          <>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                {displayVol > 0 ? displayVol.toLocaleString() : "—"}
              </Text>
              <Text style={[styles.statLbl, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>
                {weightUnit} vol
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Rest timer */}
      {isResting && (
        <View style={[styles.restBanner, { backgroundColor: `${accent}12`, borderColor: `${accent}30` }]}>
          <Ionicons name="timer-outline" size={18} color={accent} />
          <Text style={[styles.restText, { color: accent, fontFamily: "Inter_600SemiBold" }]}>
            Rest: {formatTime(restTimer)}
          </Text>
          <Pressable
            onPress={() => { setIsResting(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[styles.skipRestBtn, { backgroundColor: `${accent}20` }]}
          >
            <Text style={[styles.skipRestText, { color: accent, fontFamily: "Inter_500Medium" }]}>Skip</Text>
          </Pressable>
        </View>
      )}

      {/* Sets list */}
      <ScrollView
        ref={scrollRef}
        style={styles.setsScroll}
        contentContainerStyle={styles.setsList}
        showsVerticalScrollIndicator={false}
      >
        {activeWorkout.sets.length === 0 ? (
          <View style={styles.noSets}>
            <Ionicons name="layers-outline" size={40} color={theme.textTertiary} />
            <Text style={[styles.noSetsText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Press Start Set and move your phone
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.setsDivider, { borderColor: theme.border }]}>
              <Text style={[styles.setsDividerLabel, { backgroundColor: theme.background, color: theme.textTertiary, fontFamily: "Inter_500Medium" }]}>
                Completed Sets
              </Text>
            </View>
            {activeWorkout.sets.map(set => (
              <SetRow
                key={set.id}
                set={set}
                weightUnit={weightUnit}
                isNew={set.id === lastAddedSetId}
              />
            ))}
          </>
        )}
        <View style={{ height: 260 }} />
      </ScrollView>

      {/* Bottom panel */}
      <Animated.View
        style={[
          styles.inputPanel,
          {
            backgroundColor: theme.backgroundSecondary,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + 12,
            transform: [{ scale: pulseAnim }],
          }
        ]}
      >
        {isTracking ? (
          /* ── ACTIVE TRACKING VIEW ── */
          <>
            <View style={styles.trackingHeader}>
              <Text style={[styles.trackingLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                Move your phone · reps detected automatically
              </Text>
            </View>

            {/* Big rep counter */}
            <View style={styles.repCounterRow}>
              <Animated.Text
                style={[
                  styles.repCounterNum,
                  { color: currentReps >= targetReps ? "#34C759" : accent, fontFamily: "Inter_700Bold",
                    transform: [{ scale: repFlashAnim }] }
                ]}
              >
                {currentReps}
              </Animated.Text>
              <Text style={[styles.repCounterSlash, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>
                /{targetReps}
              </Text>
            </View>

            {/* Progress bar */}
            <View style={[styles.progressTrack, { backgroundColor: theme.backgroundTertiary }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: currentReps >= targetReps ? "#34C759" : accent,
                    width: `${Math.round(progressPct * 100)}%` as any,
                  }
                ]}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.stopBtn,
                { backgroundColor: theme.backgroundTertiary, opacity: pressed ? 0.8 : 1 }
              ]}
              onPress={() => stopTracking()}
            >
              <Ionicons name="stop-circle" size={20} color={theme.text} />
              <Text style={[styles.stopBtnText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Stop & Log {currentReps} Rep{currentReps !== 1 ? "s" : ""}
              </Text>
            </Pressable>
          </>
        ) : (
          /* ── SETUP VIEW ── */
          <>
            <View style={styles.setupRow}>
              {/* Weight — hidden for bodyweight exercises */}
              {!isBodyweight && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textTertiary, fontFamily: "Inter_500Medium" }]}>
                    WEIGHT ({weightUnit})
                  </Text>
                  <View style={styles.stepper}>
                    <Pressable
                      style={[styles.stepBtn, { backgroundColor: theme.backgroundTertiary }]}
                      onPress={() => adjustWeight(-1)}
                    >
                      <Ionicons name="remove" size={18} color={theme.text} />
                    </Pressable>
                    <Text style={[styles.stepValue, { color: theme.text, fontFamily: "Inter_600SemiBold", borderColor: theme.border }]}>
                      {weight % 1 === 0 ? weight : weight.toFixed(1)}
                    </Text>
                    <Pressable
                      style={[styles.stepBtn, { backgroundColor: theme.backgroundTertiary }]}
                      onPress={() => adjustWeight(1)}
                    >
                      <Ionicons name="add" size={18} color={theme.text} />
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Target reps */}
              <View style={[styles.inputGroup, isBodyweight && styles.inputGroupFull]}>
                <Text style={[styles.inputLabel, { color: theme.textTertiary, fontFamily: "Inter_500Medium" }]}>
                  TARGET REPS
                </Text>
                <View style={styles.stepper}>
                  <Pressable
                    style={[styles.stepBtn, { backgroundColor: theme.backgroundTertiary }]}
                    onPress={() => adjustTargetReps(-1)}
                  >
                    <Ionicons name="remove" size={18} color={theme.text} />
                  </Pressable>
                  <Text style={[styles.stepValue, { color: theme.text, fontFamily: "Inter_600SemiBold", borderColor: theme.border }]}>
                    {targetReps}
                  </Text>
                  <Pressable
                    style={[styles.stepBtn, { backgroundColor: theme.backgroundTertiary }]}
                    onPress={() => adjustTargetReps(1)}
                  >
                    <Ionicons name="add" size={18} color={theme.text} />
                  </Pressable>
                </View>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.startBtn,
                {
                  backgroundColor: isResting ? theme.backgroundTertiary : accent,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                }
              ]}
              onPress={startTracking}
            >
              <Ionicons name="play-circle" size={22} color={isResting ? theme.textSecondary : "#fff"} />
              <Text style={[styles.startBtnText, { color: isResting ? theme.textSecondary : "#fff", fontFamily: "Inter_700Bold" }]}>
                {isResting
                  ? `Resting… (${formatTime(restTimer)})`
                  : `Start Set ${activeWorkout.sets.length + 1}`}
              </Text>
            </Pressable>

            <Text style={[styles.accelHint, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>
              Phone accelerometer counts reps · set down when not active
            </Text>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  noWorkoutText: { fontSize: 16 },
  backLinkText: { fontSize: 15 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 12,
  },
  headerLeft: { flex: 1, gap: 3 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 11, letterSpacing: 1 },
  exerciseName: { fontSize: 26 },
  timerText: { fontSize: 14, fontVariant: ["tabular-nums"] },
  doneBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  doneBtnText: { fontSize: 15 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    marginBottom: 12,
  },
  statItem: { alignItems: "center", gap: 2, flex: 1 },
  statNum: { fontSize: 22 },
  statLbl: { fontSize: 11 },
  statDivider: { width: 1, height: 28 },
  restBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 8,
  },
  restText: { flex: 1, fontSize: 14, fontVariant: ["tabular-nums"] },
  skipRestBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  skipRestText: { fontSize: 12 },
  setsScroll: { flex: 1 },
  setsList: { paddingHorizontal: 20, paddingTop: 8 },
  noSets: { alignItems: "center", paddingTop: 40, gap: 10 },
  noSetsText: { fontSize: 14, textAlign: "center" },
  setsDivider: {
    borderTopWidth: 1,
    alignItems: "center",
    marginBottom: 8,
    position: "relative",
  },
  setsDividerLabel: {
    position: "absolute",
    top: -10,
    paddingHorizontal: 8,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  inputPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  setupRow: {
    flexDirection: "row",
    gap: 14,
  },
  inputGroup: { flex: 1, gap: 7 },
  inputGroupFull: { flex: 1 },
  inputLabel: { fontSize: 10, letterSpacing: 0.5 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: {
    width: 40,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    textAlign: "center",
    fontSize: 20,
    paddingVertical: 10,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  startBtnText: { fontSize: 17 },
  accelHint: {
    fontSize: 11,
    textAlign: "center",
    marginTop: -4,
  },
  trackingHeader: {
    alignItems: "center",
  },
  trackingLabel: { fontSize: 12, textAlign: "center" },
  repCounterRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
  },
  repCounterNum: { fontSize: 72, lineHeight: 76 },
  repCounterSlash: { fontSize: 28, marginBottom: 10 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  stopBtnText: { fontSize: 16 },
});
