import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, View, StyleSheet, Dimensions, Easing } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// ─── CONFETTI — colored squares/rectangles fall with sway ───
export function ConfettiAnimation({ onDone }: { onDone: () => void }) {
  const COLORS = ['#7C3AED', '#22C55E', '#F59E0B', '#EC4899', '#3B82F6', '#EF4444', '#FDE68A', '#A78BFA'];
  const PIECE_COUNT = 30;

  const pieces = useMemo(() =>
    Array.from({ length: PIECE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * W,
      startY: -20 - Math.random() * 200,
      color: COLORS[i % COLORS.length],
      width: 6 + Math.random() * 8,
      height: 4 + Math.random() * 10,
      duration: 2000 + Math.random() * 1500,
      delay: Math.random() * 800,
      swayAmount: 30 + Math.random() * 50,
      swayDuration: 800 + Math.random() * 600,
      isRect: Math.random() > 0.5,
    })), []
  );

  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {pieces.map(piece => (
        <ConfettiPiece key={piece.id} piece={piece} />
      ))}
    </View>
  );
}

function ConfettiPiece({ piece }: { piece: any }) {
  const translateY = useRef(new Animated.Value(piece.startY)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: H + 50, duration: piece.duration, delay: piece.delay,
        easing: Easing.linear, useNativeDriver: true,
      }),
      Animated.loop(Animated.sequence([
        Animated.timing(translateX, { toValue: piece.swayAmount, duration: piece.swayDuration, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -piece.swayAmount, duration: piece.swayDuration, useNativeDriver: true }),
      ])),
      Animated.loop(Animated.timing(rotate, {
        toValue: 1, duration: 600 + Math.random() * 400, easing: Easing.linear, useNativeDriver: true,
      })),
      Animated.sequence([
        Animated.delay(piece.delay + piece.duration * 0.7),
        Animated.timing(opacity, { toValue: 0, duration: piece.duration * 0.3, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const rotateStr = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: piece.x,
        width: piece.width,
        height: piece.height,
        backgroundColor: piece.color,
        borderRadius: piece.isRect ? 1 : piece.width / 2,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate: rotateStr }],
      }}
    />
  );
}

// ─── FIREWORKS — particle bursts from multiple points ───
export function FireworksAnimation({ onDone }: { onDone: () => void }) {
  const BURSTS = useMemo(() => [
    { x: W * 0.25, y: H * 0.25, color: '#7C3AED', delay: 0 },
    { x: W * 0.75, y: H * 0.20, color: '#F59E0B', delay: 300 },
    { x: W * 0.50, y: H * 0.35, color: '#22C55E', delay: 150 },
    { x: W * 0.20, y: H * 0.55, color: '#EC4899', delay: 500 },
    { x: W * 0.80, y: H * 0.50, color: '#3B82F6', delay: 700 },
    { x: W * 0.50, y: H * 0.20, color: '#EF4444', delay: 900 },
  ], []);

  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {BURSTS.map((burst, i) => (
        <FireworkBurst key={i} {...burst} />
      ))}
    </View>
  );
}

function FireworkBurst({ x, y, color, delay }: { x: number; y: number; color: string; delay: number }) {
  const PARTICLE_COUNT = 16;
  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      return { angle, distance: 60 + Math.random() * 50, size: 4 + Math.random() * 4 };
    }), []
  );

  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const flashScale = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.sequence([
        // Flash
        Animated.parallel([
          Animated.timing(flashOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
          Animated.timing(flashScale, { toValue: 2, duration: 150, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(flashOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(progress, {
            toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(400),
            Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
    }, delay);
  }, []);

  return (
    <View style={{ position: 'absolute', left: x, top: y }}>
      {/* Central flash */}
      <Animated.View style={{
        position: 'absolute', left: -15, top: -15, width: 30, height: 30,
        borderRadius: 15, backgroundColor: color,
        opacity: flashOpacity, transform: [{ scale: flashScale }],
      }} />
      {/* Particles */}
      {particles.map((p, i) => {
        const tx = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.distance] });
        const ty = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.angle) * p.distance] });
        const scale = progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.2, 0.3] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute', left: -p.size / 2, top: -p.size / 2,
              width: p.size, height: p.size, borderRadius: p.size / 2,
              backgroundColor: color, opacity,
              transform: [{ translateX: tx }, { translateY: ty }, { scale }],
            }}
          />
        );
      })}
    </View>
  );
}

// ─── STARS FALL — geometric star shapes fall with spin ───
export function StarsFallAnimation({ onDone }: { onDone: () => void }) {
  const STAR_COLORS = ['#F59E0B', '#FDE68A', '#FFFFFF', '#FCD34D', '#F97316'];
  const stars = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * W,
      size: 8 + Math.random() * 14,
      duration: 1500 + Math.random() * 1000,
      delay: Math.random() * 1000,
      color: STAR_COLORS[i % STAR_COLORS.length],
      spin: Math.random() > 0.3,
    })), []
  );

  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {stars.map(star => <FallingStar key={star.id} star={star} />)}
    </View>
  );
}

