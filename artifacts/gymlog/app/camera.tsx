import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/constants/theme";
import { API_URL } from "@/context/workout";
import { DetectWeightResult } from "@/types";

type FlashMode = "off" | "on" | "auto";

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const { theme, accent } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState<FlashMode>("auto");
  const cameraRef = useRef<CameraView>(null);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    
    try {
      setIsCapturing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });

      if (!photo?.base64) {
        Alert.alert("Error", "Failed to capture photo");
        return;
      }

      // Detect weight via AI
      const response = await fetch(`${API_URL}/ai/detect-weight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: photo.base64, unit: "lbs" }),
      });

      const result: DetectWeightResult = await response.json();
      
      // Also try to detect exercise from the same image
      const exerciseResponse = await fetch(`${API_URL}/ai/detect-exercise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: photo.base64 }),
      });
      const exerciseResult = await exerciseResponse.json();

      router.replace({
        pathname: "/exercise-select",
        params: {
          fromCamera: "1",
          detectedWeightKg: result.detected ? String(result.weightKg ?? "") : "",
          detectedWeightLbs: result.detected ? String(result.weightLbs ?? "") : "",
          weightConfidence: result.confidence ?? "",
          weightDescription: result.description ?? "",
          detectedExerciseId: exerciseResult.detected ? exerciseResult.exerciseId ?? "" : "",
          detectedExerciseName: exerciseResult.detected ? exerciseResult.exerciseName ?? "" : "",
          exerciseConfidence: exerciseResult.confidence ?? "",
        },
      });
    } catch (error) {
      console.error("Camera capture error:", error);
      Alert.alert("Error", "Failed to process image. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSkip = () => {
    router.replace("/exercise-select");
  };

  if (!permission) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: "#000" }]}>
        <ActivityIndicator color={accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: "#0D0D0D" }]}>
        <View style={[styles.permissionCard, { backgroundColor: "#1A1A1A" }]}>
          <View style={[styles.permIcon, { backgroundColor: `${accent}20` }]}>
            <Ionicons name="camera" size={40} color={accent} />
          </View>
          <Text style={[styles.permTitle, { fontFamily: "Inter_700Bold" }]}>
            Camera Access
          </Text>
          <Text style={[styles.permText, { fontFamily: "Inter_400Regular" }]}>
            RepCount uses your camera to detect the weight on dumbbells and barbells using AI
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.permButton,
              { backgroundColor: accent, opacity: pressed ? 0.9 : 1 }
            ]}
            onPress={requestPermission}
          >
            <Text style={[styles.permButtonText, { fontFamily: "Inter_600SemiBold" }]}>
              Allow Camera
            </Text>
          </Pressable>
          {!permission.canAskAgain && Platform.OS !== "web" && (
            <Text style={[styles.settingsHint, { color: "rgba(255,255,255,0.4)", fontFamily: "Inter_400Regular" }]}>
              Please enable Camera in Settings
            </Text>
          )}
          <Pressable onPress={handleSkip} style={styles.skipLink}>
            <Text style={[styles.skipLinkText, { color: "rgba(255,255,255,0.4)", fontFamily: "Inter_400Regular" }]}>
              Skip for now
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        flash={flash}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        <View style={styles.topBarCenter}>
          <Text style={[styles.topBarTitle, { fontFamily: "Inter_600SemiBold" }]}>
            Scan Weight
          </Text>
          <Text style={[styles.topBarSub, { fontFamily: "Inter_400Regular" }]}>
            Point at a dumbbell or weight
          </Text>
        </View>
        <Pressable
          style={styles.iconBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFlash(f => f === "off" ? "on" : f === "on" ? "auto" : "off");
          }}
        >
          <Ionicons
            name={flash === "off" ? "flash-off" : flash === "on" ? "flash" : "flash-outline"}
            size={24}
            color="#fff"
          />
        </Pressable>
      </View>

      {/* Viewfinder */}
      <View style={styles.viewfinderContainer}>
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          <Text style={[styles.viewfinderLabel, { fontFamily: "Inter_500Medium" }]}>
            Aim at the weight number
          </Text>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable
          style={[styles.skipBtn, { borderColor: "rgba(255,255,255,0.3)" }]}
          onPress={handleSkip}
        >
          <Text style={[styles.skipText, { fontFamily: "Inter_500Medium" }]}>
            Skip
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.captureBtn,
            { borderColor: "#fff", opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] }
          ]}
          onPress={handleCapture}
          disabled={isCapturing}
        >
          {isCapturing ? (
            <ActivityIndicator color={accent} size="large" />
          ) : (
            <View style={[styles.captureBtnInner, { backgroundColor: "#fff" }]} />
          )}
        </Pressable>

        <View style={{ width: 72 }} />
      </View>

      {/* Scanning overlay */}
      {isCapturing && (
        <View style={styles.scanningOverlay}>
          <View style={[styles.scanningCard, { backgroundColor: "rgba(0,0,0,0.85)" }]}>
            <ActivityIndicator color={accent} size="large" />
            <Text style={[styles.scanningText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
              Analyzing weight...
            </Text>
            <Text style={[styles.scanningSubText, { color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular" }]}>
              AI is detecting the weight value
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionCard: {
    borderRadius: 24,
    padding: 32,
    margin: 24,
    alignItems: "center",
    gap: 14,
  },
  permIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  permTitle: {
    color: "#fff",
    fontSize: 24,
    textAlign: "center",
  },
  permText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  permButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 4,
  },
  permButtonText: { color: "#fff", fontSize: 16 },
  settingsHint: { fontSize: 12 },
  skipLink: { marginTop: 4 },
  skipLinkText: { fontSize: 13 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
    zIndex: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarCenter: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  topBarTitle: { color: "#fff", fontSize: 16 },
  topBarSub: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  viewfinderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  viewfinder: {
    width: 260,
    height: 200,
    position: "relative",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 12,
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#fff",
    borderWidth: 2.5,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderRadius: 4 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderRadius: 4 },
  cornerBL: { bottom: 36, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderRadius: 4 },
  cornerBR: { bottom: 36, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderRadius: 4 },
  viewfinderLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    zIndex: 10,
  },
  skipBtn: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
    width: 72,
    alignItems: "center",
  },
  skipText: { color: "#fff", fontSize: 14 },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  captureBtnInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 100,
  },
  scanningCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 12,
    width: 260,
  },
  scanningText: { fontSize: 18 },
  scanningSubText: { fontSize: 13, textAlign: "center" },
});
