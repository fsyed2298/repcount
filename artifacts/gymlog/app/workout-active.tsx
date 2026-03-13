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

let WatchConnectivity: any = null;
let WC_LOAD_ERROR = "";
if (Platform.OS === "ios") {
  try {
    const mod = require("react-native-watch-connectivity");
    WatchConnectivity = mod.default ?? mod;
    if (!WatchConnectivity?.sendMessage) {
      WC_LOAD_ERROR = "module loaded but sendMessage missing";
      WatchConnectivity = null;
    }
  } catch (e: any) {
    WC_LOAD_ERROR = e?.message ?? "unknown error";
    WatchConnectivity = null;
  }
}

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
  const { activeWorkout, addSet, completeWorkout, weightUnit, restDuration } = useWorkout();

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
  const [restTimer, setRestTimer] = useState(restDuration);
  const restDurationRef = useRef(restDuration);
  useEffect(() => { restDurationRef.current = restDuration; }, [restDuration]);

  const [isTracking, setIsTracking] = useState(false);
  const [currentReps, setCurrentReps] = useState(0);
  const [lastAddedSetId, setLastAddedSetId] = useState<string | null>(null);
  const [watchReachable, setWatchReachable] = useState(false);
  const [usingWatch, setUsingWatch] = useState(false);
  const [watchPaired, setWatchPaired] = useState(false);
  const [wcDebug, setWcDebug] = useState<string>("");

  const scrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const repFlashAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accelWindowRef = useRef<number[]>([]);
  const lastRepTimeRef = useRef(0);
  const accelSubRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);
  const watchMsgSubRef = useRef<any>(null);
  const currentRepsRef = useRef(0);
  const targetRepsRef = useRef(targetReps);
  const isLoggingRef = useRef(false);
  const usingWatchRef = useRef(false);
  const watchRespondedRef = useRef(false);
  const pendingWatchMsgRef = useRef<Record<string, any> | null>(null);

  useEffect(() => { targetRepsRef.current = targetReps; }, [targetReps]);
  useEffect(() => { usingWatchRef.current = usingWatch; }, [usingWatch]);

  useEffect(() => {
    if (!WatchConnectivity) {
      setWcDebug(`WC: NOT LOADED${WC_LOAD_ERROR ? ` — ${WC_LOAD_ERROR}` : ""}`);
      return;
    }

    WatchConnectivity.getReachability().then((r: boolean) => {
      setWatchReachable(r);
      if (r) setWatchPaired(true);
      setWcDebug(`WC loaded · reachable=${r}`);
    }).catch(() => {});

    try {
      WatchConnectivity.getIsPaired?.().then((p: boolean) => {
        setWatchPaired(p);
      }).catch(() => {});
    } catch {}

    const reachabilitySub = WatchConnectivity.watchEvents.on("reachability", (r: boolean) => {
      setWatchReachable(r);
      if (r) setWatchPaired(true);
      setWcDebug(`Watch ${r ? "connected ✓" : "disconnected"}`);
    });

    // Global listener: handles Watch-initiated sets AND rep counts during phone-initiated sets
    const globalMsgSub = WatchConnectivity.watchEvents.on("message", (msg: any) => {
      if (msg.type === "watchStarted") {
        // Watch started a set — put phone into Watch-tracking mode
        const reps = msg.targetReps ?? targetRepsRef.current;
        currentRepsRef.current = 0;
        watchRespondedRef.current = true;
        setCurrentReps(0);
        setIsTracking(true);
        setUsingWatch(true);
        usingWatchRef.current = true;
        setTargetReps(reps);
        setWcDebug(`Watch started set (${reps} reps) ✓`);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (msg.type === "watchStopped") {
        // Watch stopped — log the set
        const count = msg.count ?? currentRepsRef.current;
        stopTracking(count);
      } else if (msg.type === "rep") {
        if (!watchRespondedRef.current) {
          watchRespondedRef.current = true;
          setUsingWatch(true);
          usingWatchRef.current = true;
          stopPhoneAccel();
        }
        flashRep(msg.count);
        if (msg.count >= targetRepsRef.current) stopTracking(msg.count);
      } else if (msg.type === "setComplete") {
        stopTracking(msg.count);
      }
    });

    return () => {
      reachabilitySub?.();
      globalMsgSub?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            // Tell Watch rest is done
            if (WatchConnectivity) {
              try { WatchConnectivity.updateApplicationContext({ type: "restEnded", ts: Date.now() }); } catch {}
              try { WatchConnectivity.sendMessage({ type: "restEnded" }, () => {}, () => {}); } catch {}
            }
            return restDurationRef.current;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    }
    return () => { if (restTimerRef.current) clearInterval(restTimerRef.current); };
  }, [isResting]);

  const flashRep = useCallback((count: number) => {
    setCurrentReps(count);
    currentRepsRef.current = count;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(repFlashAnim, { toValue: 1.15, duration: 100, useNativeDriver: true }),
      Animated.timing(repFlashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [repFlashAnim]);

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
      const dur = restDurationRef.current;
      setRestTimer(dur);
      setIsResting(true);
      // Tell Watch to show rest timer
      if (WatchConnectivity) {
        try { WatchConnectivity.updateApplicationContext({ type: "restStarted", duration: dur, ts: Date.now() }); } catch {}
        try { WatchConnectivity.sendMessage({ type: "restStarted", duration: dur }, () => {}, () => {}); } catch {}
      }
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 120, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [activeWorkout, weightUnit, weight, addSet, pulseAnim]);

  const stopPhoneAccel = useCallback(() => {
    accelSubRef.current?.remove();
    accelSubRef.current = null;
  }, []);

  const stopTracking = useCallback(async (repsToLog?: number) => {
    setIsTracking(false);

    // Stop both watch and phone
    if (WatchConnectivity) {
      try { WatchConnectivity.updateApplicationContext({ type: "stopTracking", ts: Date.now() }); } catch {}
      try { WatchConnectivity.sendMessage({ type: "stopTracking" }, () => {}, () => {}); } catch {}
      watchMsgSubRef.current?.();
      watchMsgSubRef.current = null;
    }
    stopPhoneAccel();
    Accelerometer.setUpdateInterval(1000);

    watchRespondedRef.current = false;
    pendingWatchMsgRef.current = null;
    setUsingWatch(false);
    usingWatchRef.current = false;

    const reps = repsToLog ?? currentRepsRef.current;
    setCurrentReps(0);
    currentRepsRef.current = 0;

    if (reps > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await handleLogSet(reps);
    }
  }, [handleLogSet, stopPhoneAccel]);

  const startTracking = useCallback(() => {
    if (isResting) {
      Alert.alert("Still resting", "Wait for rest timer to finish, or skip it first.");
      return;
    }
    currentRepsRef.current = 0;
    watchRespondedRef.current = false;
    setCurrentReps(0);
    setIsTracking(true);
    setUsingWatch(false);
    usingWatchRef.current = false;

    // Tell Watch to start tracking — context persists so Watch receives it when opened
    if (WatchConnectivity) {
      const msg = { type: "startTracking", targetReps: targetRepsRef.current, ts: Date.now() };
      pendingWatchMsgRef.current = msg;
      try {
        WatchConnectivity.updateApplicationContext(msg);
        setWcDebug("Sent to Watch · raise wrist to begin");
      } catch (e: any) {
        setWcDebug(`Watch context err: ${e?.message}`);
      }
      // Also try immediate sendMessage if Watch is already open
      try { WatchConnectivity.sendMessage(msg, () => {}, () => {}); } catch {}
    }

    // Always also start phone accel as backup
    // It stops automatically the moment Watch sends its first rep
    accelWindowRef.current = [];
    lastRepTimeRef.current = 0;
    Accelerometer.setUpdateInterval(80);
    accelSubRef.current = Accelerometer.addListener(({ x, y, z }) => {
      // If Watch has taken over, ignore phone accel
      if (watchRespondedRef.current) return;

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
        const newCount = currentRepsRef.current + 1;
        flashRep(newCount);
        if (newCount >= targetRepsRef.current) {
          stopTracking(newCount);
        }
      }
    });
  }, [isResting, flashRep, stopTracking, stopPhoneAccel]);

  useEffect(() => {
    return () => {
      accelSubRef.current?.remove();
      watchMsgSubRef.current?.();
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

  const trackingHint = usingWatch
    ? "Apple Watch is counting reps · haptics on watch"
    : watchPaired
    ? "Waiting for Watch · phone counting as backup"
    : "Move your phone · reps detected automatically";

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
            {watchPaired && !isTracking && (
              <View style={[styles.watchBadge, { backgroundColor: `${accent}18`, borderColor: `${accent}30` }]}>
                <Ionicons name="watch-outline" size={10} color={accent} />
                <Text style={[styles.watchBadgeText, { color: accent, fontFamily: "Inter_500Medium" }]}>
                  {watchReachable ? "Watch" : "Watch (open app)"}
                </Text>
              </View>
            )}
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

      {/* WC Debug strip — remove once Watch is working */}
      {!!wcDebug && (
        <Pressable onPress={() => setWcDebug("")}>
          <View style={{ backgroundColor: "#1a1a2e", paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ color: "#7fd4ff", fontSize: 10, fontFamily: "Inter_400Regular" }} numberOfLines={2}>
              🔧 {wcDebug}
            </Text>
          </View>
        </Pressable>
      )}

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
            onPress={() => {
              setIsResting(false);
              setRestTimer(restDurationRef.current);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (WatchConnectivity) {
                try { WatchConnectivity.updateApplicationContext({ type: "restEnded", ts: Date.now() }); } catch {}
                try { WatchConnectivity.sendMessage({ type: "restEnded" }, () => {}, () => {}); } catch {}
              }
            }}
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
              {watchPaired
                ? "Press Start Set · Watch counts reps, phone is backup"
                : "Press Start Set and move your phone"}
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
          <>
            <View style={styles.trackingHeader}>
              <Text style={[styles.trackingLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {trackingHint}
              </Text>
              {usingWatch && (
                <View style={[styles.watchActiveBadge, { backgroundColor: `${accent}15` }]}>
                  <Ionicons name="watch" size={12} color={accent} />
                  <Text style={[styles.watchActiveText, { color: accent, fontFamily: "Inter_600SemiBold" }]}>
                    Apple Watch
                  </Text>
                </View>
              )}
            </View>

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
          <>
            <View style={styles.setupRow}>
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
              {watchPaired
                ? <Ionicons name="watch" size={22} color={isResting ? theme.textSecondary : "#fff"} />
                : <Ionicons name="play-circle" size={22} color={isResting ? theme.textSecondary : "#fff"} />
              }
              <Text style={[styles.startBtnText, { color: isResting ? theme.textSecondary : "#fff", fontFamily: "Inter_700Bold" }]}>
                {isResting
                  ? `Resting… (${formatTime(restTimer)})`
                  : `Start Set ${activeWorkout.sets.length + 1}`}
              </Text>
            </Pressable>

            <Text style={[styles.accelHint, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>
              {watchPaired
                ? watchReachable
                  ? "Apple Watch will count reps · phone is backup"
                  : "Tap Start Set, then open RepCountWatch on your Watch"
                : "Phone accelerometer counts reps"}
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
  watchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  watchBadgeText: { fontSize: 10 },
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
    gap: 6,
  },
  trackingLabel: { fontSize: 12, textAlign: "center" },
  watchActiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  watchActiveText: { fontSize: 11 },
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