function FallingStar({ star }: { star: any }) {
  const translateY = useRef(new Animated.Value(-50)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(star.delay),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: H + 50, duration: star.duration,
          easing: Easing.in(Easing.quad), useNativeDriver: true,
        }),
        Animated.spring(scale, { toValue: 1, tension: 100, friction: 6, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.9, duration: 200, useNativeDriver: true }),
        star.spin
          ? Animated.loop(Animated.timing(rotate, { toValue: 1, duration: 500, easing: Easing.linear, useNativeDriver: true }))
          : Animated.timing(rotate, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const rotateStr = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const s = star.size;

  // 4-pointed star shape using overlapping rotated squares
  return (
    <Animated.View style={{
      position: 'absolute', left: star.x, width: s, height: s,
      opacity, transform: [{ translateY }, { rotate: rotateStr }, { scale }],
    }}>
      <View style={{
        position: 'absolute', width: s * 0.5, height: s, left: s * 0.25, top: 0,
        backgroundColor: star.color, borderRadius: s * 0.15,
      }} />
      <View style={{
        position: 'absolute', width: s, height: s * 0.5, left: 0, top: s * 0.25,
        backgroundColor: star.color, borderRadius: s * 0.15,
      }} />
      {/* Center glow */}
      <View style={{
        position: 'absolute', width: s * 0.35, height: s * 0.35,
        left: s * 0.325, top: s * 0.325,
        backgroundColor: '#FFFFFF', borderRadius: s * 0.2,
      }} />
    </Animated.View>
  );
}

// ─── GOLD RAIN — golden coins fall with 3D flip effect ───
export function GoldRainAnimation({ onDone }: { onDone: () => void }) {
  const coins = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * W,
      size: 14 + Math.random() * 10,
      duration: 1200 + Math.random() * 800,
      delay: Math.random() * 1200,
    })), []
  );

  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {coins.map(coin => <FallingCoin key={coin.id} coin={coin} />)}
    </View>
  );
}

function FallingCoin({ coin }: { coin: any }) {
  const translateY = useRef(new Animated.Value(-coin.size)).current;
  const flipPhase = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(coin.delay),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: H + coin.size, duration: coin.duration,
          easing: Easing.in(Easing.quad), useNativeDriver: true,
        }),
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.loop(Animated.timing(flipPhase, {
          toValue: 1, duration: 400, easing: Easing.linear, useNativeDriver: true,
        })),
      ]),
    ]).start();
  }, []);

  // Simulate coin flip via scaleX oscillation
  const scaleX = flipPhase.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0.1, 1, 0.1, 1],
  });

  const s = coin.size;
  return (
    <Animated.View style={{
      position: 'absolute', left: coin.x, width: s, height: s,
      opacity, transform: [{ translateY }, { scaleX }],
    }}>
      {/* Outer coin */}
      <View style={{
        width: s, height: s, borderRadius: s / 2,
        backgroundColor: '#F59E0B',
        borderWidth: 2, borderColor: '#D97706',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Inner circle */}
        <View style={{
          width: s * 0.6, height: s * 0.6, borderRadius: s * 0.3,
          backgroundColor: '#FBBF24',
          borderWidth: 1, borderColor: '#D97706',
        }} />
      </View>
    </Animated.View>
  );
}

