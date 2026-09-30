import React, { useLayoutEffect, useRef, useState } from "react";
import { View, Image, StyleSheet, PanResponder, Text, Pressable } from "react-native";
import { getCoord, getShiftPath, clamp, COLORS } from "./puzzleEngine";

export const sourceFor = (uri: string) => ({ uri });

export function PhotoCrop({ uri, size, scale, offsetX, offsetY, compact = false, borderRadius = null }: any) {
  const imageSize = size * scale;
  const absX = offsetX * size;
  const absY = offsetY * size;
  return (
    <View style={[styles.cropFrame, { width: size, height: size, borderRadius: borderRadius || (compact ? 14 : 20) }]}>
      <Image source={sourceFor(uri)} resizeMode="cover" style={{ position: "absolute", width: imageSize, height: imageSize, left: (size - imageSize) / 2 + absX, top: (size - imageSize) / 2 + absY }} />
    </View>
  );
}

export function InteractiveEditor({ uri, frameSize, gridSize, scale: initialScale, offsetX: initialX, offsetY: initialY, onChange }: any) {
  const [scale, setScale] = useState(initialScale || 1);
  const [offsetX, setOffsetX] = useState(initialX || 0);
  const [offsetY, setOffsetY] = useState(initialY || 0);

  const curr = useRef({ s: initialScale || 1, x: initialX || 0, y: initialY || 0 });
  const touchState = useRef({ touches: 0, lastX: 0, lastY: 0, initialDist: 0, initialScale: 1 });

  useLayoutEffect(() => {
    setScale(initialScale || 1); setOffsetX(initialX || 0); setOffsetY(initialY || 0);
    curr.current = { s: initialScale || 1, x: initialX || 0, y: initialY || 0 };
  }, [initialScale, initialX, initialY, uri]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        touchState.current.touches = touches.length;
        if (touches.length === 1) {
          touchState.current.lastX = touches[0].pageX; touchState.current.lastY = touches[0].pageY;
        } else if (touches.length >= 2) {
          const dx = touches[0].pageX - touches[1].pageX; const dy = touches[0].pageY - touches[1].pageY;
          touchState.current.initialDist = Math.sqrt(dx * dx + dy * dy); touchState.current.initialScale = curr.current.s;
        }
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;
        const state = touchState.current;
        if (touches.length !== state.touches) {
          state.touches = touches.length;
          if (touches.length === 1) { state.lastX = touches[0].pageX; state.lastY = touches[0].pageY; } 
          else if (touches.length >= 2) {
            const dx = touches[0].pageX - touches[1].pageX; const dy = touches[0].pageY - touches[1].pageY;
            state.initialDist = Math.sqrt(dx * dx + dy * dy); state.initialScale = curr.current.s;
          }
          return;
        }
        if (touches.length === 1) {
          const dx = touches[0].pageX - state.lastX; const dy = touches[0].pageY - state.lastY;
          state.lastX = touches[0].pageX; state.lastY = touches[0].pageY;
          const boundRatio = (curr.current.s - 1) / 2; 
          curr.current.x = clamp(curr.current.x + dx / frameSize, -boundRatio, boundRatio);
          curr.current.y = clamp(curr.current.y + dy / frameSize, -boundRatio, boundRatio);
          setOffsetX(curr.current.x); setOffsetY(curr.current.y);
        } else if (touches.length >= 2) {
          const dx = touches[0].pageX - touches[1].pageX; const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const scaleDelta = dist / state.initialDist;
          const nextScale = clamp(state.initialScale * scaleDelta, 1, 4);
          const boundRatio = (nextScale - 1) / 2;
          curr.current.s = nextScale;
          curr.current.x = clamp(curr.current.x, -boundRatio, boundRatio);
          curr.current.y = clamp(curr.current.y, -boundRatio, boundRatio);
          setScale(curr.current.s); setOffsetX(curr.current.x); setOffsetY(curr.current.y);
        }
      },
      onPanResponderRelease: () => { touchState.current.touches = 0; onChange(curr.current.s, curr.current.x, curr.current.y); },
      onPanResponderTerminate: () => { touchState.current.touches = 0; onChange(curr.current.s, curr.current.x, curr.current.y); },
    })
  ).current;

  const cellSize = frameSize / gridSize;
  const imageSize = frameSize * scale;
  const absX = offsetX * frameSize;
  const absY = offsetY * frameSize;

  return (
    <View {...panResponder.panHandlers} style={{ width: frameSize, height: frameSize, overflow: "hidden", backgroundColor: COLORS.ink, flexShrink: 0 }}>
      <Image source={sourceFor(uri)} style={{ position: "absolute", width: imageSize, height: imageSize, left: (frameSize - imageSize) / 2 + absX, top: (frameSize - imageSize) / 2 + absY }} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
        {Array.from({ length: gridSize - 1 }).map((_, i) => <View key={`v${i}`} style={{ position: "absolute", left: (i + 1) * cellSize, top: 0, bottom: 0, width: 1.5, backgroundColor: "rgba(255,255,255,0.7)" }} />)}
        {Array.from({ length: gridSize - 1 }).map((_, i) => <View key={`h${i}`} style={{ position: "absolute", top: (i + 1) * cellSize, left: 0, right: 0, height: 1.5, backgroundColor: "rgba(255,255,255,0.7)" }} />)}
      </View>
    </View>
  );
}

