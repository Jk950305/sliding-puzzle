import React, { useEffect, useMemo, useState, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, Image, Modal, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from "react-native";

import { COLORS } from "./puzzleEngine";
import { PhotoCrop, InteractiveEditor, sourceFor } from "./PuzzleElements";
import { WatermelonPreset, WmImageParams, WATERMELON_DIFFICULTIES, getRandomNextFruit, FRUITS, WATERMELON_GAME_WIDTH } from "./watermelonEngine";
import { WatermelonBoard } from "./WatermelonElements";

const WM_STORAGE_KEY = "@watermelon-game/presets";
const SAMPLE_URI = Image.resolveAssetSource(require("../assets/icon.png")).uri;

const getUniqueName = (baseName: string, existingNames: string[]) => {
  let name = baseName; let counter = 1;
  while (existingNames.includes(name)) { name = `${baseName} (${counter})`; counter++; }
  return name;
};

export default function WatermelonApp({ onBack, width, height }: any) {
  const [screen, setScreen] = useState<"setup" | "game">("setup");
  const [presets, setPresets] = useState<WatermelonPreset[]>([]);
  const [selectedId, setSelectedId] = useState("wm_default");
  
  const [difficulty, setDifficulty] = useState("normal");
  const [wmImages, setWmImages] = useState<Record<number, WmImageParams>>({});
  
  const [editingFruitLevel, setEditingFruitLevel] = useState<number | null>(null);
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  
  const [savePrompt, setSavePrompt] = useState<{ visible: boolean, isNew: boolean, defaultName: string } | null>(null);
  const [renameData, setRenameData] = useState<{id: string, name: string} | null>(null);
  const [tempName, setTempName] = useState("");
  
  const [score, setScore] = useState(0);
  const [nextFruit, setNextFruit] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [success, setSuccess] = useState(false);
  const boardRef = useRef<any>(null);

  useEffect(() => {
    AsyncStorage.getItem(WM_STORAGE_KEY).then(data => {
      if (data) { try { const parsed = JSON.parse(data); if (Array.isArray(parsed)) setPresets(parsed); } catch(e){} }
    });
  }, []);

  const activePreset = useMemo<WatermelonPreset>(() => presets.find(p => p.id === selectedId) ?? { id: "wm_default", name: "기본 세팅", difficulty: "normal", wmImages: {} }, [presets, selectedId]);

  useEffect(() => {
    setDifficulty(activePreset.difficulty); setWmImages(activePreset.wmImages || {});
  }, [activePreset.id]);

  const choosePhotoForFruit = async (level: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 1 });
    if (!result.canceled) {
      const dest = `${FileSystem.documentDirectory}wm-${Date.now()}.${result.assets[0].fileName?.split(".").pop() ?? "jpg"}`;
      await FileSystem.copyAsync({ from: result.assets[0].uri, to: dest });
      setWmImages(prev => ({ ...prev, [level]: { imageUri: dest, scale: 1, offsetX: 0, offsetY: 0 } }));
      setEditingFruitLevel(level);
    }
  };

  const handleSaveClick = () => {
    const isNew = selectedId === "wm_default";
    setSavePrompt({ visible: true, isNew, defaultName: isNew ? "내 수박 커스텀" : activePreset.name });
    setTempName(""); 
  };

  const confirmSave = () => {
    const isNew = savePrompt!.isNew;
    const inputName = tempName.trim() || savePrompt!.defaultName;
    
    let finalName = inputName;
    if (isNew || inputName !== activePreset.name) {
       finalName = getUniqueName(inputName, presets.filter(p => p.id !== (isNew ? '' : selectedId)).map(p => p.name));
    }
    const newId = isNew ? `wm-${Date.now()}` : selectedId;
    const current: WatermelonPreset = { ...activePreset, id: newId, name: finalName, difficulty, wmImages };
    const updated = [...presets.filter(p => p.id !== newId), current];
    setPresets(updated); AsyncStorage.setItem(WM_STORAGE_KEY, JSON.stringify(updated));
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
    setPresets(updated); AsyncStorage.setItem(WM_STORAGE_KEY, JSON.stringify(updated)); setRenameData(null);
  };

  if (screen === "setup") {
    const wmEditorSize = Math.min(width - 96, height * 0.35, 260);
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.mainWrapper}>
          <View style={styles.headerRow}>
             <Pressable onPress={onBack} style={styles.backButtonTop} hitSlop={10}><Ionicons name="chevron-back" size={26} color={COLORS.ink} style={{ marginLeft: -2 }} /></Pressable>
             <View style={{ alignItems: 'center' }}>
                <Text style={styles.eyebrow}>WATERMELON</Text>
                <Text style={styles.title}>과일 설정</Text>
             </View>
             <View style={{ width: 44 }} />
          </View>

          <View style={[styles.controlsArea, { marginBottom: 12, paddingBottom: 16 }]}>
            <View style={[styles.sizeRow, {marginBottom: 0}]}>
              <Text style={styles.sizeLabel}>난이도</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {WATERMELON_DIFFICULTIES.map((d) => (
                  <Pressable key={d.id} onPress={() => setDifficulty(d.id)} style={[styles.sizeBtn, d.id === difficulty && styles.sizeBtnActive, {marginRight: 8}]}>
                    <Text style={[styles.sizeBtnText, d.id === difficulty && {color: "#FFF"}]}>{d.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={{ flex: 1, backgroundColor: COLORS.panel, borderRadius: 24, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
             <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8}}>
                <Text style={{ color: COLORS.ink, fontWeight: "800", fontSize: 13 }}>각 단계별 사진 등록</Text>
                <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: "600" }}>터치하여 변경</Text>
             </View>
             <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'space-between', flex: 1 }}>
               {[...FRUITS, null].map((f, index) => {
                 if (!f) return <View key="empty" style={{ width: '23.5%', height: '30%' }} />;
                 const imgData = wmImages[f.level];
                 const hasImage = !!imgData;
                 const dynamicCircleSize = 20 + f.level * 2.8; 
                 let badgeLabel = `Lv.${f.level + 1}`;
                 if (index === 0) badgeLabel = "가장 작음";
                 if (index === FRUITS.length - 1) badgeLabel = "가장 큼";
                 
                 return (
                   <Pressable key={f.level} style={styles.fruitGridItem} onPress={() => { if (hasImage) setEditingFruitLevel(f.level); else choosePhotoForFruit(f.level); }}>
                     <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                       <View style={{ width: dynamicCircleSize, height: dynamicCircleSize, borderRadius: dynamicCircleSize/2, backgroundColor: hasImage ? 'transparent' : f.color, overflow: 'hidden', borderWidth: hasImage ? 0 : 1, borderColor: 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                          {hasImage && <PhotoCrop uri={imgData.imageUri} size={dynamicCircleSize} scale={imgData.scale} offsetX={imgData.offsetX} offsetY={imgData.offsetY} compact borderRadius={dynamicCircleSize/2} />}
                       </View>
                       {hasImage && <View style={styles.editBadge}><Ionicons name="pencil" size={10} color="#FFF" style={{marginLeft: 1}}/></View>}
                     </View>
                     <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.ink, marginTop: 4, textAlign: 'center' }}>{badgeLabel}</Text>
                   </Pressable>
                 );
               })}
             </View>
          </View>

          <View style={styles.controlsArea}>
            <View style={styles.btnRow}>
              <Pressable onPress={() => setShowPresetsModal(true)} style={styles.secondaryBtn}><Text style={styles.secondaryBtnText}>프리셋 불러오기</Text></Pressable>
              <Pressable onPress={handleSaveClick} style={styles.secondaryBtn}><Text style={styles.secondaryBtnText}>현재 설정 저장</Text></Pressable>
            </View>
            <View style={[styles.btnRow, {marginBottom: 0}]}>
              <Pressable onPress={() => {
                setScore(0); setGameOver(false); setSuccess(false); setNextFruit(getRandomNextFruit(difficulty)); setScreen("game");
              }} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>게임 시작하기</Text></Pressable>
            </View>
          </View>
        </View>

        <Modal visible={editingFruitLevel !== null} transparent animationType="fade">
          <View style={styles.modalOverlay}>
             <View style={[styles.presetModalCard, { flex: 1, maxHeight: 520, justifyContent: 'space-between', paddingVertical: 32 }]}>
                <View style={{ alignItems: 'center' }}>
                   <Text style={[styles.presetModalTitle, { marginBottom: 4 }]}>{editingFruitLevel !== null ? `Lv.${editingFruitLevel + 1} (${FRUITS[editingFruitLevel].name})` : ""}</Text>
                   <Text style={{ color: COLORS.coral, fontWeight: '700', fontSize: 12 }}>두 손가락으로 사진을 줌인 및 이동하세요.</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
                  {editingFruitLevel !== null && wmImages[editingFruitLevel] && (
                    <View style={{ width: wmEditorSize, height: wmEditorSize, borderRadius: wmEditorSize / 2, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.line }}>
                      <InteractiveEditor 
                        uri={wmImages[editingFruitLevel].imageUri} frameSize={wmEditorSize} gridSize={1} scale={wmImages[editingFruitLevel].scale} offsetX={wmImages[editingFruitLevel].offsetX} offsetY={wmImages[editingFruitLevel].offsetY} 
                        onChange={(s:any, ox:any, oy:any) => setWmImages(prev => ({ ...prev, [editingFruitLevel]: { ...prev[editingFruitLevel], scale: s, offsetX: ox, offsetY: oy } }))} 
                      />
                    </View>
                  )}
                </View>
                <View style={{ flexShrink: 0, marginTop: 12 }}>
                   <View style={styles.btnRow}>
                     <Pressable onPress={() => choosePhotoForFruit(editingFruitLevel!)} style={styles.secondaryBtn}><Text style={styles.secondaryBtnText}>사진 교체</Text></Pressable>
                     <Pressable onPress={() => { const newImgs = { ...wmImages }; delete newImgs[editingFruitLevel!]; setWmImages(newImgs); setEditingFruitLevel(null); }} style={styles.secondaryBtn}><Text style={[styles.secondaryBtnText, {color: COLORS.coral}]}>초기화</Text></Pressable>
                   </View>
                   <Pressable onPress={() => setEditingFruitLevel(null)} style={[styles.primaryBtn, {width: '100%'}]}><Text style={styles.primaryBtnText}>저장 완료</Text></Pressable>
                </View>
             </View>
          </View>
        </Modal>

        <Modal visible={showPresetsModal && savePrompt === null && renameData === null} transparent animationType="slide">
           <View style={styles.modalOverlay}>
              <View style={styles.presetModalCard}>
                 <Text style={styles.presetModalTitle}>수박 프리셋</Text>
                 <ScrollView style={styles.presetList} showsVerticalScrollIndicator={false}>
                   {[{ id: "wm_default", name: "기본 세팅", difficulty: "normal", wmImages: {} } as WatermelonPreset, ...presets].map((p) => (
                     <View key={p.id} style={styles.presetItemWrapper}>
                       <Pressable onPress={() => { setSelectedId(p.id); setShowPresetsModal(false); }} style={styles.presetItemContent}>
                         <View style={{width: 48, height: 48, borderRadius: 10, backgroundColor: COLORS.line, alignItems: 'center', justifyContent: 'center'}}>
                           <Ionicons name="aperture" size={24} color={COLORS.muted} />
                         </View>
                         <View style={{marginLeft: 14, flex: 1}}>
                            <Text style={{fontWeight: '800', color: COLORS.ink, fontSize: 15}} numberOfLines={1}>{p.name}</Text>
                            <Text style={{fontSize: 12, color: COLORS.muted, marginTop: 4}}>난이도: {WATERMELON_DIFFICULTIES.find(d => d.id === p.difficulty)?.name || '기본'}</Text>
                         </View>
                       </Pressable>
                       {p.id !== "wm_default" && (
                         <View style={{flexDirection: 'row'}}>
                           <Pressable onPress={() => setRenameData({id: p.id, name: p.name})} style={styles.presetEditBtn}><Ionicons name="pencil" size={20} color={COLORS.muted} /></Pressable>
                           <Pressable onPress={() => { const up = presets.filter(pr => pr.id !== p.id); setPresets(up); AsyncStorage.setItem(WM_STORAGE_KEY, JSON.stringify(up)); if(selectedId === p.id) setSelectedId("wm_default"); }} style={styles.presetDeleteBtn}><Ionicons name="trash-outline" size={20} color={COLORS.coral} /></Pressable>
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

  const nextFruitObj = FRUITS[nextFruit];
  const nextImgObj = wmImages[nextFruit];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.gameContainer}>
        <View style={styles.gameTopBar}>
          <View style={styles.topSideContainer}>
            <Pressable onPress={() => setScreen("setup")} style={styles.iconButton} hitSlop={10}><Ionicons name="chevron-back" size={24} color={COLORS.ink} style={{ marginRight: 2 }} /></Pressable>
          </View>
          
          <View style={{alignItems: 'center'}}>
             <Text style={{fontSize: 26, fontWeight: '800', color: COLORS.ink}}>{score}</Text>
             <Text style={{fontSize: 11, fontWeight: '800', color: COLORS.muted, letterSpacing: 1.5}}>SCORE</Text>
          </View>
          
          <View style={[styles.topSideContainer, { alignItems: "flex-end", position: 'relative' }]}>
             <View style={styles.nextBoxBounding}>
                <Text style={{fontSize: 10, fontWeight: '800', color: COLORS.muted, position: 'absolute', top: 6, letterSpacing: 1}}>NEXT</Text>
                <View style={{ marginTop: 12, alignItems: 'center', justifyContent: 'center' }}>
                   <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: nextImgObj ? 'transparent' : nextFruitObj.color, borderWidth: nextImgObj ? 0 : 1, borderColor: 'rgba(0,0,0,0.1)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                      {nextImgObj && <PhotoCrop uri={nextImgObj.imageUri} size={44} scale={nextImgObj.scale} offsetX={nextImgObj.offsetX} offsetY={nextImgObj.offsetY} compact borderRadius={22} />}
                   </View>
                </View>
             </View>
          </View>
        </View>

        <View style={styles.boardWrapper}>
          <WatermelonBoard ref={boardRef} wmImages={wmImages} nextFruitLevel={nextFruit} onScoreUpdate={setScore} onGameOver={() => setGameOver(true)} onSuccess={() => setSuccess(true)} onDropSuccess={() => setNextFruit(getRandomNextFruit(difficulty))} />
        </View>
      </View>

      {(gameOver || success) && (
        <View style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(26,29,32,0.85)', zIndex: 100, justifyContent: 'center', alignItems: 'center', padding: 24}]}>
           <View style={styles.presetModalCard}>
              <Text style={{fontSize: 30, fontWeight: '800', color: success ? COLORS.teal : COLORS.coral, textAlign: 'center', marginBottom: 12}}>
                 {success ? "사진 완성!" : "게임 종료"}
              </Text>
              <Text style={{fontSize: 18, fontWeight: '700', color: COLORS.ink, textAlign: 'center', marginBottom: 32}}>최종 달성 점수: {score}</Text>
              <View style={styles.btnRow}>
                 <Pressable onPress={() => setScreen("setup")} style={styles.secondaryBtn}><Text style={styles.secondaryBtnText}>세팅으로 가기</Text></Pressable>
                 <Pressable onPress={() => { setScore(0); setGameOver(false); setSuccess(false); setNextFruit(getRandomNextFruit(difficulty)); boardRef.current?.resetGame(); }} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>다시 도전하기</Text></Pressable>
              </View>
           </View>
        </View>
      )}
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

  fruitGridItem: { width: '23.5%', height: '31%', backgroundColor: COLORS.paper, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  editBadge: { position: 'absolute', bottom: -2, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.coral, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.paper },

  gameContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, maxWidth: 600, alignSelf: "center", width: "100%" },
  gameTopBar: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingHorizontal: 4, zIndex: 2 },
  
  topSideContainer: { width: 100, alignItems: "flex-start", justifyContent: "center" },
  nextBoxBounding: { alignItems: 'center', justifyContent: 'center', width: 90, height: 90, borderRadius: 22, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  
  iconButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.panel, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.line, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  
  boardWrapper: { flex: 1, alignItems: "center", justifyContent: "center", width: "100%" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(26,29,32,0.85)", alignItems: "center", justifyContent: "center", padding: 24 },
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