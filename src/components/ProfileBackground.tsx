import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, Text, StyleSheet, Dimensions, InteractionManager } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

interface Props {
  theme: string;
  active?: boolean;
}

export function ProfileBackground({ theme, active = true }: Props) {
  if (theme === 'none' || !theme) return null;
  if (!active) return null;

  const [ready, setReady] = useState(false);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setReady(true);
    });
    return () => task.cancel();
  }, []);

  if (!ready) return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0D0730' }]} pointerEvents="none" />
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {theme === 'sakura'      && <SakuraBackground />}
      {theme === 'galaxy'      && <GalaxyBackground />}
      {theme === 'ocean_wave'  && <OceanWaveBackground />}
      {theme === 'dragon_fire' && <DragonFireBackground />}
      {theme === 'matrix'      && <MatrixBackground />}
      {theme === 'aurora'      && <AuroraBackground />}
      {theme === 'desert_wind' && <DesertWindBackground />}
      {theme === 'lightning'   && <LightningBackground />}
    </View>
  );
}

// ═══════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════
function Particle({ x, startY, endY, duration, delay, size, color, opacity, swayAmount, swayDuration, rotate: doRotate }: {
  x: number; startY: number; endY: number; duration: number; delay: number;
  size: number; color: string; opacity: number;
  swayAmount?: number; swayDuration?: number; rotate?: boolean;
}) {
  const ty = useRef(new Animated.Value(startY)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const go = () => {
      ty.setValue(startY);
      tx.setValue(0);
      rot.setValue(0);
      Animated.parallel([
        Animated.timing(ty, { toValue: endY, duration, delay, useNativeDriver: true, easing: Easing.linear }),
        swayAmount ? Animated.loop(Animated.sequence([
          Animated.timing(tx, { toValue: swayAmount, duration: swayDuration || 2000, useNativeDriver: true }),
          Animated.timing(tx, { toValue: -swayAmount, duration: swayDuration || 2000, useNativeDriver: true }),
        ])) : Animated.timing(tx, { toValue: 0, duration: 1, useNativeDriver: true }),
        doRotate ? Animated.loop(Animated.timing(rot, { toValue: 1, duration: 3000 + Math.random() * 3000, easing: Easing.linear, useNativeDriver: true })) :
          Animated.timing(rot, { toValue: 0, duration: 1, useNativeDriver: true }),
      ]).start(() => go());
    };
    go();
  }, []);

  const rotStr = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View
      renderToHardwareTextureAndroid
      style={{
        position: 'absolute', left: x,
        width: size, height: size * (color === 'petal' ? 0.6 : 1),
        borderRadius: size / 2,
        backgroundColor: color === 'petal' ? '#F9A8D4' : color,
        opacity,
        transform: [{ translateY: ty }, { translateX: tx }, ...(doRotate ? [{ rotate: rotStr }] : [])],
      }}
    />
  );
}