function PuzzleTile({ boardSize, emptyIndex, index, preset, size, tile, tileSize, onMovePath, lineDrag, onLinePreview, interactive }: any) {
  const indexRef = useRef(index); const emptyIndexRef = useRef(emptyIndex); const sizeRef = useRef(size);
  const tileSizeRef = useRef(tileSize); const onMovePathRef = useRef(onMovePath); const onLinePreviewRef = useRef(onLinePreview);
  const interactiveRef = useRef(interactive);

  useLayoutEffect(() => {
    indexRef.current = index; emptyIndexRef.current = emptyIndex; sizeRef.current = size;
    tileSizeRef.current = tileSize; onMovePathRef.current = onMovePath;
    onLinePreviewRef.current = onLinePreview; interactiveRef.current = interactive;
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => interactiveRef.current,
      onStartShouldSetPanResponderCapture: () => interactiveRef.current,
      onMoveShouldSetPanResponder: () => interactiveRef.current,
      onMoveShouldSetPanResponderCapture: () => interactiveRef.current,
      onPanResponderMove: (_, gesture) => {
        if (!interactiveRef.current) return;
        const path = getShiftPath(indexRef.current, emptyIndexRef.current, sizeRef.current);
        if (!path) return onLinePreviewRef.current(null);
        const from = getCoord(indexRef.current, sizeRef.current); const to = getCoord(emptyIndexRef.current, sizeRef.current);
        const isHorizontal = from.r === to.r; const direction = Math.sign(isHorizontal ? to.c - from.c : to.r - from.r);
        const clampedDelta = clamp(isHorizontal ? gesture.dx : gesture.dy, direction < 0 ? -tileSizeRef.current : 0, direction > 0 ? tileSizeRef.current : 0);
        onLinePreviewRef.current({ path, delta: clampedDelta, axis: isHorizontal ? "x" : "y" });
      },
      onPanResponderRelease: (_, gesture) => {
        if (!interactiveRef.current) return;
        const path = getShiftPath(indexRef.current, emptyIndexRef.current, sizeRef.current);
        if (!path) return onLinePreviewRef.current(null);
        const from = getCoord(indexRef.current, sizeRef.current); const to = getCoord(emptyIndexRef.current, sizeRef.current);
        const isHorizontal = from.r === to.r; const direction = Math.sign(isHorizontal ? to.c - from.c : to.r - from.r);
        const clampedDelta = clamp(isHorizontal ? gesture.dx : gesture.dy, direction < 0 ? -tileSizeRef.current : 0, direction > 0 ? tileSizeRef.current : 0);
        if ((Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10) || Math.abs(clampedDelta) >= 10) onMovePathRef.current(path);
        onLinePreviewRef.current(null);
      },
      onPanResponderTerminate: () => interactiveRef.current && onLinePreviewRef.current(null),
    })
  ).current;

  const row = Math.floor(tile / size); const column = tile % size;
  const currentCoord = getCoord(index, size);
  const tileLeft = 5 + currentCoord.c * tileSize; const tileTop = 5 + (currentCoord.r + 1) * tileSize;

  let visualOffset = { x: 0, y: 0 };
  if (lineDrag && lineDrag.path.includes(index)) {
    if (lineDrag.axis === "x") visualOffset.x = lineDrag.delta; else visualOffset.y = lineDrag.delta;
  }

  const absX = (preset.offsetX || 0) * boardSize; const absY = (preset.offsetY || 0) * boardSize;

  return (
    <View {...panResponder.panHandlers} style={[styles.tile, { width: tileSize, height: tileSize, left: tileLeft, top: tileTop, transform: [{ translateX: visualOffset.x }, { translateY: visualOffset.y }] }]}>
      <View style={styles.tileClip}>
        <Image source={sourceFor(preset.imageUri)} resizeMode="cover" style={{ position: "absolute", width: boardSize * preset.scale, height: boardSize * preset.scale, left: -column * tileSize + (boardSize - boardSize * preset.scale) / 2 + absX, top: -row * tileSize + (boardSize - boardSize * preset.scale) / 2 + absY }} />
        <View style={styles.tileShine} />
      </View>
    </View>
  );
}

