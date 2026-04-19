import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../src/lib/constants';
import { useLanguage } from '../src/lib/LanguageContext';

const { width: W, height: H } = Dimensions.get('window');

const TUTORIAL_STEPS_EN = [
  {
    title: 'Welcome to Kalimat!',
    subtitle: 'The daily word guessing game',
    content: 'A new word every day for everyone\nAre you ready for the challenge?',
    visual: 'intro',
    action: 'Next →',
  },
  {
    title: 'How to Play',
    subtitle: 'The idea is simple',
    content: 'Type a 5-letter word\nYou have 6 attempts to find it',
    visual: 'grid',
    action: 'Next →',
  },
  {
    title: 'Colors Guide You',
    subtitle: 'Each color has a meaning',
    content: null,
    visual: 'colors',
    action: 'Got it! →',
  },
  {
    title: 'Game Modes',
    subtitle: 'More than just a daily word',
    content: null,
    visual: 'modes',
    action: 'Awesome! →',
  },
  {
    title: 'Ready to Play?',
    subtitle: 'Choose your name and start',
    content: 'Join players worldwide\nand prove you are a word master',
    visual: 'ready',
    action: 'Choose Name ✨',
  },
];

const TUTORIAL_STEPS = [
  {
    title: '\u0623\u0647\u0644\u0627\u064B \u0641\u064A \u0643\u0644\u0645\u0627\u062A!',
    subtitle: '\u0644\u0639\u0628\u0629 \u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629',
    content: '\u0643\u0644 \u064A\u0648\u0645 \u0643\u0644\u0645\u0629 \u062C\u062F\u064A\u062F\u0629 \u064A\u0634\u0627\u0631\u0643\u0647\u0627 \u0643\u0644 \u0627\u0644\u0639\u0631\u0628\n\u0647\u0644 \u0623\u0646\u062A \u0645\u0633\u062A\u0639\u062F \u0644\u0644\u062A\u062D\u062F\u064A\u061F',
    visual: 'intro',
    action: '\u0627\u0644\u062A\u0627\u0644\u064A \u2192',
  },
  {
    title: '\u0643\u064A\u0641 \u062A\u0644\u0639\u0628\u061F',
    subtitle: '\u0627\u0644\u0641\u0643\u0631\u0629 \u0628\u0633\u064A\u0637\u0629 \u062C\u062F\u0627\u064B',
    content: '\u0627\u0643\u062A\u0628 \u0643\u0644\u0645\u0629 \u0645\u0646 \u0665 \u0623\u062D\u0631\u0641\n\u0648\u0644\u062F\u064A\u0643 \u0666 \u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0644\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u064A\u0647\u0627',
    visual: 'grid',
    action: '\u0627\u0644\u062A\u0627\u0644\u064A \u2192',
  },
  {
    title: '\u0627\u0644\u0623\u0644\u0648\u0627\u0646 \u062A\u062E\u0628\u0631\u0643',
    subtitle: '\u0643\u0644 \u0644\u0648\u0646 \u0644\u0647 \u0645\u0639\u0646\u0649',
    content: null,
    visual: 'colors',
    action: '\u0641\u0647\u0645\u062A! \u2192',
  },
  {
    title: '\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0623\u0644\u0639\u0627\u0628',
    subtitle: '\u0623\u0643\u062B\u0631 \u0645\u0646 \u0645\u062C\u0631\u062F \u0643\u0644\u0645\u0629 \u064A\u0648\u0645\u064A\u0629',
    content: null,
    visual: 'modes',
    action: '\u0631\u0627\u0626\u0639! \u2192',
  },
  {
    title: '\u062C\u0627\u0647\u0632 \u0644\u0644\u0639\u0628\u061F',
    subtitle: '\u0627\u062E\u062A\u0631 \u0627\u0633\u0645\u0643 \u0648\u0627\u0628\u062F\u0623 \u0627\u0644\u062A\u062D\u062F\u064A',
    content: '\u0627\u0646\u0636\u0645 \u0644\u0644\u0627\u0639\u0628\u064A\u0646 \u0627\u0644\u0639\u0631\u0628\n\u0648\u0623\u062B\u0628\u062A \u0623\u0646\u0643 \u0623\u0645\u064A\u0631 \u0627\u0644\u0643\u0644\u0645\u0627\u062A',
    visual: 'ready',
    action: '\u0627\u062E\u062A\u0631 \u0627\u0633\u0645\u0643 \u2728',
  },
];