function TwinkStar({ x, y, size, dur, delay }: { x: number; y: number; size: number; dur: number; delay: number }) {
  const op = useRef(new Animated.Value(Math.random())).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(op, { toValue: 0.1, duration: dur, delay, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: dur, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View renderToHardwareTextureAndroid style={{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFF', opacity: op }} />;
}

// ═══════════════════════════════════════════
// 1. SAKURA — 3D Cherry Blossom
// ═══════════════════════════════════════════
function SakuraBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0D0730' }]}>
      {/* Sky depth layers */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: H * 0.3, backgroundColor: '#1A0A30' }} />
      <View style={{ position: 'absolute', top: H * 0.3, left: 0, right: 0, height: H * 0.2, backgroundColor: '#150828' }} />

      {/* Atmospheric depth glow */}
      <View style={{ position: 'absolute', top: H * 0.2, left: W * 0.3, width: 200, height: 200, borderRadius: 100, backgroundColor: '#7C3AED', opacity: 0.04 }} />

      {/* Moon with glow rings */}
      <View style={{ position: 'absolute', top: H * 0.06, right: W * 0.12, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#FDE68A', opacity: 0.04 }} />
        <View style={{ position: 'absolute', width: 75, height: 75, borderRadius: 37, backgroundColor: '#FDE68A', opacity: 0.08 }} />
        <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#FDE68A', opacity: 0.25 }} />
      </View>

      {/* FAR petals — tiny, slow, faint */}
      {Array.from({ length: 8 }, (_, i) => (
        <Particle key={`f${i}`} x={Math.random() * W} startY={-20} endY={H + 30}
          duration={10000 + Math.random() * 6000} delay={Math.random() * 12000}
          size={5 + Math.random() * 4} color="petal" opacity={0.15 + Math.random() * 0.15}
          swayAmount={10 + Math.random() * 15} swayDuration={3000} rotate />
      ))}

      {/* MID petals */}
      {Array.from({ length: 6 }, (_, i) => (
        <Particle key={`m${i}`} x={Math.random() * W} startY={-20} endY={H + 30}
          duration={7000 + Math.random() * 5000} delay={Math.random() * 10000}
          size={8 + Math.random() * 6} color="petal" opacity={0.25 + Math.random() * 0.25}
          swayAmount={20 + Math.random() * 25} swayDuration={2500} rotate />
      ))}

      {/* NEAR petals — large, fast, bright */}
      {Array.from({ length: 4 }, (_, i) => (
        <Particle key={`n${i}`} x={Math.random() * W} startY={-30} endY={H + 40}
          duration={5000 + Math.random() * 3000} delay={Math.random() * 8000}
          size={14 + Math.random() * 8} color="petal" opacity={0.4 + Math.random() * 0.4}
          swayAmount={30 + Math.random() * 40} swayDuration={2000} rotate />
      ))}

      {/* Tree silhouettes — near (thick) and far (thin) */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, backgroundColor: '#0A0520' }} />
      {[{ x: -10, h: 70, w: 12 }, { x: W * 0.2, h: 55, w: 8 }, { x: W * 0.5, h: 85, w: 14 }, { x: W * 0.75, h: 45, w: 6 }, { x: W * 0.9, h: 65, w: 10 }].map((t, i) => (
        <View key={i} style={{ position: 'absolute', bottom: 80, left: t.x, width: t.w, height: t.h, backgroundColor: '#0A0520', borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
      ))}
      {/* Far branches — lighter */}
      {[W * 0.35, W * 0.65].map((x, i) => (
        <View key={`fb${i}`} style={{ position: 'absolute', bottom: 85, left: x, width: 4, height: 30, backgroundColor: '#120A28', borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════
// 2. GALAXY — 3D Space
// ═══════════════════════════════════════════
function GalaxyBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#030014' }]}>
      {/* Deep nebulae — large background blobs */}
      {[
        { c: '#7C3AED', x: W * 0.15, y: H * 0.1, s: 220 },
        { c: '#EC4899', x: W * 0.75, y: H * 0.35, s: 180 },
        { c: '#3B82F6', x: W * 0.25, y: H * 0.65, s: 250 },
        { c: '#6366F1', x: W * 0.6, y: H * 0.8, s: 160 },
        { c: '#14B8A6', x: W * 0.5, y: H * 0.2, s: 140 },
      ].map((n, i) => <NebulaBlob key={i} color={n.c} x={n.x} y={n.y} size={n.s} />)}

      {/* Milky way band — diagonal glow */}
      <View style={{ position: 'absolute', top: H * 0.1, left: -50, width: W + 100, height: 60, backgroundColor: '#A78BFA', opacity: 0.03, transform: [{ rotate: '-25deg' }] }} />
      <View style={{ position: 'absolute', top: H * 0.12, left: -50, width: W + 100, height: 30, backgroundColor: '#C4B5FD', opacity: 0.04, transform: [{ rotate: '-25deg' }] }} />

      {/* FAR stars — tiny, many */}
      {Array.from({ length: 50 }, (_, i) => (
        <TwinkStar key={`f${i}`} x={Math.random() * W} y={Math.random() * H} size={0.8 + Math.random() * 1} dur={2000 + Math.random() * 4000} delay={Math.random() * 3000} />
      ))}
      {/* MID stars */}
      {Array.from({ length: 25 }, (_, i) => (
        <TwinkStar key={`m${i}`} x={Math.random() * W} y={Math.random() * H} size={1.5 + Math.random() * 1.5} dur={1500 + Math.random() * 3000} delay={Math.random() * 2000} />
      ))}
      {/* NEAR stars — bright, few */}
      {Array.from({ length: 8 }, (_, i) => (
        <TwinkStar key={`n${i}`} x={Math.random() * W} y={Math.random() * H} size={2.5 + Math.random() * 2} dur={1000 + Math.random() * 2000} delay={Math.random() * 1000} />
      ))}

      {/* Distant galaxy spiral */}
      <GalaxySpiral />

      {/* Shooting stars */}
      <ShootingStars interval={3500} />
    </View>
  );
}

function NebulaBlob({ color, x, y, size }: { color: string; x: number; y: number; size: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.2, duration: 5000 + Math.random() * 3000, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.85, duration: 5000 + Math.random() * 3000, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: 0.07, transform: [{ scale: pulse }] }} />;
}

function GalaxySpiral() {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(rot, { toValue: 1, duration: 60000, easing: Easing.linear, useNativeDriver: true })).start();
  }, []);
  const r = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ position: 'absolute', top: H * 0.55, right: W * 0.05, width: 80, height: 80, transform: [{ rotate: r }] }}>
      <View style={{ width: 80, height: 40, borderTopLeftRadius: 40, borderTopRightRadius: 40, backgroundColor: '#6366F1', opacity: 0.06 }} />
      <View style={{ width: 60, height: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#818CF8', opacity: 0.04, marginLeft: 10 }} />
    </Animated.View>
  );
}

function ShootingStars({ interval }: { interval: number }) {
  const [stars, setStars] = useState<number[]>([]);
  useEffect(() => {
    const t = setInterval(() => {
      const id = Date.now();
      setStars(p => [...p, id]);
      setTimeout(() => setStars(p => p.filter(s => s !== id)), 1500);
    }, interval);
    return () => clearInterval(t);
  }, []);
  return <>{stars.map(id => <ShootingStar key={id} />)}</>;
}

function ShootingStar() {
  const p = useRef(new Animated.Value(0)).current;
  const sx = Math.random() * W * 0.6;
  const sy = Math.random() * H * 0.3;
  useEffect(() => {
    Animated.timing(p, { toValue: 1, duration: 1000 + Math.random() * 400, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', left: sx, top: sy, width: 50, height: 2, borderRadius: 1, backgroundColor: '#FFF',
      opacity: p.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.8, 0] }),
      transform: [
        { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, 180] }) },
        { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, 100] }) },
        { rotate: '30deg' },
      ],
    }} />
  );
}

