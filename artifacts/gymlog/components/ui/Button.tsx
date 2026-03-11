import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/constants/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const { theme, accent } = useTheme();

  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 14,
    };

    const sizeMap: Record<string, ViewStyle> = {
      sm: { paddingVertical: 10, paddingHorizontal: 16 },
      md: { paddingVertical: 15, paddingHorizontal: 24 },
      lg: { paddingVertical: 18, paddingHorizontal: 32 },
    };

    const variantMap: Record<string, ViewStyle> = {
      primary: { backgroundColor: accent },
      secondary: { backgroundColor: theme.backgroundTertiary, borderWidth: 1, borderColor: theme.border },
      ghost: { backgroundColor: "transparent" },
      destructive: { backgroundColor: theme.destructive },
    };

    return { ...base, ...sizeMap[size], ...variantMap[variant] };
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontFamily: "Inter_600SemiBold",
      fontSize: size === "sm" ? 14 : size === "lg" ? 18 : 16,
    };

    const colorMap: Record<string, TextStyle> = {
      primary: { color: "#FFFFFF" },
      secondary: { color: theme.text },
      ghost: { color: accent },
      destructive: { color: "#FFFFFF" },
    };

    return { ...base, ...colorMap[variant] };
  };

  return (
    <Pressable
      style={({ pressed }) => [
        getContainerStyle(),
        { opacity: disabled ? 0.4 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? accent : "#fff"} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
