import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/constants/theme";
import { useWorkout, API_URL } from "@/context/workout";
import { ExerciseCard } from "@/components/ui/ExerciseCard";
import { Exercise } from "@/types";

const CATEGORIES = ["All", "chest", "back", "shoulders", "arms", "legs", "core"];
const CATEGORY_LABELS: Record<string, string> = {
  All: "All",
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  legs: "Legs",
  core: "Core",
};

function kgToLbs(kg: number) {
  return Math.round(kg * 2.2046 * 10) / 10;
}

export default function ExerciseSelectScreen() {
  const insets = useSafeAreaInsets();
  const { theme, accent } = useTheme();
  const { startWorkout, weightUnit } = useWorkout();
  const params = useLocalSearchParams<{
    detectedWeightKg?: string;
    detectedWeightLbs?: string;
    weightConfidence?: string;
    weightDescription?: string;
    detectedExerciseId?: string;
    detectedExerciseName?: string;
    exerciseConfidence?: string;
  }>();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const detectedWeightKg = params.detectedWeightKg ? parseFloat(params.detectedWeightKg) : null;
  const detectedWeightLbs = params.detectedWeightLbs ? parseFloat(params.detectedWeightLbs) : null;
  const hasDetectedWeight = !!detectedWeightKg;

  const displayWeight = weightUnit === "lbs" && detectedWeightLbs
    ? `${detectedWeightLbs} lbs`
    : detectedWeightKg
    ? `${detectedWeightKg} kg`
    : null;

  useEffect(() => {
    fetch(`${API_URL}/exercises`)
      .then(r => r.json())
      .then(data => {
        setExercises(data.exercises ?? []);
        // Auto-select detected exercise if high confidence
        if (params.detectedExerciseId && params.exerciseConfidence === "high") {
          const found = data.exercises?.find((e: Exercise) => e.id === params.detectedExerciseId);
          if (found) setSelectedExercise(found);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = exercises;
    if (category !== "All") list = list.filter(e => e.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q)
      );
    }
    return list;
  }, [exercises, category, search]);

  const handleStart = async () => {
    if (!selectedExercise) return;
    setIsStarting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const workout = await startWorkout(
      selectedExercise.id,
      selectedExercise.name,
      detectedWeightKg ?? null
    );

    setIsStarting(false);
    if (workout) {
      router.replace("/workout-active");
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="close" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          Choose Exercise
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Weight Detection Result */}
      {hasDetectedWeight && (
        <View style={[styles.weightBanner, { backgroundColor: `${accent}15`, borderColor: `${accent}30` }]}>
          <View style={[styles.weightIconCircle, { backgroundColor: accent }]}>
            <Ionicons name="barbell" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.weightDetectedLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Weight detected
            </Text>
            <Text style={[styles.weightDetectedValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {displayWeight}
              {params.weightDescription ? ` · ${params.weightDescription}` : ""}
            </Text>
          </View>
          {params.weightConfidence && (
            <View style={[styles.confidenceBadge, {
              backgroundColor: params.weightConfidence === "high"
                ? "rgba(52,199,89,0.12)"
                : params.weightConfidence === "medium"
                ? "rgba(255,159,10,0.12)"
                : "rgba(255,59,48,0.12)"
            }]}>
              <Text style={[styles.confidenceText, {
                color: params.weightConfidence === "high" ? "#34C759" : params.weightConfidence === "medium" ? "#FF9F0A" : "#FF3B30",
                fontFamily: "Inter_500Medium"
              }]}>
                {params.weightConfidence === "high" ? "High" : params.weightConfidence === "medium" ? "Medium" : "Low"}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* AI Detected Exercise */}
      {params.detectedExerciseId && (
        <View style={[styles.aiSuggestBanner, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <Ionicons name="sparkles" size={16} color={accent} />
          <Text style={[styles.aiSuggestText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            AI detected:{" "}
            <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold" }}>
              {params.detectedExerciseName}
            </Text>
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        <Ionicons name="search" size={18} color={theme.textTertiary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises..."
          placeholderTextColor={theme.textTertiary}
          style={[styles.searchInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat}
            style={[
              styles.catChip,
              {
                backgroundColor: category === cat ? accent : theme.backgroundSecondary,
                borderColor: category === cat ? accent : theme.border,
              }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCategory(cat);
            }}
          >
            <Text style={[styles.catChipText, {
              color: category === cat ? "#fff" : theme.textSecondary,
              fontFamily: "Inter_500Medium"
            }]}>
              {CATEGORY_LABELS[cat]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Exercise list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.noResults}>
              <Text style={[styles.noResultsText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                No exercises found
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ExerciseCard
              exercise={item}
              onSelect={setSelectedExercise}
              selected={selectedExercise?.id === item.id}
            />
          )}
        />
      )}

      {/* Start button */}
      {selectedExercise && (
        <View style={[styles.startBar, {
          backgroundColor: theme.backgroundSecondary,
          borderTopColor: theme.border,
          paddingBottom: insets.bottom + 12
        }]}>
          <View style={styles.selectedInfo}>
            <Text style={[styles.selectedLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Selected
            </Text>
            <Text style={[styles.selectedName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
              {selectedExercise.name}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.startBtn,
              { backgroundColor: accent, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }
            ]}
            onPress={handleStart}
            disabled={isStarting}
          >
            {isStarting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={[styles.startBtnText, { fontFamily: "Inter_700Bold" }]}>
                  Start
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 18 },
  weightBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 10,
  },
  weightIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  weightDetectedLabel: { fontSize: 11, marginBottom: 1 },
  weightDetectedValue: { fontSize: 15 },
  confidenceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  confidenceText: { fontSize: 11 },
  aiSuggestBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  aiSuggestText: { flex: 1, fontSize: 13 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15 },
  categoryRow: { paddingHorizontal: 20, gap: 8, marginBottom: 12, paddingRight: 20 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChipText: { fontSize: 13 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20 },
  noResults: { paddingTop: 40, alignItems: "center" },
  noResultsText: { fontSize: 15 },
  startBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 14,
  },
  selectedInfo: { flex: 1 },
  selectedLabel: { fontSize: 11 },
  selectedName: { fontSize: 15 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  startBtnText: { color: "#fff", fontSize: 16 },
});
