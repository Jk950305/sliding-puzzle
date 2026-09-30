import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useLayoutEffect } from "react";
import { View, Image, StyleSheet, PanResponder } from "react-native";
import Matter from "matter-js";
import { FRUITS, WATERMELON_GAME_WIDTH, WATERMELON_GAME_HEIGHT } from "./watermelonEngine";
import { COLORS } from "./puzzleEngine";
import { sourceFor } from "./PuzzleElements";

const DEADLINE_Y = 100;

export const WatermelonBoard = forwardRef(({ wmImages, onScoreUpdate, onGameOver, onSuccess, nextFruitLevel, onDropSuccess }: any, ref) => {
  const engineRef = useRef(Matter.Engine.create());
  const [bodies, setBodies] = useState<any[]>([]);
  
  // 최초 중앙 스폰 유지
  const [mouseX, setMouseX] = useState(WATERMELON_GAME_WIDTH / 2);
  const [isDropping, setIsDropping] = useState(false);
  
  const frameRef = useRef<number>();
  const isGameOverRef = useRef(false);

  const nextFruitLevelRef = useRef(nextFruitLevel || 0);
  const isDroppingRef = useRef(isDropping);
  const mouseXRef = useRef(WATERMELON_GAME_WIDTH / 2);
  
  // 💡 드래그 시작 시점의 위치 기록
  const touchStartX = useRef(WATERMELON_GAME_WIDTH / 2);

  useLayoutEffect(() => {
    nextFruitLevelRef.current = nextFruitLevel || 0;
    isDroppingRef.current = isDropping;
  });

  useImperativeHandle(ref, () => ({
    resetGame: () => {
      Matter.Composite.clear(engineRef.current.world, false);
      initWorld();
      isGameOverRef.current = false;
      setIsDropping(false);
      mouseXRef.current = WATERMELON_GAME_WIDTH / 2;
      setMouseX(WATERMELON_GAME_WIDTH / 2);
    }
  }));

  const initWorld = () => {
    const { Bodies, Composite } = Matter;
    const THICKNESS = 60;
    const wallOptions = { isStatic: true, render: { visible: false }, friction: 0.1 };
    
    const ground = Bodies.rectangle(WATERMELON_GAME_WIDTH / 2, WATERMELON_GAME_HEIGHT - 2 + THICKNESS / 2, WATERMELON_GAME_WIDTH, THICKNESS, wallOptions);
    const wallLeft = Bodies.rectangle(2 - THICKNESS / 2, WATERMELON_GAME_HEIGHT / 2, THICKNESS, WATERMELON_GAME_HEIGHT * 2, wallOptions);
    const wallRight = Bodies.rectangle(WATERMELON_GAME_WIDTH - 2 + THICKNESS / 2, WATERMELON_GAME_HEIGHT / 2, THICKNESS, WATERMELON_GAME_HEIGHT * 2, wallOptions);
    const deadLine = Bodies.rectangle(WATERMELON_GAME_WIDTH / 2, DEADLINE_Y, WATERMELON_GAME_WIDTH, 2, { isStatic: true, isSensor: true, label: 'deadline' });

    Composite.add(engineRef.current.world, [ground, wallLeft, wallRight, deadLine]);
  };

  useEffect(() => {
    initWorld();
    const engine = engineRef.current;

    Matter.Events.on(engine, 'collisionStart', (event) => {
      if (isGameOverRef.current) return;
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        if (bodyA.label.startsWith('fruit_') && bodyA.label === bodyB.label) {
          const aData = bodyA as any; const bData = bodyB as any;
          if (aData.isMerging || bData.isMerging) return;
          aData.isMerging = true; bData.isMerging = true;

          const level = parseInt(bodyA.label.split('_')[1]);
          Matter.Composite.remove(engine.world, [bodyA, bodyB]);

          if (level < FRUITS.length - 1) {
            const nextLvl = level + 1;
            onScoreUpdate((prev: number) => prev + (nextLvl * 10));
            const newFruit = Matter.Bodies.circle(
              (bodyA.position.x + bodyB.position.x) / 2, (bodyA.position.y + bodyB.position.y) / 2,
              FRUITS[nextLvl].radius,
              { restitution: 0.2, friction: 0.1, label: `fruit_${nextLvl}`, plugin: { createdAt: Date.now() } }
            );
            Matter.Composite.add(engine.world, newFruit);

            if (nextLvl === FRUITS.length - 1) onSuccess();
          }
        }
      });
    });

    const updateLoop = () => {
      Matter.Engine.update(engine, 1000 / 60);
      const currentBodies = Matter.Composite.allBodies(engine.world).filter(b => b.label.startsWith('fruit_'));
      setBodies(currentBodies.map(b => ({
        id: b.id, x: b.position.x, y: b.position.y,
        angle: b.angle, radius: b.circleRadius,
        level: parseInt(b.label.split('_')[1])
      })));

      if (!isGameOverRef.current) {
        const isOver = currentBodies.some((body) => {
          const createdAt = (body.plugin as any)?.createdAt || 0;
          if (Date.now() - createdAt < 1000) return false;
          return (body.position.y - body.circleRadius) < DEADLINE_Y && body.velocity.y < 0.5 && Math.abs(body.velocity.x) < 0.5;
        });
        if (isOver) { isGameOverRef.current = true; onGameOver(); }
      }
      frameRef.current = requestAnimationFrame(updateLoop);
    };

    updateLoop();
    return () => cancelAnimationFrame(frameRef.current!);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (isDroppingRef.current || isGameOverRef.current) return;
        // 💡 [버그 픽스 1] 화면 어디를 터치하든 그 즉시 터치한 위치로 순간이동 (Touch to drop)
        const locX = evt.nativeEvent.locationX;
        const r = FRUITS[nextFruitLevelRef.current].radius;
        const safeX = Math.max(r + 5, Math.min(locX, WATERMELON_GAME_WIDTH - r - 5));
        
        // 💡 [버그 픽스 2] 터치한 지점을 시작 기준점으로 고정하여 드래그 튕김 방지
        touchStartX.current = safeX;
        mouseXRef.current = safeX;
        setMouseX(safeX);
      },
      onPanResponderMove: (evt, gesture) => {
        if (isDroppingRef.current || isGameOverRef.current) return;
        const r = FRUITS[nextFruitLevelRef.current].radius; 
        
        // 💡 [버그 픽스 2] 터치 시작점(touchStartX)에서부터 손가락 이동량(gesture.dx)만 더함
        const newX = touchStartX.current + gesture.dx;
        mouseXRef.current = Math.max(r + 5, Math.min(newX, WATERMELON_GAME_WIDTH - r - 5));
        setMouseX(mouseXRef.current);
      },
      onPanResponderRelease: () => {
        if (isDroppingRef.current || isGameOverRef.current) return;
        setIsDropping(true);
        const currentNextFruit = nextFruitLevelRef.current || 0; 
        const r = FRUITS[currentNextFruit].radius;
        const dropY = Math.max(60, r + 12);
        
        const newBody = Matter.Bodies.circle(mouseXRef.current, dropY, r, {
          restitution: 0.2, friction: 0.1, label: `fruit_${currentNextFruit}`, plugin: { createdAt: Date.now() }
        });
        Matter.Composite.add(engineRef.current.world, newBody);
        onDropSuccess();

        // 💡 [버그 픽스 3] 떨어뜨리고 0.7초 후 다시 정중앙으로 스폰 리셋
        setTimeout(() => {
          setIsDropping(false);
          mouseXRef.current = WATERMELON_GAME_WIDTH / 2;
          setMouseX(WATERMELON_GAME_WIDTH / 2);
        }, 700);
      }
    })
  ).current;

  const currentNext = nextFruitLevelRef.current || 0;
  const currentR = FRUITS[currentNext].radius;
  const displayDropY = Math.max(60, currentR + 12);
  const previewImg = (wmImages || {})[currentNext];
  const hasPreviewImage = !!previewImg;

  return (
    <View style={styles.outerBorderWrapper}>
      <View {...panResponder.panHandlers} style={{ width: WATERMELON_GAME_WIDTH, height: WATERMELON_GAME_HEIGHT, overflow: "hidden", backgroundColor: COLORS.panel }}>
        <View style={{ position: 'absolute', top: DEADLINE_Y, width: '100%', height: 2, backgroundColor: 'rgba(255, 90, 95, 0.4)', borderStyle: 'dashed', zIndex: 0 }} />
        
        {!isDropping && !isGameOverRef.current && (
          <View style={[styles.fruitCircle, { 
            left: mouseX - currentR, top: displayDropY - currentR, 
            width: currentR * 2, height: currentR * 2, borderRadius: currentR,
            backgroundColor: hasPreviewImage ? 'transparent' : FRUITS[currentNext].color,
            borderWidth: hasPreviewImage ? 0 : 1
          }]}>
            {hasPreviewImage && (
              <Image 
                source={sourceFor(previewImg.imageUri)} 
                style={{ position: 'absolute', width: currentR * 2 * previewImg.scale, height: currentR * 2 * previewImg.scale, left: -currentR * 2 * ((previewImg.scale - 1) / 2) + (previewImg.offsetX * currentR * 2), top: -currentR * 2 * ((previewImg.scale - 1) / 2) + (previewImg.offsetY * currentR * 2) }} 
                resizeMode="cover" 
              />
            )}
          </View>
        )}

        {bodies.map(b => {
          const wmImg = (wmImages || {})[b.level];
          const hasImage = !!wmImg;
          return (
            <View key={b.id} style={[styles.fruitCircle, { 
              left: b.x - b.radius, top: b.y - b.radius, width: b.radius * 2, height: b.radius * 2, borderRadius: b.radius, 
              backgroundColor: hasImage ? 'transparent' : FRUITS[b.level].color,
              borderWidth: hasImage ? 0 : 1, transform: [{ rotate: `${b.angle}rad` }] 
            }]}>
              {hasImage && (
                <Image 
                  source={sourceFor(wmImg.imageUri)} 
                  style={{ position: 'absolute', width: b.radius * 2 * wmImg.scale, height: b.radius * 2 * wmImg.scale, left: -b.radius * 2 * ((wmImg.scale - 1) / 2) + (wmImg.offsetX * b.radius * 2), top: -b.radius * 2 * ((wmImg.scale - 1) / 2) + (wmImg.offsetY * b.radius * 2) }} 
                  resizeMode="cover" 
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outerBorderWrapper: { borderRadius: 20, borderWidth: 2, borderColor: COLORS.line, overflow: 'hidden' }, 
  fruitCircle: { position: 'absolute', justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' },
});