import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/constants/theme";
import { useWorkout } from "@/context/workout";

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}

function SettingRow({ icon, iconColor, label, sublabel, right, onPress }: SettingRowProps) {
  const { theme } = useTheme();
  const content = (
    <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
      <View style={[styles.settingIcon, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
          {label}
        </Text>
        {sublabel && (
          <Text style={[styles.settingSubLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {sublabel}
          </Text>
        )}
      </View>
      {right}
    </View>
  );

  if (onPress) {
    return (
      <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} onPress={onPress}>
        {content}
      </Pressable>
    );
  }
  return content;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, accent } = useTheme();
  const { weightUnit, setWeightUnit } = useWorkout();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const isLbs = weightUnit === "lbs";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            Settings
          </Text>
        </View>

        {/* Weight Unit */}
        <Text style={[styles.sectionLabel, { color: theme.textTertiary, fontFamily: "Inter_600SemiBold" }]}>
          PREFERENCES
        </Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <SettingRow
            icon="scale-outline"
            iconColor={accent}
            label="Weight Unit"
            sublabel={isLbs ? "Pounds (lbs)" : "Kilograms (kg)"}
            right={
              <View style={styles.unitToggle}>
                <Pressable
                  style={[styles.unitBtn, { backgroundColor: !isLbs ? accent : theme.backgroundTertiary }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setWeightUnit("kg");
                  }}
                >
                  <Text style={[styles.unitBtnText, { color: !isLbs ? "#fff" : theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                    KG
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.unitBtn, { backgroundColor: isLbs ? accent : theme.backgroundTertiary }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setWeightUnit("lbs");
                  }}
                >
                  <Text style={[styles.unitBtnText, { color: isLbs ? "#fff" : theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                    LBS
                  </Text>
                </Pressable>
              </View>
            }
          />
        </View>

        {/* Integrations */}
        <Text style={[styles.sectionLabel, { color: theme.textTertiary, fontFamily: "Inter_600SemiBold" }]}>
          INTEGRATIONS
        </Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <SettingRow
            icon="heart"
            iconColor="#FF3B30"
            label="Apple Health"
            sublabel="Sync workouts to Apple Health"
            right={
              <View style={[styles.integratedBadge, { backgroundColor: "rgba(52, 199, 89, 0.12)" }]}>
                <Ionicons name="checkmark-circle" size={14} color="#34C759" />
                <Text style={[styles.integratedText, { color: "#34C759", fontFamily: "Inter_500Medium" }]}>
                  Active
                </Text>
              </View>
            }
          />
          <SettingRow
            icon="watch-outline"
            iconColor="#007AFF"
            label="Apple Watch"
            sublabel="Rep counting via motion sensors"
            right={
              <View style={[styles.integratedBadge, { backgroundColor: "rgba(0, 122, 255, 0.1)" }]}>
                <Ionicons name="checkmark-circle" size={14} color="#007AFF" />
                <Text style={[styles.integratedText, { color: "#007AFF", fontFamily: "Inter_500Medium" }]}>
                  Paired
                </Text>
              </View>
            }
          />
        </View>

        {/* AI Features */}
        <Text style={[styles.sectionLabel, { color: theme.textTertiary, fontFamily: "Inter_600SemiBold" }]}>
          AI FEATURES
        </Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <SettingRow
            icon="camera-outline"
            iconColor="#FF9F0A"
            label="Weight Detection"
            sublabel="AI scans dumbbells and weight stacks"
            right={
              <View style={[styles.integratedBadge, { backgroundColor: `${accent}15` }]}>
                <Ionicons name="sparkles" size={14} color={accent} />
                <Text style={[styles.integratedText, { color: accent, fontFamily: "Inter_500Medium" }]}>
                  Enabled
                </Text>
              </View>
            }
          />
          <SettingRow
            icon="body-outline"
            iconColor="#4ECDC4"
            label="Exercise Detection"
            sublabel="AI identifies exercise type from image"
            right={
              <View style={[styles.integratedBadge, { backgroundColor: "rgba(78, 205, 196, 0.12)" }]}>
                <Ionicons name="sparkles" size={14} color="#4ECDC4" />
                <Text style={[styles.integratedText, { color: "#4ECDC4", fontFamily: "Inter_500Medium" }]}>
                  Enabled
                </Text>
              </View>
            }
          />
        </View>

        {/* About */}
        <Text style={[styles.sectionLabel, { color: theme.textTertiary, fontFamily: "Inter_600SemiBold" }]}>
          ABOUT
        </Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <SettingRow
            icon="information-circle-outline"
            iconColor={theme.textSecondary}
            label="Version"
            sublabel="1.0.0"
          />
          <SettingRow
            icon="barbell-outline"
            iconColor={accent}
            label="RepCount"
            sublabel="Smart gym tracking with AI weight detection"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { marginBottom: 24 },
  title: { fontSize: 32 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 24,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingInfo: { flex: 1, gap: 2 },
  settingLabel: { fontSize: 15 },
  settingSubLabel: { fontSize: 12 },
  unitToggle: {
    flexDirection: "row",
    borderRadius: 10,
    overflow: "hidden",
    gap: 2,
  },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unitBtnText: { fontSize: 13 },
  integratedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  integratedText: { fontSize: 11 },
});
