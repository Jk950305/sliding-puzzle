import React, { useState } from "react";
import { useWindowDimensions } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { COLORS } from "./src/puzzleEngine";

// 💡 새로 분리된 화면들을 불러옵니다.
import HomeScreen from "./src/HomeScreen";
import PuzzleApp from "./src/PuzzleApp";
import WatermelonApp from "./src/WatermelonApp";

export default function App() {
  const { width, height } = useWindowDimensions();
  const [appMode, setAppMode] = useState<"home" | "puzzle" | "watermelon">("home");

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: COLORS.paper }}>
      {appMode === "home" && <HomeScreen onSelect={setAppMode} />}
      {appMode === "puzzle" && <PuzzleApp onBack={() => setAppMode("home")} width={width} height={height} />}
      {appMode === "watermelon" && <WatermelonApp onBack={() => setAppMode("home")} width={width} height={height} />}
    </SafeAreaProvider>
  );
}