export function PuzzleBoard({ preset, tiles, boardSize, onMovePath, lineDrag, onLinePreview }: any) {
  const tileSize = (boardSize - 10) / preset.size;
  const interactive = (tiles || []).some((tile: any, idx: number) => tile !== (idx === 0 ? null : idx - 1));

  return (
    <View style={[styles.board, { width: boardSize, height: tileSize * (preset.size + 1) + 10 }]}>
      <View pointerEvents="none" style={[styles.emptyConnector, { width: tileSize + 10, height: tileSize + 5, left: 0, top: 0 }]} />
      <View pointerEvents="none" style={[styles.gridSurface, { width: boardSize, height: tileSize * preset.size + 5, left: 0, top: tileSize }]} />
      {(tiles || []).map((tile: any, index: number) => {
        if (tile === null) {
          const coord = getCoord(index, preset.size);
          return <View key="empty" style={[styles.emptyTile, { width: tileSize, height: tileSize, left: 5 + coord.c * tileSize, top: 5 + (coord.r + 1) * tileSize }]} />;
        }
        return <PuzzleTile key={`${tile}-${index}`} boardSize={boardSize} emptyIndex={tiles.indexOf(null)} index={index} preset={preset} size={preset.size} tile={tile} tileSize={tileSize} onMovePath={onMovePath} lineDrag={lineDrag} onLinePreview={onLinePreview} interactive={interactive} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  cropFrame: { overflow: "hidden", backgroundColor: COLORS.line, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  board: { position: "relative", zIndex: 1, borderRadius: 20, overflow: "hidden", padding: 3, marginTop: 2, marginBottom: 16 },
  gridSurface: { position: "absolute", backgroundColor: COLORS.ink, borderTopLeftRadius: 0, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  emptyConnector: { position: "absolute", backgroundColor: COLORS.ink, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, zIndex: 0 },
  tile: { position: "absolute", padding: 2, zIndex: 3 },
  tileClip: { flex: 1, overflow: "hidden", borderRadius: 10, backgroundColor: "#E5E2D9" },
  tileShine: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", borderRadius: 10 },
  emptyTile: { position: "absolute", backgroundColor: COLORS.ink, borderRadius: 10, zIndex: 1 },
});