// ─── ARABIC CALLIGRAPHY BURST ───
export function CalligraphyBurstAnimation({ onDone }: { onDone: () => void }) {
  const count = 18;
  const items = useRef(Array.from({ length: count }, (_, i) => ({
    x: new Animated.Value(W / 2),
    y: new Animated.Value(H / 2),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0),
    angle: (i / count) * 2 * Math.PI,
  }))).current;

  useEffect(() => {
    const animations = items.map((item, i) =>
      Animated.sequence([
        Animated.delay(i * 40),
        Animated.parallel([
          Animated.timing(item.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(item.scale, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(item.x, {
            toValue: W / 2 + Math.cos(item.angle) * 130,
            duration: 800, useNativeDriver: true,
          }),
          Animated.timing(item.y, {
            toValue: H / 2 + Math.sin(item.angle) * 130,
            duration: 800, useNativeDriver: true,
          }),
        ]),
        Animated.delay(300),
        Animated.timing(item.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    );
    Animated.parallel(animations).start(() => onDone());
  }, []);

  const COLORS = ['#F59E0B', '#FCD34D', '#7C3AED', '#EC4899', '#22C55E', '#3B82F6'];
  return (
    <View style={styles.overlay} pointerEvents="none">
      {items.map((item, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: 12 + (i % 3) * 4,
            height: 12 + (i % 3) * 4,
            borderRadius: (12 + (i % 3) * 4) / 2,
            backgroundColor: COLORS[i % COLORS.length],
            transform: [
              { translateX: item.x },
              { translateY: item.y },
              { scale: item.scale },
            ],
            opacity: item.opacity,
          }}
        />
      ))}
    </View>
  );
}

// ─── GALAXY EXPLOSION — purple particles burst from center ───
export function GalaxyExplosionAnimation({ onDone }: { onDone: () => void }) {
  const cx = W / 2, cy = H / 2;
  const PARTICLE_COUNT = 25;

  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      return {
        id: i,
        angle,
        speed: 80 + Math.random() * 160,
        size: 3 + Math.random() * 5,
        color: ['#7C3AED', '#A78BFA', '#C4B5FD', '#EC4899', '#3B82F6', '#FFFFFF'][i % 6],
        duration: 1000 + Math.random() * 500,
        delay: Math.random() * 300,
      };
    }), []
  );

  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      <CentralFlash cx={cx} cy={cy} />
      {particles.map(p => <GalaxyParticle key={p.id} particle={p} cx={cx} cy={cy} />)}
    </View>
  );
}

function CentralFlash({ cx, cy }: { cx: number; cy: number }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 8, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', left: cx - 20, top: cy - 20,
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: '#8B5CF6', opacity,
      transform: [{ scale }],
    }} />
  );
}

function GalaxyParticle({ particle, cx, cy }: { particle: any; cx: number; cy: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(particle.delay),
      Animated.parallel([
        Animated.timing(progress, {
          toValue: 1, duration: particle.duration,
          easing: Easing.out(Easing.quad), useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(particle.duration * 0.5),
          Animated.timing(opacity, { toValue: 0, duration: particle.duration * 0.5, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  const tx = progress.interpolate({
    inputRange: [0, 1], outputRange: [0, Math.cos(particle.angle) * particle.speed],
  });
  const ty = progress.interpolate({
    inputRange: [0, 1], outputRange: [0, Math.sin(particle.angle) * particle.speed],
  });

  return (
    <Animated.View style={{
      position: 'absolute',
      left: cx - particle.size / 2,
      top: cy - particle.size / 2,
      width: particle.size, height: particle.size,
      borderRadius: particle.size / 2,
      backgroundColor: particle.color,
      opacity, transform: [{ translateX: tx }, { translateY: ty }],
    }} />
  );
}

// ═══════════════════════════════════════════════════════════════
// ANIME COLLECTION
// ═══════════════════════════════════════════════════════════════

// ─── SPIRIT BOMB — energy particles spiral inward, sphere explodes ───
export function SpiritBombAnimation({ onDone }: { onDone: () => void }) {
  const cx = W / 2, cy = H / 2;

  const SPIRAL_COUNT = 40;
  const spiralParticles = useMemo(() => Array.from({ length: SPIRAL_COUNT }, (_, i) => ({
    id: i,
    startAngle: (i / SPIRAL_COUNT) * Math.PI * 2,
    startRadius: 150 + Math.random() * 120,
    delay: Math.random() * 800,
    size: 2 + Math.random() * 3,
    color: Math.random() > 0.3 ? '#60A5FA' : '#FFFFFF',
  })), []);

  const RAIN_COUNT = 30;

  const sphereScale = useRef(new Animated.Value(0)).current;
  const sphereOpacity = useRef(new Animated.Value(0)).current;
  const spherePulse = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const shockwaveScales = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(0))
  ).current;
  const shockwaveOpacities = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Build sphere
    Animated.parallel([
      Animated.timing(sphereScale, { toValue: 1, duration: 1200, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      Animated.timing(sphereOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      // Pulse
      Animated.loop(Animated.sequence([
        Animated.timing(spherePulse, { toValue: 1.15, duration: 200, useNativeDriver: true }),
        Animated.timing(spherePulse, { toValue: 0.95, duration: 200, useNativeDriver: true }),
      ]), { iterations: 2 }).start(() => {
        // Flash + explode
        Animated.timing(flashOpacity, { toValue: 1, duration: 80, useNativeDriver: true }).start(() => {
          Animated.timing(flashOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
          Animated.timing(sphereScale, { toValue: 0, duration: 300, useNativeDriver: true }).start();
          // Launch shockwave rings
          shockwaveScales.forEach((s, i) => {
            setTimeout(() => {
              Animated.parallel([
                Animated.timing(s, { toValue: 8, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.sequence([
                  Animated.timing(shockwaveOpacities[i], { toValue: 0.7, duration: 100, useNativeDriver: true }),
                  Animated.delay(400),
                  Animated.timing(shockwaveOpacities[i], { toValue: 0, duration: 400, useNativeDriver: true }),
                ]),
              ]).start();
            }, i * 120);
          });
        });
      });
    });
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* White screen flash */}
      <Animated.View pointerEvents="none" style={{
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FFFFFF',
        opacity: flashOpacity,
      }} />

      {/* Spiral energy particles */}
      {spiralParticles.map(p => (
        <SpiralParticle key={p.id} particle={p} cx={cx} cy={cy} />
      ))}

      {/* The sphere */}
      <Animated.View style={{
        position: 'absolute', left: cx - 50, top: cy - 50,
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#3B82F6',
        opacity: sphereOpacity,
        transform: [{ scale: Animated.multiply(sphereScale, spherePulse) }],
        shadowColor: '#60A5FA', shadowRadius: 30, shadowOpacity: 0.8, elevation: 20,
      }}>
        {[0.7, 0.5, 0.3].map((ratio, i) => (
          <View key={i} style={{
            position: 'absolute',
            left: 50 - 50 * ratio, top: 50 - 50 * ratio,
            width: 100 * ratio, height: 100 * ratio,
            borderRadius: 50 * ratio,
            backgroundColor: i === 2 ? '#FFFFFF' : i === 1 ? '#93C5FD' : '#60A5FA',
          }} />
        ))}
      </Animated.View>

      {/* Shockwave rings */}
      {shockwaveScales.map((s, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: cx - 30, top: cy - 30,
          width: 60, height: 60, borderRadius: 30,
          borderWidth: 3 - i * 0.4, borderColor: i % 2 === 0 ? '#60A5FA' : '#FFFFFF',
          opacity: shockwaveOpacities[i],
          transform: [{ scale: s }],
        }} />
      ))}

      {/* Ki rain particles */}
      {Array.from({ length: RAIN_COUNT }, (_, i) => (
        <KiParticle key={i} delay={2000 + Math.random() * 500} screenWidth={W} screenHeight={H} />
      ))}
    </View>
  );
}

function SpiralParticle({ particle, cx, cy }: { particle: any; cx: number; cy: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(progress, { toValue: 1, duration: 1000, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(700),
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]).start();
    }, particle.delay);
  }, []);

  const tx = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.cos(particle.startAngle) * particle.startRadius, 0],
  });
  const ty = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.sin(particle.startAngle) * particle.startRadius, 0],
  });

  return (
    <Animated.View style={{
      position: 'absolute', left: cx - particle.size / 2, top: cy - particle.size / 2,
      width: particle.size, height: particle.size, borderRadius: particle.size / 2,
      backgroundColor: particle.color, opacity,
      transform: [{ translateX: tx }, { translateY: ty }],
    }} />
  );
}