// ═══════════════════════════════════════════
// 3. OCEAN WAVE — 3D Underwater
// ═══════════════════════════════════════════
function OceanWaveBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#031525' }]}>
      {/* Sky */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: H * 0.3, backgroundColor: '#0A1E35' }} />

      {/* Underwater light rays */}
      {[W * 0.15, W * 0.35, W * 0.55, W * 0.75, W * 0.9].map((x, i) => (
        <LightRay key={i} x={x} delay={i * 800} />
      ))}

      {/* FAR waves */}
      <WaveLayer y={H * 0.30} color="rgba(14,165,233,0.08)" period={7000} h={40} />
      <WaveLayer y={H * 0.34} color="rgba(14,165,233,0.10)" period={9000} h={35} />
      {/* MID waves */}
      <WaveLayer y={H * 0.40} color="rgba(14,165,233,0.14)" period={6000} h={55} />
      <WaveLayer y={H * 0.46} color="rgba(6,82,148,0.18)" period={7500} h={50} />
      {/* NEAR waves — large */}
      <WaveLayer y={H * 0.52} color="rgba(6,82,148,0.22)" period={5000} h={70} />
      <WaveLayer y={H * 0.58} color="rgba(4,50,100,0.28)" period={6500} h={80} />

      {/* Deep water */}
      <View style={{ position: 'absolute', top: H * 0.55, left: 0, right: 0, bottom: 0, backgroundColor: '#021020' }} />

      {/* Caustic patches */}
      {Array.from({ length: 6 }, (_, i) => (
        <CausticPatch key={i} x={W * 0.1 + Math.random() * W * 0.8} y={H * 0.6 + Math.random() * H * 0.3} delay={Math.random() * 4000} />
      ))}

      {/* Bubbles at 3 depths */}
      {Array.from({ length: 10 }, (_, i) => (
        <Bubble key={i} x={W * 0.05 + Math.random() * W * 0.9} size={2 + Math.random() * (i < 3 ? 4 : i < 7 ? 7 : 10)} dur={3000 + Math.random() * 4000} delay={Math.random() * 5000} opacity={i < 3 ? 0.15 : i < 7 ? 0.3 : 0.5} />
      ))}

      {/* Surface sparkles */}
      {Array.from({ length: 10 }, (_, i) => (
        <Sparkle key={i} x={Math.random() * W} y={H * 0.28 + Math.random() * H * 0.1} delay={Math.random() * 3000} />
      ))}
    </View>
  );
}