// ─── Visual Components ───

function IntroVisual({ isEnglish }: { isEnglish: boolean }) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.12, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.05, duration: 1500, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  return (
    <View style={vis.center}>
      <Animated.View style={[vis.glowCircle, { opacity: glowAnim }]} />
      <Animated.View style={[vis.hexWrap, { transform: [{ scale: scaleAnim }] }]}>
        <View style={vis.hexagon}>
          <View style={vis.hexInner}>
            <Text style={vis.hexLetter}>{isEnglish ? 'K' : '\u0643'}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function GridVisual({ isEnglish }: { isEnglish: boolean }) {
  const rows = 6;
  const cols = 5;
  const sampleLetters = isEnglish
    ? ['W', 'O', 'R']
    : ['\u0643', '\u062A', '\u0627'];
  return (
    <View style={vis.center}>
      <View style={vis.gridWrap}>
        {Array.from({ length: rows }).map((_, r) => (
          <View key={r} style={[vis.gridRow, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
            {Array.from({ length: cols }).map((_, c) => (
              <View key={c} style={[vis.gridCell, r === 0 && c < 3 && vis.gridCellFilled]}>
                {r === 0 && c < 3 && <Text style={vis.gridLetter}>{sampleLetters[c]}</Text>}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function ColorsVisual({ isEnglish }: { isEnglish: boolean }) {
  const correctLetters = isEnglish ? ['W', 'O', 'R', 'D', ' '] : ['\u0643', '\u062A', '\u0627', '\u0628', ' '];
  const presentLetters = isEnglish ? [' ', 'E', ' ', ' ', ' '] : [' ', '\u0645', ' ', ' ', ' '];
  const absentLetters  = isEnglish ? [' ', ' ', 'Z', ' ', ' '] : [' ', ' ', '\u0632', ' ', ' '];

  const rowDirection: 'row' | 'row-reverse' = isEnglish ? 'row' : 'row-reverse';
  const arrow = isEnglish ? '\u2192' : '\u2190';

  const labels = isEnglish
    ? [
        'Letter is in the correct spot',
        'Letter is in the word, wrong spot',
        'Letter is not in the word',
      ]
    : [
        '\u0627\u0644\u062D\u0631\u0641 \u0641\u064A \u0645\u0643\u0627\u0646\u0647 \u0627\u0644\u0635\u062D\u064A\u062D',
        '\u0627\u0644\u062D\u0631\u0641 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0645\u0643\u0627\u0646 \u0622\u062E\u0631',
        '\u0627\u0644\u062D\u0631\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0643\u0644\u0645\u0629',
      ];

  const rows = [
    { letters: correctLetters, color: '#22C55E', highlight: 0 },
    { letters: presentLetters, color: '#F59E0B', highlight: 1 },
    { letters: absentLetters,  color: '#4B5563', highlight: 2 },
  ];

  return (
    <View style={vis.colorsWrap}>
      {rows.map((row, idx) => (
        <View key={idx} style={vis.colorRow}>
          <View style={[vis.colorExRow, { flexDirection: rowDirection }]}>
            {row.letters.map((l, i) => (
              <View key={i} style={[vis.colorCell, i === row.highlight && { backgroundColor: row.color }]}>
                <Text style={vis.colorLetter}>{l}</Text>
              </View>
            ))}
          </View>
          <Text style={vis.colorLabel}>{isEnglish ? `${arrow} ${labels[idx]}` : `${arrow} ${labels[idx]}`}</Text>
        </View>
      ))}
    </View>
  );
}

function ModesVisual({ isEnglish }: { isEnglish: boolean }) {
  const modes = isEnglish
    ? [
        { emoji: '\uD83D\uDCC5', name: 'Daily Word',  desc: 'A new word each day',    color: '#7C3AED' },
        { emoji: '\u26A1',        name: 'Quick Duel',  desc: '1 vs 1 with players',    color: '#F59E0B' },
        { emoji: '\u221E',        name: 'Classic',     desc: 'Play without limits',    color: '#22C55E' },
      ]
    : [
        { emoji: '\uD83D\uDCC5', name: '\u0643\u0644\u0645\u0629 \u0627\u0644\u064A\u0648\u0645', desc: '\u0643\u0644\u0645\u0629 \u062C\u062F\u064A\u062F\u0629 \u0643\u0644 \u064A\u0648\u0645', color: '#7C3AED' },
        { emoji: '\u26A1', name: '\u062A\u062D\u062F\u064D \u0633\u0631\u064A\u0639', desc: '\u0661 \u0636\u062F \u0661 \u0645\u0639 \u0644\u0627\u0639\u0628\u064A\u0646', color: '#F59E0B' },
        { emoji: '\u221E', name: '\u0627\u0644\u0643\u0644\u0627\u0633\u064A\u0643\u064A', desc: '\u0627\u0644\u0639\u0628 \u0628\u0644\u0627 \u062D\u062F\u0648\u062F', color: '#22C55E' },
      ];
  return (
    <View style={[vis.modesWrap, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
      {modes.map((m, i) => (
        <View key={i} style={[vis.modeCard, { borderColor: m.color + '40' }]}>
          <Text style={{ fontSize: 32 }}>{m.emoji}</Text>
          <Text style={vis.modeName}>{m.name}</Text>
          <Text style={[vis.modeDesc, { color: m.color }]}>{m.desc}</Text>
        </View>
      ))}
    </View>
  );
}

function ReadyVisual() {
  const scale1 = useRef(new Animated.Value(0)).current;
  const scale2 = useRef(new Animated.Value(0)).current;
  const scale3 = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.stagger(200, [
      Animated.spring(scale1, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
      Animated.spring(scale2, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
      Animated.spring(scale3, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={vis.center}>
      <View style={{ flexDirection: 'row', gap: 20 }}>
        <Animated.Text style={[{ fontSize: 56 }, { transform: [{ scale: scale1 }] }]}>{'\uD83C\uDF89'}</Animated.Text>
        <Animated.Text style={[{ fontSize: 56 }, { transform: [{ scale: scale2 }] }]}>{'\uD83C\uDFC6'}</Animated.Text>
        <Animated.Text style={[{ fontSize: 56 }, { transform: [{ scale: scale3 }] }]}>{'\u2728'}</Animated.Text>
      </View>
    </View>
  );
}

function TutorialVisual({ type, isEnglish }: { type: string; isEnglish: boolean }) {
  switch (type) {
    case 'intro': return <IntroVisual isEnglish={isEnglish} />;
    case 'grid': return <GridVisual isEnglish={isEnglish} />;
    case 'colors': return <ColorsVisual isEnglish={isEnglish} />;
    case 'modes': return <ModesVisual isEnglish={isEnglish} />;
    case 'ready': return <ReadyVisual />;
    default: return null;
  }
}

// ─── Main Screen ───

export default function TutorialScreen() {
  const { isEnglish } = useLanguage();
  const steps = isEnglish ? TUTORIAL_STEPS_EN : TUTORIAL_STEPS;
  const [step, setStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const current = steps[step];

  function finishTutorial() {
    AsyncStorage.setItem('kalimat_tutorial_done', 'true');
    AsyncStorage.setItem('seen_splash', 'true');
    router.replace('/username' as any);
  }

  function nextStep() {
    Animated.timing(slideAnim, { toValue: -W, duration: 200, useNativeDriver: true }).start(() => {
      if (step < steps.length - 1) {
        slideAnim.setValue(W);
        setStep(s => s + 1);
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      } else {
        finishTutorial();
      }
    });
  }

  const isLast = step === steps.length - 1;
  const dotsDirection: 'row' | 'row-reverse' = isEnglish ? 'row' : 'row-reverse';

  return (
    <View style={s.container}>
      {/* Progress dots */}
      <View style={[s.dotsRow, { flexDirection: dotsDirection }]}>
        {steps.map((_, i) => (
          <View key={i} style={[s.dot, i === step && s.dotActive, i < step && s.dotDone]} />
        ))}
      </View>

      {/* Animated content */}
      <Animated.View style={[s.content, { transform: [{ translateX: slideAnim }] }]}>
        {/* Visual — top half */}
        <View style={s.visualArea}>
          <TutorialVisual type={current.visual} isEnglish={isEnglish} />
        </View>

        {/* Text — bottom */}
        <View style={s.textArea}>
          <Text style={s.title}>{current.title}</Text>
          <Text style={s.subtitle}>{current.subtitle}</Text>
          {current.content && <Text style={s.body}>{current.content}</Text>}
        </View>
      </Animated.View>

      {/* Action */}
      <View style={s.bottom}>
        <TouchableOpacity style={s.actionBtn} activeOpacity={0.85} onPress={nextStep}>
          <Text style={s.actionText}>{current.action}</Text>
        </TouchableOpacity>

        {!isLast && (
          <TouchableOpacity onPress={finishTutorial} style={s.skipBtn}>
            <Text style={s.skipText}>{isEnglish ? 'Skip' : '\u062A\u062E\u0637\u064A'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───

const vis = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glowCircle: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: COLORS.PURPLE,
  },
  hexWrap: { marginBottom: 0 },
  hexagon: {
    width: 120, height: 120, borderRadius: 28, backgroundColor: COLORS.PURPLE,
    transform: [{ rotate: '45deg' }], alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.PURPLE, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 30, elevation: 15,
  },
  hexInner: { transform: [{ rotate: '-45deg' }], alignItems: 'center', justifyContent: 'center' },
  hexLetter: { fontSize: 52, fontWeight: '900', color: '#FFF' },

  gridWrap: { gap: 6 },
  gridRow: { flexDirection: 'row-reverse', gap: 6 },
  gridCell: {
    width: 44, height: 44, borderRadius: 8, backgroundColor: '#2A2A50',
    borderWidth: 1.5, borderColor: '#3D3D6B', alignItems: 'center', justifyContent: 'center',
  },
  gridCellFilled: { borderColor: COLORS.PURPLE, backgroundColor: '#1E1E3A' },
  gridLetter: { fontSize: 20, fontWeight: '800', color: '#FFF' },

  colorsWrap: { gap: 20, paddingHorizontal: 16 },
  colorRow: { alignItems: 'center', gap: 8 },
  colorExRow: { flexDirection: 'row-reverse', gap: 6 },
  colorCell: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: '#2A2A50',
    borderWidth: 1, borderColor: '#3D3D6B', alignItems: 'center', justifyContent: 'center',
  },
  colorLetter: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  colorLabel: { fontSize: 14, color: COLORS.TEXT_SECONDARY, textAlign: 'center' },

  modesWrap: { flexDirection: 'row-reverse', gap: 12, paddingHorizontal: 8 },
  modeCard: {
    flex: 1, backgroundColor: '#1A1A2E', borderRadius: 16, borderWidth: 1,
    padding: 14, alignItems: 'center', gap: 6,
  },
  modeName: { fontSize: 14, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  modeDesc: { fontSize: 11, textAlign: 'center' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0730', paddingTop: 60 },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#2D2D50',
  },
  dotActive: { backgroundColor: COLORS.PURPLE, width: 24 },
  dotDone: { backgroundColor: COLORS.PURPLE_LIGHT },

  content: { flex: 1 },
  visualArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textArea: { paddingHorizontal: 32, paddingBottom: 16, alignItems: 'center', gap: 8 },
  title: { fontSize: 32, fontWeight: '900', color: '#FFF', textAlign: 'center' },
  subtitle: { fontSize: 17, color: COLORS.PURPLE_LIGHT, textAlign: 'center' },
  body: { fontSize: 15, color: COLORS.TEXT_SECONDARY, textAlign: 'center', lineHeight: 24 },

  bottom: { paddingHorizontal: 32, paddingBottom: 40 },
  actionBtn: {
    height: 58, backgroundColor: COLORS.PURPLE, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.PURPLE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  actionText: { color: '#FFF', fontSize: 19, fontWeight: '800' },
  skipBtn: { alignItems: 'center', marginTop: 14 },
  skipText: { color: COLORS.TEXT_SECONDARY, fontSize: 15 },
});