function KiParticle({ delay, screenWidth, screenHeight }: { delay: number; screenWidth: number; screenHeight: number }) {
  const ty = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const x = useMemo(() => Math.random() * screenWidth, []);
  const size = useMemo(() => 3 + Math.random() * 5, []);

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(ty, { toValue: screenHeight + 20, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.delay(1000),
          Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]).start();
    }, delay);
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', left: x, top: 0,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: '#FCD34D',
      opacity, transform: [{ translateY: ty }],
    }} />
  );
}

// ─── RASENGAN BURST — spinning chakra orb, clones, impact lines ───
export function RasenganAnimation({ onDone }: { onDone: () => void }) {
  const cx = W / 2, cy = H / 2;
  const CHAKRA_LINES = 12;
  const IMPACT_LINES = 16;

  const orbScale = useRef(new Animated.Value(0)).current;
  const orbRotation = useRef(new Animated.Value(0)).current;
  const impactScale = useRef(new Animated.Value(0)).current;
  const impactOpacity = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const mangaOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Spin up orb
    Animated.parallel([
      Animated.spring(orbScale, { toValue: 1, tension: 100, friction: 6, useNativeDriver: true }),
      Animated.loop(Animated.timing(orbRotation, { toValue: 1, duration: 300, easing: Easing.linear, useNativeDriver: true })),
    ]).start();

    // Impact at 1.2s
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(flashOpacity, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(flashOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
      Animated.timing(orbScale, { toValue: 0, duration: 100, useNativeDriver: true }).start();
      Animated.parallel([
        Animated.timing(impactScale, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(impactOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.delay(300),
          Animated.timing(impactOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]).start();
      // Manga impact lines
      Animated.sequence([
        Animated.timing(mangaOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.delay(400),
        Animated.timing(mangaOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 1200);

    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, []);

  const rotation = orbRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Flash */}
      <Animated.View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#FFFFFF', opacity: flashOpacity }} />

      {/* Shadow clones dashing */}
      {[0, 1, 2].map(i => (
        <ShadowClone key={i} index={i} screenWidth={W} screenHeight={H} />
      ))}

      {/* Rasengan orb */}
      <Animated.View style={{
        position: 'absolute', left: cx - 40, top: cy - 40,
        width: 80, height: 80, borderRadius: 40,
        opacity: orbScale, transform: [{ scale: orbScale }],
      }}>
        <Animated.View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: '#3B82F6',
          alignItems: 'center', justifyContent: 'center',
          transform: [{ rotate: rotation }],
          shadowColor: '#60A5FA', shadowRadius: 20, shadowOpacity: 0.9, elevation: 15,
        }}>
          {/* Chakra spiral lines */}
          {Array.from({ length: CHAKRA_LINES }, (_, i) => {
            const angle = (i / CHAKRA_LINES) * 360;
            return (
              <View key={i} style={{
                position: 'absolute', left: 38, top: 10,
                width: 4, height: 25, borderRadius: 2,
                backgroundColor: i % 2 === 0 ? '#DBEAFE' : '#93C5FD',
                transform: [{ rotate: `${angle}deg` }, { translateY: -15 }],
              }} />
            );
          })}
          <View style={{
            width: 30, height: 30, borderRadius: 15,
            backgroundColor: '#DBEAFE',
          }} />
        </Animated.View>
      </Animated.View>

      {/* Impact explosion circle */}
      <Animated.View style={{
        position: 'absolute', left: cx - 120, top: cy - 120,
        width: 240, height: 240, borderRadius: 120,
        borderWidth: 4, borderColor: '#60A5FA',
        backgroundColor: 'rgba(59,130,246,0.15)',
        opacity: impactOpacity,
        transform: [{ scale: impactScale }],
      }} />

      {/* Manga impact lines (radiating from center) */}
      <Animated.View style={{
        position: 'absolute', left: cx, top: cy, opacity: mangaOpacity,
      }}>
        {Array.from({ length: IMPACT_LINES }, (_, i) => {
          const angle = (i / IMPACT_LINES) * Math.PI * 2;
          const len = Math.max(W, H);
          return (
            <View key={i} style={{
              position: 'absolute', left: 0, top: -1.5,
              width: len, height: 3, backgroundColor: '#BFDBFE',
              transform: [{ rotate: `${angle}rad` }],
            }} />
          );
        })}
      </Animated.View>
    </View>
  );
}

function ShadowClone({ index, screenWidth, screenHeight }: { index: number; screenWidth: number; screenHeight: number }) {
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const startPositions = [
    { x: -80, y: screenHeight * 0.3 },
    { x: screenWidth + 80, y: screenHeight * 0.5 },
    { x: screenWidth * 0.5, y: -80 },
  ];
  const s = startPositions[index];

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.5, duration: 100, useNativeDriver: true }),
        Animated.timing(tx, { toValue: screenWidth / 2 - s.x - 20, duration: 400, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(ty, { toValue: screenHeight / 2 - s.y - 20, duration: 400, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(() => {
        Animated.timing(opacity, { toValue: 0, duration: 100, useNativeDriver: true }).start();
      });
    }, index * 150 + 200);
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', left: s.x, top: s.y,
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: '#1E293B', opacity,
      transform: [{ translateX: tx }, { translateY: ty }],
    }} />
  );
}

