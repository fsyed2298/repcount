import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/constants/theme";
import { useWorkout } from "@/context/workout";
import { WorkoutHistoryCard } from "@/components/ui/WorkoutHistoryCard";

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { theme, accent } = useTheme();
  const { workouts, fetchWorkouts, deleteWorkout, isLoading } = useWorkout();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    fetchWorkouts();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={workouts}
        keyExtractor={item => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.list,
          { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchWorkouts}
            tintColor={accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              History
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {workouts.length} {workouts.length === 1 ? "workout" : "workouts"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={52} color={theme.textTertiary} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                No history yet
              </Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                Complete your first workout to see it here
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <WorkoutHistoryCard
            workout={item}
            onDelete={() => deleteWorkout(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 20 },
  header: { marginBottom: 20, gap: 4 },
  title: { fontSize: 32 },
  subtitle: { fontSize: 14 },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, marginTop: 8 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
