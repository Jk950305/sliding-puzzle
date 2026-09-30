import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, Image, Modal, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from "react-native";

import { PuzzlePreset, Tile, LineDrag, makeGoal, shufflePuzzle, isSolved, COLORS } from "./puzzleEngine";
import { PhotoCrop, InteractiveEditor, PuzzleBoard, sourceFor } from "./PuzzleElements";
import { WATERMELON_GAME_WIDTH } from "./watermelonEngine";

const PUZZLE_STORAGE_KEY = "@sliding-puzzle/presets";
const SAMPLE_URI = Image.resolveAssetSource(require("../assets/icon.png")).uri;

const getUniqueName = (baseName: string, existingNames: string[]) => {
  let name = baseName; let counter = 1;
  while (existingNames.includes(name)) { name = `${baseName} (${counter})`; counter++; }
  return name;
};

export default function PuzzleApp({ onBack, width, height }: any) {
  const [screen, setScreen] = useState<"setup" | "game">("setup");
  const [presets, setPresets] = useState<PuzzlePreset[]>([]);
  const [selectedId, setSelectedId] = useState("sample");
  
  const [size, setSize] = useState(4);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0); 
  const [offsetY, setOffsetY] = useState(0); 
  
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [moves, setMoves] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [lineDrag, setLineDrag] = useState<LineDrag>(null);

  const [savePrompt, setSavePrompt] = useState<{ visible: boolean, isNew: boolean, defaultName: string } | null>(null);
  const [renameData, setRenameData] = useState<{id: string, name: string} | null>(null);
  const [tempName, setTempName] = useState("");

  useEffect(() => {
    AsyncStorage.getItem(PUZZLE_STORAGE_KEY).then(data => {
      if (data) { try { const parsed = JSON.parse(data); if (Array.isArray(parsed)) setPresets(parsed); } catch(e){} }
    });
  }, []);

  const activePreset = useMemo<PuzzlePreset>(() => presets.find((p) => p.id === selectedId) ?? { id: "sample", name: "기본 샘플", imageUri: SAMPLE_URI, size, scale, offsetX, offsetY }, [offsetX, offsetY, presets, scale, selectedId, size]);

  const choosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 1 });
    if (!result.canceled) {
      const dest = `${FileSystem.documentDirectory}pz-${Date.now()}.${result.assets[0].fileName?.split(".").pop() ?? "jpg"}`;
      await FileSystem.copyAsync({ from: result.assets[0].uri, to: dest });
      const nextPreset: PuzzlePreset = { id: `pz-${Date.now()}`, name: result.assets[0].fileName ?? "새 사진", imageUri: dest, size, scale: 1, offsetX: 0, offsetY: 0 };
      const updated = [nextPreset, ...presets];
      setPresets(updated); AsyncStorage.setItem(PUZZLE_STORAGE_KEY, JSON.stringify(updated));
      setSelectedId(nextPreset.id); setScale(1); setOffsetX(0); setOffsetY(0);
    }
  };

  const handleSaveClick = () => {
    const isNew = selectedId === "sample";
    setSavePrompt({ visible: true, isNew, defaultName: isNew ? "내 퍼즐 세팅" : activePreset.name });
    setTempName("");
  };

  const confirmSave = () => {
    const isNew = savePrompt!.isNew;
    let finalName = tempName.trim() || savePrompt!.defaultName;

    if (isNew || finalName !== activePreset.name) {
       finalName = getUniqueName(finalName, presets.filter(p => p.id !== (isNew ? '' : selectedId)).map(p => p.name));
    }
    const newId = isNew ? `pz-${Date.now()}` : selectedId;
    const current: PuzzlePreset = { ...activePreset, id: newId, name: finalName, size, scale, offsetX, offsetY };
    const updated = [...presets.filter(p => p.id !== newId), current];
    setPresets(updated); AsyncStorage.setItem(PUZZLE_STORAGE_KEY, JSON.stringify(updated));
    setSelectedId(newId); setSavePrompt(null);
    Alert.alert("저장 완료", "프리셋이 성공적으로 추가되었습니다.");
  };

  const confirmRename = () => {
    let finalName = renameData!.name.trim() || "이름 없음";
    const targetId = renameData!.id;
    const oldName = presets.find(p => p.id === targetId)?.name;
    
    if (finalName !== oldName) {
      finalName = getUniqueName(finalName, presets.filter(p => p.id !== targetId).map(p => p.name));
    }
    const updated = presets.map(p => p.id === targetId ? { ...p, name: finalName } : p);
    setPresets(updated); AsyncStorage.setItem(PUZZLE_STORAGE_KEY, JSON.stringify(updated)); setRenameData(null);
  };

  const editorFrameSize = Math.min(width - 48, height * 0.4);

  if (screen === "setup") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.mainWrapper}>
          <View style={styles.headerRow}>
            <Pressable onPress={onBack} style={styles.backButtonTop} hitSlop={10}><Ionicons name="chevron-back" size={26} color={COLORS.ink} style={{ marginLeft: -2 }} /></Pressable>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.eyebrow}>SLIDING PUZZLE</Text>
              <Text style={styles.title}>퍼즐 세팅</Text>
            </View>
            <View style={{ width: 44 }} />
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 12 }}>
            <View style={{ borderRadius: 24, overflow: 'hidden', shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}>
              <InteractiveEditor uri={activePreset.imageUri} frameSize={editorFrameSize} gridSize={size} scale={scale} offsetX={offsetX} offsetY={offsetY} onChange={(s:any, ox:any, oy:any) => { setScale(s); setOffsetX(ox); setOffsetY(oy); }} />
            </View>
          </View>
          <View style={styles.controlsArea}>
            <View style={styles.sizeRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[4, 5, 6, 7, 8, 9].map((o) => (
                  <Pressable key={o} onPress={() => setSize(o)} style={[styles.sizeBtn, o === size && styles.sizeBtnActive, {marginRight: 8}]}>
                    <Text style={[styles.sizeBtnText, o === size && {color: "#FFF"}]}>{o}x{o}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={styles.btnRow}>
              <Pressable onPress={choosePhoto} style={styles.secondaryBtn}><Text style={styles.secondaryBtnText}>사진 변경</Text></Pressable>
              <Pressable onPress={() => setShowPresetsModal(true)} style={styles.secondaryBtn}><Text style={styles.secondaryBtnText}>프리셋 불러오기</Text></Pressable>
            </View>
            <View style={[styles.btnRow, {marginBottom: 0}]}>
              <Pressable onPress={handleSaveClick} style={[styles.secondaryBtn, {flex: 1}]}><Text style={styles.secondaryBtnText}>현재 설정 저장</Text></Pressable>
              <Pressable onPress={() => { setTiles(makeGoal(size)); setMoves(0); setLineDrag(null); setScreen("game"); }} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>시작하기 →</Text></Pressable>
            </View>
          </View>
        </View>

        <Modal visible={showPresetsModal && savePrompt === null && renameData === null} transparent animationType="slide">
           <View style={styles.modalOverlay}>
              <View style={styles.presetModalCard}>
                 <Text style={styles.presetModalTitle}>퍼즐 프리셋</Text>
                 <ScrollView style={styles.presetList} showsVerticalScrollIndicator={false}>
                   {[{ id: "sample", name: "기본 샘플", imageUri: SAMPLE_URI, size: 4, scale: 1, offsetX: 0, offsetY: 0 } as PuzzlePreset, ...presets].map((p) => (
                     <View key={p.id} style={styles.presetItemWrapper}>
                       <Pressable onPress={() => { setSelectedId(p.id); setSize(p.size); setScale(p.scale); setOffsetX(p.offsetX); setOffsetY(p.offsetY); setShowPresetsModal(false); }} style={styles.presetItemContent}>
                         <Image source={sourceFor(p.imageUri)} style={{width: 50, height: 50, borderRadius: 8}} />
                         <View style={{marginLeft: 14, flex: 1}}>
                            <Text style={{fontWeight: '800', color: COLORS.ink, fontSize: 15}} numberOfLines={1}>{p.name}</Text>
                            <Text style={{fontSize: 12, color: COLORS.muted, marginTop: 2}}>{p.size}x{p.size} 격자</Text>
                         </View>
                       </Pressable>
                       {p.id !== "sample" && (
                         <View style={{flexDirection: 'row'}}>
                           <Pressable onPress={() => setRenameData({id: p.id, name: p.name})} style={styles.presetEditBtn}><Ionicons name="pencil" size={20} color={COLORS.muted} /></Pressable>
                           <Pressable onPress={() => { const up = presets.filter(pr => pr.id !== p.id); setPresets(up); AsyncStorage.setItem(PUZZLE_STORAGE_KEY, JSON.stringify(up)); if(selectedId === p.id) setSelectedId("sample"); }} style={styles.presetDeleteBtn}><Ionicons name="trash-outline" size={20} color={COLORS.coral} /></Pressable>
                         </View>
                       )}
                     </View>
                   ))}
                 </ScrollView>
                 <Pressable onPress={() => setShowPresetsModal(false)} style={styles.modalCloseFooterBtn}><Text style={{color: '#FFF', fontWeight: '800'}}>닫기</Text></Pressable>
              </View>
           </View>
        </Modal>

        <Modal visible={savePrompt !== null} transparent animationType="fade">
          <View style={styles.modalOverlay}>
             <View style={[styles.presetModalCard, { padding: 24, minHeight: 0 }]}>
                <Text style={[styles.presetModalTitle, {marginBottom: 20}]}>프리셋 이름 설정</Text>
                <TextInput style={styles.renameInput} value={tempName} onChangeText={setTempName} autoFocus maxLength={18} placeholder={savePrompt?.defaultName} placeholderTextColor={COLORS.muted} />
                <View style={[styles.btnRow, {marginBottom: 0}]}>
                  <Pressable onPress={() => setSavePrompt(null)} style={styles.secondaryBtn}><Text style={styles.secondaryBtnText}>취소</Text></Pressable>
                  <Pressable onPress={confirmSave} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>저장 완료</Text></Pressable>
                </View>
             </View>
          </View>
        </Modal>

        <Modal visible={renameData !== null} transparent animationType="fade">
          <View style={styles.modalOverlay}>
             <View style={[styles.presetModalCard, { padding: 24, minHeight: 0 }]}>
                <Text style={[styles.presetModalTitle, {marginBottom: 20}]}>이름 변경</Text>
                <TextInput style={styles.renameInput} value={renameData?.name || ""} onChangeText={(t) => setRenameData(prev => prev ? {...prev, name: t} : null)} autoFocus maxLength={18} placeholder="새 이름을 입력하세요" placeholderTextColor={COLORS.muted} />
                <View style={[styles.btnRow, {marginBottom: 0}]}>
                  <Pressable onPress={() => setRenameData(null)} style={styles.secondaryBtn}><Text style={styles.secondaryBtnText}>취소</Text></Pressable>
                  <Pressable onPress={confirmRename} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>변경 완료</Text></Pressable>
                </View>
             </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  const gameThumbnailSize = Math.min(200, Math.max(160, Math.round(height * 0.20)));
  const gamePreset = { ...activePreset, size, scale, offsetX, offsetY };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.gameContainer}>
        <View style={styles.gameTopBar}>
          <View style={styles.topSideContainer}>
            <Pressable onPress={() => setScreen("setup")} style={styles.iconButton} hitSlop={10}><Ionicons name="chevron-back" size={26} color={COLORS.ink} style={{ marginRight: 2 }} /></Pressable>
          </View>
          <View style={styles.previewThumbnailWrapper}>
            <PhotoCrop uri={gamePreset.imageUri} size={gameThumbnailSize} scale={gamePreset.scale} offsetX={gamePreset.offsetX} offsetY={gamePreset.offsetY} compact />
            <Pressable onPress={() => setShowPreview(true)} style={styles.expandButton} hitSlop={8}><Ionicons name="expand-outline" size={16} color={COLORS.ink} /></Pressable>
          </View>
          <View style={[styles.topSideContainer, { alignItems: "flex-end" }]}>
            <Pressable disabled={!isSolved(tiles, size)} onPress={() => { setTiles(shufflePuzzle(size)); setMoves(0); }} style={[styles.iconButton, { borderColor: COLORS.coral }, !isSolved(tiles, size) && styles.iconButtonDisabled]}>
              <Ionicons name="shuffle" size={26} color={COLORS.coral} />
            </Pressable>
          </View>
        </View>
        <View style={styles.boardWrapper}>
          <PuzzleBoard boardSize={WATERMELON_GAME_WIDTH} preset={gamePreset} tiles={tiles} onMovePath={(path: number[]) => {
             const next = [...tiles]; for (let i = path.length - 1; i > 0; i--) next[path[i]] = next[path[i - 1]]; next[path[0]] = null;
             setTiles(next); setMoves(v => v + 1); if (isSolved(next, size)) Alert.alert("완성했어요!", `${moves + 1}번 만에 맞췄어요.`);
          }} lineDrag={lineDrag} onLinePreview={setLineDrag} />
        </View>
      </View>

      <Modal animationType="fade" onRequestClose={() => setShowPreview(false)} transparent visible={showPreview}>
        <View style={styles.modalOverlay}>
          <Pressable onPress={() => setShowPreview(false)} style={StyleSheet.absoluteFill} />
          <View style={styles.modalCard}>
            <PhotoCrop uri={gamePreset.imageUri} size={Math.min(width - 48, 360)} scale={gamePreset.scale} offsetX={gamePreset.offsetX} offsetY={gamePreset.offsetY} />
            <Pressable onPress={() => setShowPreview(false)} style={styles.closeBtn}><Ionicons name="close" size={22} color="#FFF" /></Pressable>
          </View>
        </View>
      </Modal>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.paper },
  mainWrapper: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, maxWidth: 600, alignSelf: "center", width: "100%" },
  
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  eyebrow: { color: COLORS.coral, fontSize: 12, fontWeight: "800", letterSpacing: 2, marginBottom: 4 },
  title: { color: COLORS.ink, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  backButtonTop: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.panel, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.line, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },

  controlsArea: { backgroundColor: COLORS.panel, borderRadius: 28, padding: 24, paddingBottom: 32, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 15, shadowOffset: { width: 0, height: -4 }, elevation: 4 },
  sizeRow: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  sizeLabel: { color: COLORS.ink, fontWeight: "800", fontSize: 14, marginRight: 16, minWidth: 60 },
  sizeBtn: { height: 38, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.paper },
  sizeBtnActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  sizeBtnText: { color: COLORS.ink, fontWeight: "800", fontSize: 14 },
  
  btnRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  secondaryBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 16, height: 52, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { color: COLORS.ink, fontWeight: "800", fontSize: 14 },
  primaryBtn: { flex: 1.5, backgroundColor: COLORS.coral, borderRadius: 16, height: 52, alignItems: "center", justifyContent: "center", shadowColor: COLORS.coral, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  primaryBtnText: { color: "#FFF", fontWeight: "800", fontSize: 14 },

  gameContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, maxWidth: 600, alignSelf: "center", width: "100%" },
  gameTopBar: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingHorizontal: 4, zIndex: 2 },
  
  topSideContainer: { width: 100, alignItems: "flex-start", justifyContent: "center" },
  iconButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.panel, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.line, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  iconButtonDisabled: { opacity: 0.35, borderColor: COLORS.line },
  
  previewThumbnailWrapper: { position: "relative", borderRadius: 20, overflow: "hidden", borderWidth: 2, borderColor: COLORS.panel, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  expandButton: { position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  boardWrapper: { flex: 1, alignItems: "center", justifyContent: "center", width: "100%" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(26,29,32,0.85)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { position: "relative", padding: 8, borderRadius: 28, backgroundColor: COLORS.panel },
  closeBtn: { position: "absolute", top: -14, right: -14, width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.ink, alignItems: "center", justifyContent: "center" },
  
  presetModalCard: { width: '100%', maxWidth: 500, backgroundColor: COLORS.panel, borderRadius: 28, padding: 24 },
  presetModalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.ink, textAlign: 'center' },
  presetList: { flexShrink: 1, flexDirection: 'column', gap: 12, marginBottom: 20 },
  presetItemWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.paper, borderRadius: 16, marginBottom: 12, overflow: "hidden" },
  presetItemContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 },
  presetEditBtn: { paddingHorizontal: 16, paddingVertical: 20, justifyContent: "center", alignItems: "center" },
  presetDeleteBtn: { paddingHorizontal: 16, paddingVertical: 20, justifyContent: "center", alignItems: "center" },
  modalCloseFooterBtn: { backgroundColor: COLORS.ink, borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center' },
  
  renameInput: { borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 16, padding: 16, fontSize: 16, color: COLORS.ink, fontWeight: '700', marginBottom: 20, backgroundColor: COLORS.paper }
});