function LightRay({ x, delay }: { x: number; delay: number }) {
  const op = useRef(new Animated.Value(0.03)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(op, { toValue: 0.08, duration: 3000, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0.02, duration: 3000, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ position: 'absolute', top: H * 0.25, left: x, width: 30, height: H * 0.5, backgroundColor: '#93C5FD', opacity: op, transform: [{ rotate: `${-10 + Math.random() * 20}deg` }] }} />;
}

function WaveLayer({ y, color, period, h }: { y: number; color: string; period: number; h: number }) {
  const tx = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(tx, { toValue: -50, duration: period, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(tx, { toValue: 50, duration: period, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(tx, { toValue: 0, duration: period, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ position: 'absolute', top: y, left: -30, width: W + 60, height: h, borderTopLeftRadius: h, borderTopRightRadius: h, backgroundColor: color, transform: [{ translateX: tx }] }} />;
}

function CausticPatch({ x, y, delay }: { x: number; y: number; delay: number }) {
  const sc = useRef(new Animated.Value(1)).current;
  const op = useRef(new Animated.Value(0.05)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(sc, { toValue: 1.5, duration: 1500, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.15, duration: 750, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(sc, { toValue: 0.8, duration: 1500, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.03, duration: 750, useNativeDriver: true }),
      ]),
    ])).start();
  }, []);
  return <Animated.View style={{ position: 'absolute', left: x, top: y, width: 40, height: 40, borderRadius: 20, backgroundColor: '#0EA5E9', opacity: op, transform: [{ scale: sc }] }} />;
}

function Bubble({ x, size, dur, delay, opacity }: { x: number; size: number; dur: number; delay: number; opacity: number }) {
  const ty = useRef(new Animated.Value(H * 0.85)).current;
  const op = useRef(new Animated.Value(opacity)).current;
  useEffect(() => {
    const rise = () => {
      ty.setValue(H * 0.85); op.setValue(opacity);
      Animated.parallel([
        Animated.timing(ty, { toValue: H * 0.3, duration: dur, delay, useNativeDriver: true }),
        Animated.sequence([Animated.delay(delay + dur * 0.7), Animated.timing(op, { toValue: 0, duration: dur * 0.3, useNativeDriver: true })]),
      ]).start(() => rise());
    };
    rise();
  }, []);
  return <Animated.View style={{ position: 'absolute', left: x, width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: 'rgba(147,197,253,0.3)', backgroundColor: 'transparent', opacity: op, transform: [{ translateY: ty }] }} />;
}

function Sparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  const sc = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(sc, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(sc, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.delay(1500 + Math.random() * 2500),
    ])).start();
  }, []);
  return <Animated.View style={{ position: 'absolute', left: x, top: y, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF', opacity: 0.7, transform: [{ scale: sc }] }} />;
}

// ═══════════════════════════════════════════
// 4. DRAGON FIRE — 3D Inferno
// ═══════════════════════════════════════════
function DragonFireBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1A0000' }]}>
      {/* Volumetric light cone */}
      <View style={{ position: 'absolute', bottom: 0, left: W * 0.2, width: 0, height: 0, borderLeftWidth: W * 0.3, borderRightWidth: W * 0.3, borderBottomWidth: H * 0.6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'rgba(255,69,0,0.03)', transform: [{ rotate: '180deg' }] }} />

      {/* FAR flames — tiny */}
      {Array.from({ length: 8 }, (_, i) => (
        <Flame key={`f${i}`} x={W * 0.1 + Math.random() * W * 0.8} size={4 + Math.random() * 5} dur={2500 + Math.random() * 2000} delay={Math.random() * 4000} maxH={0.15 + Math.random() * 0.2} color={['#FF4500', '#FF6B00', '#CC3700'][i % 3]} opacity={0.3} />
      ))}
      {/* MID flames */}
      {Array.from({ length: 10 }, (_, i) => (
        <Flame key={`m${i}`} x={W * 0.15 + Math.random() * W * 0.7} size={8 + Math.random() * 10} dur={1800 + Math.random() * 2000} delay={Math.random() * 3000} maxH={0.25 + Math.random() * 0.3} color={['#FF4500', '#FF6B00', '#FFB800'][i % 3]} opacity={0.5} />
      ))}
      {/* NEAR flames — large */}
      {Array.from({ length: 5 }, (_, i) => (
        <Flame key={`n${i}`} x={W * 0.2 + Math.random() * W * 0.6} size={14 + Math.random() * 12} dur={1200 + Math.random() * 1500} delay={Math.random() * 2000} maxH={0.35 + Math.random() * 0.3} color={['#FF6B00', '#FFB800', '#FFD700'][i % 3]} opacity={0.7} />
      ))}
      {/* White-hot core */}
      {Array.from({ length: 5 }, (_, i) => (
        <Flame key={`w${i}`} x={W * 0.35 + Math.random() * W * 0.3} size={6 + Math.random() * 8} dur={1000 + Math.random() * 800} delay={Math.random() * 1500} maxH={0.1 + Math.random() * 0.15} color="#FFF5E0" opacity={0.6} />
      ))}

      {/* Ember sparks */}
      {Array.from({ length: 10 }, (_, i) => (
        <Ember key={i} x={W * 0.25 + Math.random() * W * 0.5} delay={Math.random() * 5000} dir={Math.random() > 0.5 ? 1 : -1} />
      ))}

      {/* Ground glow reflection */}
      <View style={{ position: 'absolute', bottom: -20, left: W * 0.15, right: W * 0.15, height: 50, borderRadius: 25, backgroundColor: '#FF4500', opacity: 0.06 }} />
      <View style={{ position: 'absolute', bottom: -10, left: W * 0.25, right: W * 0.25, height: 30, borderRadius: 15, backgroundColor: '#FFB800', opacity: 0.04 }} />
      {/* Dark ground */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, backgroundColor: '#0A0000' }} />
    </View>
  );
}