// ─── BREATH OF FIRE — flame slashes + flower petals ───
export function BreathOfFireAnimation({ onDone }: { onDone: () => void }) {
  const SLASH_COUNT = 6;
  const PETAL_COUNT = 25;

  const slashData = useMemo(() => Array.from({ length: SLASH_COUNT }, (_, i) => ({
    id: i,
    startX: i % 2 === 0 ? -W * 0.3 : W * 1.3,
    y: H * (0.15 + i * 0.13),
    height: 8 + Math.random() * 12,
    delay: i * 180,
    color: i % 3 === 0 ? '#EF4444' : i % 3 === 1 ? '#F97316' : '#FCA5A5',
  })), []);

  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {slashData.map(slash => (
        <FireSlash key={slash.id} data={slash} screenWidth={W} />
      ))}
      {Array.from({ length: PETAL_COUNT }, (_, i) => (
        <Petal key={i} delay={800 + Math.random() * 1200} screenWidth={W} screenHeight={H} />
      ))}
    </View>
  );
}

function FireSlash({ data, screenWidth }: { data: any; screenWidth: number }) {
  const tx = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scaleY = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.95, duration: 80, useNativeDriver: true }),
        Animated.spring(scaleY, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
        Animated.timing(tx, {
          toValue: data.startX < 0 ? screenWidth * 1.5 : -screenWidth * 1.5,
          duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      });
    }, data.delay);
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', left: data.startX, top: data.y,
      width: screenWidth * 1.6, height: data.height, borderRadius: data.height / 2,
      backgroundColor: data.color,
      opacity, transform: [{ translateX: tx }, { scaleY }],
      shadowColor: data.color, shadowRadius: 12, shadowOpacity: 0.6, elevation: 8,
    }} />
  );
}

