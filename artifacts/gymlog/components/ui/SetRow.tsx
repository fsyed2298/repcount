import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/constants/theme";
import { WorkoutSet } from "@/types";

interface SetRowProps {
  set: WorkoutSet;
  weightUnit: "kg" | "lbs";
  isNew?: boolean;
}

function kgToLbs(kg: number): number {
  return Math.round(kg * 2.2046 * 10) / 10;
}

export function SetRow({ set, weightUnit, isNew }: SetRowProps) {
  const { theme } = useTheme();
  const isBodyweight = set.weightKg === 0;
  const displayWeight = weightUnit === "lbs" ? kgToLbs(set.weightKg) : set.weightKg;

  return (
    <View style={[styles.row, { backgroundColor: isNew ? "rgba(255, 87, 34, 0.06)" : "transparent" }]}>
      <View style={[styles.badge, { backgroundColor: theme.backgroundTertiary }]}>
        <Text style={[styles.badgeText, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
          {set.setNumber}
        </Text>
      </View>
      <View style={styles.middle}>
        {isBodyweight ? (
          <Text style={[styles.weight, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            Bodyweight
          </Text>
        ) : (
          <Text style={[styles.weight, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {displayWeight}
            <Text style={[styles.unit, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {" "}{weightUnit}
            </Text>
          </Text>
        )}
      </View>
      <View style={styles.right}>
        <Text style={[styles.reps, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {set.reps}
        </Text>
        <Text style={[styles.repsLabel, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>
          {set.reps === 1 ? "rep" : "reps"}
        </Text>
      </View>
      {isNew && <Ionicons name="checkmark-circle" size={18} color="#34C759" style={styles.check} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
    borderRadius: 8,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 14,
  },
  middle: {
    flex: 1,
  },
  weight: {
    fontSize: 18,
  },
  unit: {
    fontSize: 13,
  },
  right: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  reps: {
    fontSize: 20,
  },
  repsLabel: {
    fontSize: 13,
  },
  check: {
    marginLeft: 4,
  },
});