function Flame({ x, size, dur, delay, maxH, color, opacity }: {
  x: number; size: number; dur: number; delay: number; maxH: number; color: string; opacity: number;
}) {
  const ty = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const go = () => {
      ty.setValue(H * 0.88); op.setValue(0); sway.setValue(0);
      Animated.parallel([
        Animated.timing(ty, { toValue: H * (0.88 - maxH), duration: dur, delay, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(op, { toValue: opacity, duration: 150, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0, duration: dur * 0.7, useNativeDriver: true }),
        ]),
        Animated.loop(Animated.sequence([
          Animated.timing(sway, { toValue: 8, duration: 250, useNativeDriver: true }),
          Animated.timing(sway, { toValue: -8, duration: 250, useNativeDriver: true }),
        ])),
      ]).start(() => go());
    };
    go();
  }, []);
  return <Animated.View style={{ position: 'absolute', left: x, width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: op, transform: [{ translateY: ty }, { translateX: sway }] }} />;
}

function Ember({ x, delay, dir }: { x: number; delay: number; dir: number }) {
  const ty = useRef(new Animated.Value(0)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const go = () => {
      ty.setValue(H * 0.78); tx.setValue(0); op.setValue(0);
      Animated.parallel([
        Animated.timing(ty, { toValue: H * 0.2, duration: 2500, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(tx, { toValue: dir * (50 + Math.random() * 80), duration: 2500, delay, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(op, { toValue: 1, duration: 80, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ]),
      ]).start(() => go());
    };
    go();
  }, []);
  return <Animated.View style={{ position: 'absolute', left: x, width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FCD34D', opacity: op, transform: [{ translateY: ty }, { translateX: tx }] }} />;
}

// ═══════════════════════════════════════════
// 5. MATRIX — 3D Digital Rain
// ═══════════════════════════════════════════
function MatrixBackground() {
  const CHARS = 'أبتثجحخدذرزسشصضطظعغفقكلمنهوي٠١٢٣٤٥٦٧٨٩كلمات';

  // 3 depth layers
  const FAR = Array.from({ length: 8 }, (_, i) => ({ x: i * (W / 8) + 2, fs: 10, spd: 8000 + Math.random() * 4000, len: 10, op: 0.2 }));
  const MID = Array.from({ length: 10 }, (_, i) => ({ x: i * (W / 10) + 1, fs: 14, spd: 5000 + Math.random() * 3000, len: 8, op: 0.5 }));
  const NEAR = Array.from({ length: 7 }, (_, i) => ({ x: i * (W / 7) + 4, fs: 18, spd: 3000 + Math.random() * 2000, len: 6, op: 0.85 }));

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000800' }]}>
      {/* Scanlines */}
      {Array.from({ length: 25 }, (_, i) => (
        <View key={i} style={{ position: 'absolute', top: i * (H / 25), left: 0, right: 0, height: 1, backgroundColor: '#003300', opacity: 0.15 }} />
      ))}

      {FAR.map((c, i) => <MCol key={`f${i}`} x={c.x} chars={CHARS} speed={c.spd} len={c.len} fontSize={c.fs} baseOpacity={c.op} delay={Math.random() * 4000} />)}
      {MID.map((c, i) => <MCol key={`m${i}`} x={c.x} chars={CHARS} speed={c.spd} len={c.len} fontSize={c.fs} baseOpacity={c.op} delay={Math.random() * 3000} />)}
      {NEAR.map((c, i) => <MCol key={`n${i}`} x={c.x} chars={CHARS} speed={c.spd} len={c.len} fontSize={c.fs} baseOpacity={c.op} delay={Math.random() * 2000} />)}

      {/* Green ambient glow */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: '#00FF41', opacity: 0.02 }} />

      {/* "كلمات" flash */}
      <KalimatFlash />
    </View>
  );
}

function MCol({ x, chars, speed, len, fontSize, baseOpacity, delay }: {
  x: number; chars: string; speed: number; len: number; fontSize: number; baseOpacity: number; delay: number;
}) {
  const ty = useRef(new Animated.Value(-len * (fontSize + 4))).current;
  const [col, setCol] = useState(() => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]));
  useEffect(() => {
    const go = () => {
      setCol(Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]));
      ty.setValue(-len * (fontSize + 4));
      Animated.timing(ty, { toValue: H + 50, duration: speed, delay, easing: Easing.linear, useNativeDriver: true }).start(() => go());
    };
    go();
    const t = setInterval(() => setCol(Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)])), speed / 3);
    return () => clearInterval(t);
  }, []);

  return (
    <Animated.View style={{ position: 'absolute', left: x, transform: [{ translateY: ty }] }}>
      {col.map((ch, i) => (
        <Text key={i} style={{
          color: i >= len - 2 ? '#00FF41' : i >= len - 4 ? '#00CC33' : '#003300',
          fontSize, opacity: (i >= len - 2 ? 1 : 0.3 + (i / len) * 0.5) * baseOpacity,
          fontWeight: i >= len - 2 ? '900' : '400',
          lineHeight: fontSize + 4, textAlign: 'center', width: fontSize + 4,
        }}>{ch}</Text>
      ))}
    </Animated.View>
  );
}

