import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Animated,
  Keyboard,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

export default function WorkoutActiveScreen() {
  const insets = useSafeAreaInsets();
  const { theme, accent } = useTheme();
  const { activeWorkout, addSet, completeWorkout, weightUnit } = useWorkout();

  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState(() => {
    if (activeWorkout?.detectedWeightKg) {
      return weightUnit === "lbs"
        ? String(kgToLbs(activeWorkout.detectedWeightKg))
        : String(activeWorkout.detectedWeightKg);
    }
    return weightUnit === "lbs" ? "25" : "10";
  });
  const [isLogging, setIsLogging] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTimer, setRestTimer] = useState(90);
  const [lastAddedSetId, setLastAddedSetId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleLogSet = async () => {
    Keyboard.dismiss();
    const repsNum = parseInt(reps);
    const weightNum = parseFloat(weight);

    if (!repsNum || repsNum <= 0) {
      Alert.alert("Invalid reps", "Please enter a valid number of reps");
      return;
    }
    if (!weightNum || weightNum <= 0) {
      Alert.alert("Invalid weight", "Please enter a valid weight");
      return;
    }
    if (!activeWorkout) return;

    setIsLogging(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const weightKg = weightUnit === "lbs" ? lbsToKg(weightNum) : weightNum;
    const setNumber = (activeWorkout.sets.length) + 1;

    const newSet = await addSet(activeWorkout.id, repsNum, weightKg, setNumber);
    setIsLogging(false);

    if (newSet) {
      setLastAddedSetId(newSet.id);
      setIsResting(true);
      setRestTimer(90);

      // Pulse animation for new set
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  };

  const handleComplete = () => {
    if (!activeWorkout) return;
    Alert.alert(
      "Complete Workout",
      `Finish ${activeWorkout.exerciseName} with ${activeWorkout.sets.length} sets?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          style: "default",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await completeWorkout(activeWorkout.id);
            router.replace("/(tabs)/history");
          },
        },
      ]
    );
  };

  const adjustReps = (delta: number) => {
    const curr = parseInt(reps) || 0;
    const next = Math.max(1, curr + delta);
    setReps(String(next));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const adjustWeight = (delta: number) => {
    const curr = parseFloat(weight) || 0;
    const step = weightUnit === "lbs" ? 2.5 : 1.25;
    const next = Math.max(0, Math.round((curr + delta * step) * 4) / 4);
    setWeight(String(next));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const totalVol = activeWorkout.sets.reduce((sum, s) => sum + s.reps * s.weightKg, 0);
  const displayVol = weightUnit === "lbs" ? kgToLbs(totalVol) : Math.round(totalVol);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, { backgroundColor: accent }]} />
            <Text style={[styles.liveText, { color: accent, fontFamily: "Inter_600SemiBold" }]}>
              LIVE
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
          <Text style={[styles.statLbl, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>
            Sets
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {activeWorkout.sets.reduce((s, set) => s + set.reps, 0)}
          </Text>
          <Text style={[styles.statLbl, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>
            Reps
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {displayVol > 0 ? displayVol.toLocaleString() : "—"}
          </Text>
          <Text style={[styles.statLbl, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>
            {weightUnit} vol
          </Text>
        </View>
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
            <Text style={[styles.skipRestText, { color: accent, fontFamily: "Inter_500Medium" }]}>
              Skip
            </Text>
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
              Log your first set below
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.setsDivider, { borderColor: theme.border }]}>
              <Text style={[styles.setsDividerLabel, { backgroundColor: theme.background, color: theme.textTertiary, fontFamily: "Inter_500Medium" }]}>
                Sets
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
        <View style={{ height: 240 }} />
      </ScrollView>

      {/* Input panel */}
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
        {/* Apple Watch indicator */}
        <View style={[styles.watchRow, { backgroundColor: `rgba(0,122,255,0.08)`, borderColor: "rgba(0,122,255,0.2)" }]}>
          <Ionicons name="watch-outline" size={14} color="#007AFF" />
          <Text style={[styles.watchText, { color: "#007AFF", fontFamily: "Inter_400Regular" }]}>
            Apple Watch counting reps automatically
          </Text>
        </View>

        <View style={styles.inputRow}>
          {/* Weight */}
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
              <TextInput
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                style={[styles.numInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_600SemiBold" }]}
                selectTextOnFocus
              />
              <Pressable
                style={[styles.stepBtn, { backgroundColor: theme.backgroundTertiary }]}
                onPress={() => adjustWeight(1)}
              >
                <Ionicons name="add" size={18} color={theme.text} />
              </Pressable>
            </View>
          </View>

          {/* Reps */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textTertiary, fontFamily: "Inter_500Medium" }]}>
              REPS
            </Text>
            <View style={styles.stepper}>
              <Pressable
                style={[styles.stepBtn, { backgroundColor: theme.backgroundTertiary }]}
                onPress={() => adjustReps(-1)}
              >
                <Ionicons name="remove" size={18} color={theme.text} />
              </Pressable>
              <TextInput
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
                style={[styles.numInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_600SemiBold" }]}
                selectTextOnFocus
              />
              <Pressable
                style={[styles.stepBtn, { backgroundColor: theme.backgroundTertiary }]}
                onPress={() => adjustReps(1)}
              >
                <Ionicons name="add" size={18} color={theme.text} />
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.logBtn,
            {
              backgroundColor: accent,
              opacity: isLogging || isResting ? 0.6 : pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }]
            }
          ]}
          onPress={handleLogSet}
          disabled={isLogging}
        >
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={[styles.logBtnText, { fontFamily: "Inter_700Bold" }]}>
            {isResting ? `Log Set ${activeWorkout.sets.length + 1}` : `Log Set ${activeWorkout.sets.length + 1}`}
          </Text>
        </Pressable>
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
  doneBtn: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
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
  noSetsText: { fontSize: 14 },
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
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  watchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  watchText: { fontSize: 12 },
  inputRow: {
    flexDirection: "row",
    gap: 14,
  },
  inputGroup: { flex: 1, gap: 7 },
  inputLabel: { fontSize: 10, letterSpacing: 0.5 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: {
    width: 38,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  numInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    textAlign: "center",
    fontSize: 20,
    paddingVertical: 10,
  },
  logBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  logBtnText: { color: "#fff", fontSize: 17 },
});