function Petal({ delay, screenWidth, screenHeight }: { delay: number; screenWidth: number; screenHeight: number }) {
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(-20)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const x = useMemo(() => Math.random() * screenWidth, []);
  const size = useMemo(() => 8 + Math.random() * 10, []);
  const sway = useMemo(() => (Math.random() - 0.5) * 80, []);

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(ty, { toValue: screenHeight + 30, duration: 2500, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(tx, { toValue: sway, duration: 2500, useNativeDriver: true }),
        Animated.loop(Animated.timing(rotate, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.9, duration: 200, useNativeDriver: true }),
          Animated.delay(1800),
          Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]).start();
    }, delay);
  }, []);

  const rotateStr = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{
      position: 'absolute', left: x, top: 0,
      width: size, height: size * 0.6, borderRadius: size / 2,
      backgroundColor: Math.random() > 0.5 ? '#FDA4AF' : '#F9A8D4',
      opacity, transform: [{ translateY: ty }, { translateX: tx }, { rotate: rotateStr }],
    }} />
  );
}

// ─── THUNDER SPEAR — spears from top, explosions, debris ───
export function ThunderSpearAnimation({ onDone }: { onDone: () => void }) {
  const cx = W / 2, cy = H / 2;
  const SPEAR_COUNT = 5;
  const DEBRIS_COUNT = 20;

  const spears = useMemo(() => Array.from({ length: SPEAR_COUNT }, (_, i) => ({
    id: i,
    x: W * (0.15 + i * 0.17),
    delay: i * 200,
  })), []);

  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.9, duration: 60, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0.7, duration: 60, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 800);
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#FFFFFF', opacity: flashAnim }} />
      {spears.map(s => (
        <ThunderSpear key={s.id} x={s.x} delay={s.delay} screenHeight={H} cy={cy} />
      ))}
      {Array.from({ length: DEBRIS_COUNT }, (_, i) => (
        <DebrisParticle key={i} delay={800 + Math.random() * 400} cx={cx} cy={cy} />
      ))}
    </View>
  );
}

function ThunderSpear({ x, delay, screenHeight, cy }: { x: number; delay: number; screenHeight: number; cy: number }) {
  const ty = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const trailOpacity = useRef(new Animated.Value(0)).current;
  const explodeScale = useRef(new Animated.Value(0)).current;
  const explodeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(trailOpacity, { toValue: 0.7, duration: 100, useNativeDriver: true }),
        Animated.timing(ty, { toValue: cy - 20, duration: 400, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(() => {
        Animated.timing(opacity, { toValue: 0, duration: 100, useNativeDriver: true }).start();
        Animated.timing(trailOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        Animated.parallel([
          Animated.spring(explodeScale, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }),
          Animated.timing(explodeOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start(() => {
          Animated.timing(explodeOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start();
        });
      });
    }, delay);
  }, []);

  return (
    <>
      {/* The spear */}
      <Animated.View style={{
        position: 'absolute', left: x - 3, top: 0,
        width: 6, height: 50, borderRadius: 3,
        backgroundColor: '#FFFFFF', opacity,
        transform: [{ translateY: ty }],
        shadowColor: '#60A5FA', shadowRadius: 8, shadowOpacity: 1, elevation: 10,
      }} />
      {/* Trail */}
      <Animated.View style={{
        position: 'absolute', left: x - 1.5, top: 0,
        width: 3, height: 120, borderRadius: 1.5,
        backgroundColor: '#93C5FD', opacity: trailOpacity,
        transform: [{ translateY: Animated.add(ty, new Animated.Value(-80)) }],
      }} />
      {/* Explosion */}
      <Animated.View style={{
        position: 'absolute', left: x - 50, top: cy - 50,
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: 'rgba(249,115,22,0.4)',
        borderWidth: 3, borderColor: '#F97316',
        opacity: explodeOpacity,
        transform: [{ scale: explodeScale }],
      }} />
    </>
  );
}

function DebrisParticle({ delay, cx, cy }: { delay: number; cx: number; cy: number }) {
  const angle = useMemo(() => Math.random() * Math.PI * 2, []);
  const speed = useMemo(() => 60 + Math.random() * 120, []);
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const size = useMemo(() => 4 + Math.random() * 8, []);

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(tx, { toValue: Math.cos(angle) * speed, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(ty, { toValue: Math.sin(angle) * speed + 50, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.sequence([Animated.delay(400), Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true })]),
      ]).start();
    }, delay);
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', left: cx - size / 2, top: cy - size / 2,
      width: size, height: size, borderRadius: 2,
      backgroundColor: Math.random() > 0.5 ? '#78716C' : '#F97316',
      opacity, transform: [{ translateX: tx }, { translateY: ty }],
    }} />
  );
}