function KalimatFlash() {
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const flash = () => {
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(op, { toValue: 0.15, duration: 80, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0, duration: 80, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0.25, duration: 80, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start(flash);
      }, 8000 + Math.random() * 12000);
    };
    flash();
  }, []);
  return <Animated.Text style={{ position: 'absolute', top: H * 0.45, alignSelf: 'center', left: 0, right: 0, textAlign: 'center', fontSize: 48, fontWeight: '900', color: '#00FF41', opacity: op }}>كلمات</Animated.Text>;
}

// ═══════════════════════════════════════════
// 6. AURORA — 3D Northern Lights
// ═══════════════════════════════════════════
function AuroraBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#020820' }]}>
      {/* 3 star layers */}
      {Array.from({ length: 60 }, (_, i) => {
        const layer = i < 30 ? 0.8 : i < 50 ? 1.5 : 2.5;
        return <TwinkStar key={i} x={Math.random() * W} y={Math.random() * H} size={layer + Math.random()} dur={1000 + Math.random() * 3000} delay={Math.random() * 2000} />;
      })}

      {/* Aurora curtains — 4 overlapping bands */}
      <AuroraBand color="#22C55E" y={H * 0.12} dur={8000} delay={0} />
      <AuroraBand color="#0EA5E9" y={H * 0.20} dur={10000} delay={1000} />
      <AuroraBand color="#8B5CF6" y={H * 0.16} dur={12000} delay={2000} />
      <AuroraBand color="#14B8A6" y={H * 0.24} dur={9000} delay={500} />

      {/* Magnetic field lines — subtle arcs */}
      {[W * 0.15, W * 0.35, W * 0.55, W * 0.75].map((x, i) => (
        <View key={i} style={{ position: 'absolute', top: H * 0.1, left: x, width: 1, height: H * 0.25, backgroundColor: '#22C55E', opacity: 0.04, transform: [{ rotate: `${-5 + i * 3}deg` }] }} />
      ))}

      {/* Horizon glow */}
      <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, height: 60, backgroundColor: '#22C55E', opacity: 0.03 }} />

      {/* Ground — tundra */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, backgroundColor: '#050D15' }} />
      <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, height: 20, backgroundColor: '#0A1520', borderTopLeftRadius: 100, borderTopRightRadius: 200 }} />
    </View>
  );
}

