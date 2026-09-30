import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "./puzzleEngine";

export default function HomeScreen({ onSelect }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.mainWrapper, { justifyContent: 'center' }]}>
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Text style={styles.eyebrow}>OFFLINE STUDIO</Text>
          <Text style={styles.title}>미니 게임 컬렉션</Text>
        </View>
        <Pressable onPress={() => onSelect("puzzle")} style={styles.homeGameCard}>
          <Ionicons name="grid" size={32} color={COLORS.coral} style={{marginBottom: 16}} />
          <Text style={styles.homeGameTitle}>슬라이딩 퍼즐</Text>
          <Text style={styles.homeGameDesc}>추억이 담긴 사진을 격자 퍼즐로 맞춰보세요.</Text>
        </Pressable>
        <Pressable onPress={() => onSelect("watermelon")} style={styles.homeGameCard}>
          <Ionicons name="aperture" size={32} color={COLORS.teal} style={{marginBottom: 16}} />
          <Text style={styles.homeGameTitle}>나만의 수박 게임</Text>
          <Text style={styles.homeGameDesc}>과일을 합쳐 가장 큰 커스텀 사진을 완성하세요.</Text>
        </Pressable>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.paper },
  mainWrapper: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, maxWidth: 600, alignSelf: "center", width: "100%" },
  homeGameCard: { backgroundColor: COLORS.panel, borderRadius: 28, padding: 28, marginBottom: 16, borderWidth: 1, borderColor: COLORS.line, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: {width: 0, height: 6}, elevation: 3 },
  homeGameTitle: { fontSize: 22, fontWeight: '800', color: COLORS.ink, marginBottom: 6 },
  homeGameDesc: { fontSize: 14, color: COLORS.muted, fontWeight: "500", lineHeight: 20 },
  eyebrow: { color: COLORS.coral, fontSize: 12, fontWeight: "800", letterSpacing: 2, marginBottom: 4 },
  title: { color: COLORS.ink, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
});