import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/constants/theme";
import { Exercise } from "@/types";

interface ExerciseCardProps {
  exercise: Exercise;
  onSelect: (exercise: Exercise) => void;
  selected?: boolean;
}

const CATEGORY_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  chest: { name: "body", color: "#FF6B6B" },
  back: { name: "fitness", color: "#4ECDC4" },
  shoulders: { name: "triangle", color: "#45B7D1" },
  arms: { name: "barbell-outline", color: "#96CEB4" },
  legs: { name: "walk", color: "#FECA57" },
  core: { name: "radio-button-on", color: "#FF9FF3" },
  full_body: { name: "flash", color: "#FF5722" },
};

const EQUIPMENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  dumbbell: "barbell-outline",
  barbell: "barbell-outline",
  machine: "settings-outline",
  cable: "git-network-outline",
  bodyweight: "body-outline",
};

export function ExerciseCard({ exercise, onSelect, selected }: ExerciseCardProps) {
  const { theme, accent } = useTheme();
  const catIcon = CATEGORY_ICONS[exercise.category] ?? { name: "barbell-outline", color: accent };
  const equipIcon = EQUIPMENT_ICONS[exercise.equipment] ?? "barbell-outline";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: selected ? `${accent}15` : theme.card,
          borderColor: selected ? accent : theme.border,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(exercise);
      }}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${catIcon.color}18` }]}>
        <Ionicons name={catIcon.name} size={22} color={catIcon.color} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={[styles.muscle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
          {exercise.muscleGroup}
        </Text>
      </View>
      <View style={[styles.equipBadge, { backgroundColor: theme.backgroundTertiary }]}>
        <Ionicons name={equipIcon} size={14} color={theme.textSecondary} />
      </View>
      {selected && <Ionicons name="checkmark-circle" size={20} color={accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
  },
  muscle: {
    fontSize: 12,
  },
  equipBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