function AuroraBand({ color, y, dur, delay }: { color: string; y: number; dur: number; delay: number }) {
  const tx = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0.15)).current;
  const sy = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(tx, { toValue: 80, duration: dur, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(tx, { toValue: -80, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(op, { toValue: 0.45, duration: dur / 2, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0.1, duration: dur / 2, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(sy, { toValue: 2, duration: dur * 0.7, useNativeDriver: true }),
      Animated.timing(sy, { toValue: 0.7, duration: dur * 0.7, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ position: 'absolute', top: y, left: -50, width: W + 100, height: 100, borderRadius: 50, backgroundColor: color, opacity: op, transform: [{ translateX: tx }, { scaleY: sy }] }} />;
}

// ═══════════════════════════════════════════
// 7. DESERT WIND — 3D Sandstorm
// ═══════════════════════════════════════════
function DesertWindBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1C1208' }]}>
      {/* Sunset sky layers */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: H * 0.25, backgroundColor: '#2A1F0E' }} />
      <View style={{ position: 'absolute', top: H * 0.1, left: 0, right: 0, height: H * 0.15, backgroundColor: 'rgba(217,119,6,0.06)' }} />
      <View style={{ position: 'absolute', top: H * 0.2, left: 0, right: 0, height: H * 0.1, backgroundColor: 'rgba(239,68,68,0.04)' }} />

      {/* Sun with halo */}
      <View style={{ position: 'absolute', top: H * 0.08, left: W * 0.35, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#F59E0B', opacity: 0.04 }} />
        <View style={{ position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: '#F59E0B', opacity: 0.08 }} />
        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#F59E0B', opacity: 0.15 }} />
      </View>

      {/* Crescent moon */}
      <View style={{ position: 'absolute', top: H * 0.05, right: W * 0.1, width: 25, height: 25, borderRadius: 12.5, backgroundColor: '#FDE68A', opacity: 0.15 }} />

      {/* Sand dunes — multiple layers */}
      <View style={{ position: 'absolute', bottom: 60, left: -50, right: -50, height: 80, backgroundColor: '#150E05', borderTopLeftRadius: 300, borderTopRightRadius: 150 }} />
      <View style={{ position: 'absolute', bottom: 30, left: -30, right: -30, height: 70, backgroundColor: '#120B04', borderTopLeftRadius: 100, borderTopRightRadius: 250 }} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, backgroundColor: '#0E0903' }} />

      {/* FAR sand — tiny */}
      {Array.from({ length: 8 }, (_, i) => (
        <SandP key={`f${i}`} y={H * 0.25 + Math.random() * H * 0.5} size={1.5 + Math.random() * 2} speed={8000 + Math.random() * 4000} delay={Math.random() * 6000} opacity={0.1 + Math.random() * 0.1} />
      ))}
      {/* MID sand */}
      {Array.from({ length: 6 }, (_, i) => (
        <SandP key={`m${i}`} y={H * 0.3 + Math.random() * H * 0.5} size={2.5 + Math.random() * 3} speed={5000 + Math.random() * 3000} delay={Math.random() * 5000} opacity={0.2 + Math.random() * 0.15} />
      ))}
      {/* NEAR sand — large */}
      {Array.from({ length: 4 }, (_, i) => (
        <SandP key={`n${i}`} y={H * 0.4 + Math.random() * H * 0.4} size={4 + Math.random() * 5} speed={3000 + Math.random() * 2000} delay={Math.random() * 3000} opacity={0.3 + Math.random() * 0.2} />
      ))}
    </View>
  );
}

function SandP({ y, size, speed, delay, opacity }: { y: number; size: number; speed: number; delay: number; opacity: number }) {
  const tx = useRef(new Animated.Value(-20)).current;
  useEffect(() => {
    const go = () => { tx.setValue(-20); Animated.timing(tx, { toValue: W + 20, duration: speed, delay, easing: Easing.linear, useNativeDriver: true }).start(() => go()); };
    go();
  }, []);
  return <Animated.View style={{ position: 'absolute', top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: '#D4A574', opacity, transform: [{ translateX: tx }] }} />;
}

// ═══════════════════════════════════════════
// 8. LIGHTNING — 3D Storm
// ═══════════════════════════════════════════
function LightningBackground() {
  const [flashes, setFlashes] = useState<{ id: number; x: number }[]>([]);
  useEffect(() => {
    const strike = () => {
      setTimeout(() => {
        const id = Date.now();
        const x = W * 0.15 + Math.random() * W * 0.7;
        setFlashes(p => [...p, { id, x }]);
        setTimeout(() => setFlashes(p => p.filter(f => f.id !== id)), 150);
        // Double strike
        setTimeout(() => {
          const id2 = id + 1;
          setFlashes(p => [...p, { id: id2, x: x + (Math.random() - 0.5) * 40 }]);
          setTimeout(() => setFlashes(p => p.filter(f => f.id !== id2)), 80);
        }, 200);
        strike();
      }, 2500 + Math.random() * 5000);
    };
    strike();
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0A0A14' }]}>
      {/* FAR clouds */}
      {[{ x: -40, y: 15, w: 220, o: 0.3 }, { x: W * 0.4, y: 25, w: 200, o: 0.25 }, { x: W * 0.7, y: 10, w: 180, o: 0.3 }].map((c, i) => (
        <View key={`f${i}`} style={{ position: 'absolute', left: c.x, top: c.y, width: c.w, height: 50, borderRadius: 25, backgroundColor: '#1A1A2E', opacity: c.o }} />
      ))}
      {/* NEAR clouds — darker, larger */}
      {[{ x: -20, y: 40, w: 260, o: 0.5 }, { x: W * 0.3, y: 50, w: 230, o: 0.45 }].map((c, i) => (
        <View key={`n${i}`} style={{ position: 'absolute', left: c.x, top: c.y, width: c.w, height: 70, borderRadius: 35, backgroundColor: '#12122A', opacity: c.o }} />
      ))}

      {/* Flash overlay */}
      {flashes.length > 0 && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(200,200,255,0.12)' }]} />}

      {/* Lightning bolts */}
      {flashes.map(f => <Bolt key={f.id} x={f.x} />)}

      {/* Rain — 3 depth layers */}
      {Array.from({ length: 30 }, (_, i) => {
        const layer = i < 12 ? { w: 1, h: 8, op: 0.1, dur: 600 } : i < 22 ? { w: 1, h: 12, op: 0.2, dur: 450 } : { w: 1.5, h: 16, op: 0.3, dur: 350 };
        return <Rain key={i} x={Math.random() * W} w={layer.w} h={layer.h} dur={layer.dur + Math.random() * 200} delay={Math.random() * 2000} opacity={layer.op} />;
      })}

      {/* Puddle reflections */}
      {[W * 0.15, W * 0.4, W * 0.65, W * 0.85].map((x, i) => (
        <Puddle key={i} x={x} delay={1000 + Math.random() * 3000} />
      ))}

      {/* Ground */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, backgroundColor: '#080810' }} />
    </View>
  );
}

function Rain({ x, w, h, dur, delay, opacity }: { x: number; w: number; h: number; dur: number; delay: number; opacity: number }) {
  const ty = useRef(new Animated.Value(-10)).current;
  useEffect(() => {
    const go = () => { ty.setValue(-h); Animated.timing(ty, { toValue: H + h, duration: dur, delay, easing: Easing.linear, useNativeDriver: true }).start(() => go()); };
    go();
  }, []);
  return <Animated.View style={{ position: 'absolute', left: x, width: w, height: h, borderRadius: w / 2, backgroundColor: '#93C5FD', opacity, transform: [{ translateY: ty }] }} />;
}

function Bolt({ x }: { x: number }) {
  const segs = [
    { dx: 0, dy: 0, dx2: 14, dy2: 40 },
    { dx: 14, dy: 40, dx2: -10, dy2: 85 },
    { dx: -10, dy: 85, dx2: 18, dy2: 130 },
    { dx: 18, dy: 130, dx2: -6, dy2: 170 },
  ];
  return (
    <View style={{ position: 'absolute', left: x, top: 55 }}>
      {segs.map((s, i) => {
        const a = Math.atan2(s.dy2 - s.dy, s.dx2 - s.dx);
        const l = Math.sqrt((s.dx2 - s.dx) ** 2 + (s.dy2 - s.dy) ** 2);
        return <View key={i} style={{ position: 'absolute', left: s.dx, top: s.dy, width: l, height: 2.5, backgroundColor: '#FFF', transform: [{ rotate: `${a}rad` }], shadowColor: '#93C5FD', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8 }} />;
      })}
    </View>
  );
}

function Puddle({ x, delay }: { x: number; delay: number }) {
  const sc = useRef(new Animated.Value(0.3)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(sc, { toValue: 2.5, duration: 1000, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(op, { toValue: 0.35, duration: 150, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0, duration: 850, useNativeDriver: true }),
        ]),
      ]),
      Animated.delay(1500),
    ])).start();
  }, []);
  return <Animated.View style={{ position: 'absolute', bottom: 35, left: x, width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#93C5FD', backgroundColor: 'transparent', opacity: op, transform: [{ scale: sc }] }} />;
}