// ─── CONQUEROR'S HAKI — dark shockwave, purple lightning ───
export function ConquerorsHakiAnimation({ onDone }: { onDone: () => void }) {
  const cx = W / 2, cy = H * 0.75;
  const LIGHTNING_COUNT = 12;

  const darkOverlay = useRef(new Animated.Value(0)).current;
  const shockwaveScale = useRef(new Animated.Value(0)).current;
  const shockwaveOpacity = useRef(new Animated.Value(0)).current;
  const lightningOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Dark overlay surges
    Animated.sequence([
      Animated.timing(darkOverlay, { toValue: 0.85, duration: 300, useNativeDriver: true }),
      Animated.timing(darkOverlay, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      Animated.timing(darkOverlay, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    // Shockwave from bottom center
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(shockwaveScale, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(shockwaveOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.delay(400),
          Animated.timing(shockwaveOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]).start();
    }, 200);

    // Lightning bolts
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(lightningOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(lightningOpacity, { toValue: 0.3, duration: 100, useNativeDriver: true }),
        Animated.timing(lightningOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(lightningOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 300);

    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, []);

  const shockwaveSize = Math.max(W, H) * 2.5;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Dark overlay */}
      <Animated.View pointerEvents="none" style={{
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0F0520',
        opacity: darkOverlay,
      }} />

      {/* Shockwave ring from bottom */}
      <Animated.View style={{
        position: 'absolute',
        left: cx - shockwaveSize / 2, top: cy - shockwaveSize / 2,
        width: shockwaveSize, height: shockwaveSize, borderRadius: shockwaveSize / 2,
        borderWidth: 4, borderColor: '#7C3AED',
        opacity: shockwaveOpacity,
        transform: [{ scale: shockwaveScale }],
      }} />

      {/* Purple lightning bolts */}
      <Animated.View style={{ position: 'absolute', left: cx, top: cy, opacity: lightningOpacity }}>
        {Array.from({ length: LIGHTNING_COUNT }, (_, i) => (
          <HakiLightning key={i} index={i} total={LIGHTNING_COUNT} />
        ))}
      </Animated.View>
    </View>
  );
}

function HakiLightning({ index, total }: { index: number; total: number }) {
  const angle = (index / total) * Math.PI * 2;
  const length = 100 + Math.random() * 150;
  const segments = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
    x: Math.cos(angle + (Math.random() - 0.5) * 0.8) * (length * i / 5),
    y: Math.sin(angle + (Math.random() - 0.5) * 0.8) * (length * i / 5),
  })), []);

  return (
    <View style={{ position: 'absolute' }}>
      {segments.slice(0, -1).map((seg, i) => {
        const next = segments[i + 1];
        const dx = next.x - seg.x, dy = next.y - seg.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const rot = Math.atan2(dy, dx) * 180 / Math.PI;
        return (
          <View key={i} style={{
            position: 'absolute', left: seg.x, top: seg.y,
            width: len, height: 3, borderRadius: 1.5,
            backgroundColor: i % 2 === 0 ? '#A78BFA' : '#C4B5FD',
            transform: [{ rotate: `${rot}deg` }],
            shadowColor: '#7C3AED', shadowRadius: 6, shadowOpacity: 0.8, elevation: 5,
          }} />
        );
      })}
    </View>
  );
}

// ─── HOLLOW PURPLE — red & blue orbs merge into purple implosion ───
export function HollowPurpleAnimation({ onDone }: { onDone: () => void }) {
  const cx = W / 2, cy = H / 2;

  const redOrbX = useRef(new Animated.Value(-80)).current;
  const blueOrbX = useRef(new Animated.Value(W + 80)).current;
  const orbsOpacity = useRef(new Animated.Value(0)).current;
  const purpleScale = useRef(new Animated.Value(0)).current;
  const purpleOpacity = useRef(new Animated.Value(0)).current;
  const implosionScale = useRef(new Animated.Value(1)).current;
  const voidOpacity = useRef(new Animated.Value(0)).current;
  const crackleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Orbs appear and drift toward center
    Animated.parallel([
      Animated.timing(orbsOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(redOrbX, { toValue: cx - 60, duration: 1200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(blueOrbX, { toValue: cx - 40, duration: 1200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => {
      // Merge into purple
      Animated.timing(orbsOpacity, { toValue: 0, duration: 100, useNativeDriver: true }).start();

      // Purple explosion
      Animated.parallel([
        Animated.spring(purpleScale, { toValue: 1, tension: 50, friction: 4, useNativeDriver: true }),
        Animated.timing(purpleOpacity, { toValue: 0.95, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        // Hold then implode
        setTimeout(() => {
          Animated.timing(crackleOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
          Animated.sequence([
            Animated.timing(voidOpacity, { toValue: 0.95, duration: 200, useNativeDriver: true }),
            Animated.timing(voidOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]).start();
          Animated.parallel([
            Animated.timing(implosionScale, { toValue: 0.05, duration: 500, easing: Easing.in(Easing.back(3)), useNativeDriver: true }),
            Animated.sequence([
              Animated.delay(300),
              Animated.timing(purpleOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.delay(300),
              Animated.timing(crackleOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]),
          ]).start();
        }, 400);
      });
    });
    const t = setTimeout(onDone, 4500);
    return () => clearTimeout(t);
  }, []);

  const purpleSize = Math.max(W, H) * 1.4;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Red orb (Divergence) */}
      <Animated.View style={{
        position: 'absolute', top: cy - 25,
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: '#EF4444',
        opacity: orbsOpacity,
        transform: [{ translateX: redOrbX }],
        shadowColor: '#EF4444', shadowRadius: 20, shadowOpacity: 0.8, elevation: 15,
      }} />

      {/* Blue orb (Convergence) */}
      <Animated.View style={{
        position: 'absolute', top: cy - 25,
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: '#3B82F6',
        opacity: orbsOpacity,
        transform: [{ translateX: blueOrbX }],
        shadowColor: '#3B82F6', shadowRadius: 20, shadowOpacity: 0.8, elevation: 15,
      }} />

      {/* Void darkness */}
      <Animated.View pointerEvents="none" style={{
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0A0014',
        opacity: voidOpacity,
      }} />

      {/* Purple sphere */}
      <Animated.View style={{
        position: 'absolute',
        left: cx - purpleSize / 2, top: cy - purpleSize / 2,
        width: purpleSize, height: purpleSize, borderRadius: purpleSize / 2,
        backgroundColor: '#7C3AED',
        opacity: purpleOpacity,
        transform: [{ scale: Animated.multiply(purpleScale, implosionScale) }],
      }}>
        {[0.7, 0.5, 0.3].map((r, i) => (
          <View key={i} style={{
            position: 'absolute',
            left: purpleSize / 2 - (purpleSize * r) / 2,
            top: purpleSize / 2 - (purpleSize * r) / 2,
            width: purpleSize * r, height: purpleSize * r,
            borderRadius: (purpleSize * r) / 2,
            backgroundColor: i === 2 ? '#F5F3FF' : i === 1 ? '#C4B5FD' : '#A78BFA',
          }} />
        ))}
      </Animated.View>

      {/* Energy crackle lines */}
      <Animated.View style={{ position: 'absolute', left: cx, top: cy, opacity: crackleOpacity }}>
        {Array.from({ length: 20 }, (_, i) => {
          const angle = (i / 20) * Math.PI * 2;
          const len = 40 + Math.random() * 80;
          return (
            <View key={i} style={{
              position: 'absolute', left: 0, top: -1,
              width: len, height: 2, borderRadius: 1,
              backgroundColor: i % 3 === 0 ? '#EC4899' : '#A78BFA',
              transform: [{ rotate: `${angle}rad` }],
            }} />
          );
        })}
      </Animated.View>
    </View>
  );
}

// ─── WIN ANIMATION PLAYER ───
export function WinAnimationPlayer({
  animationId,
  onDone,
}: {
  animationId: string;
  onDone: () => void;
}) {
  switch (animationId) {
    case 'confetti': return <ConfettiAnimation onDone={onDone} />;
    case 'fireworks': return <FireworksAnimation onDone={onDone} />;
    case 'stars_fall': return <StarsFallAnimation onDone={onDone} />;
    case 'gold_rain': return <GoldRainAnimation onDone={onDone} />;
    case 'arabic_calligraphy_burst': return <CalligraphyBurstAnimation onDone={onDone} />;
    case 'galaxy_explosion': return <GalaxyExplosionAnimation onDone={onDone} />;
    case 'spirit_bomb': return <SpiritBombAnimation onDone={onDone} />;
    case 'rasengan': return <RasenganAnimation onDone={onDone} />;
    case 'breath_of_fire': return <BreathOfFireAnimation onDone={onDone} />;
    case 'thunder_spear': return <ThunderSpearAnimation onDone={onDone} />;
    case 'conquerors_haki': return <ConquerorsHakiAnimation onDone={onDone} />;
    case 'hollow_purple': return <HollowPurpleAnimation onDone={onDone} />;
    case 'default':
    default:
      return <ConfettiAnimation onDone={onDone} />;
  }
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
});
