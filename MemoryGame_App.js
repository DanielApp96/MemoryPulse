import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar, SafeAreaView, Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW } = Dimensions.get('window');

const C = {
  bg: '#0F0E17',
  surface: '#1A1825',
  card: '#252336',
  accent: '#FF6B6B',
  blue: '#4ECDC4',
  purple: '#A855F7',
  yellow: '#FFD93D',
  green: '#6BCB77',
  white: '#FFFFFE',
  muted: '#A7A9BE',
  watching: '#FF6B6B',  // red = watch
  inputting: '#6BCB77', // green = your turn
};

const GAME_COLORS = [
  { name: 'Red',    hex: '#FF6B6B' },
  { name: 'Blue',   hex: '#4ECDC4' },
  { name: 'Yellow', hex: '#FFD93D' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Green',  hex: '#6BCB77' },
  { name: 'Orange', hex: '#FF9F43' },
];

const MODES = [
  { id: 'grid',   label: '3×3 Grid',  emoji: '⬜', desc: 'Remember which squares light up' },
  { id: 'number', label: 'Numbers',   emoji: '🔢', desc: 'Remember the number sequence' },
  { id: 'color',  label: 'Colors',    emoji: '🎨', desc: 'Remember the color sequence' },
];

// ─── APP ─────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('menu');
  const [mode, setMode] = useState('grid');
  const [finalScore, setFinalScore] = useState(0);
  const [bests, setBests] = useState({ grid: 0, number: 0, color: 0 });

  useEffect(() => {
    AsyncStorage.getItem('@memory_bests').then(val => {
      if (val) setBests(JSON.parse(val));
    });
  }, []);

  const saveBest = async (m, sc) => {
    setBests(prev => {
      if (sc > (prev[m] || 0)) {
        const updated = { ...prev, [m]: sc };
        AsyncStorage.setItem('@memory_bests', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  };

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {screen === 'menu' && (
        <MenuScreen bests={bests} onStart={(m) => { setMode(m); setScreen('game'); }} />
      )}
      {screen === 'game' && (
        <GameScreen
          key={`${mode}-${Date.now()}`}
          mode={mode}
          best={bests[mode] || 0}
          onEnd={(sc) => { setFinalScore(sc); saveBest(mode, sc); setScreen('result'); }}
          onBack={() => setScreen('menu')}
        />
      )}
      {screen === 'result' && (
        <ResultScreen
          score={finalScore}
          best={bests[mode] || 0}
          mode={mode}
          onReplay={() => setScreen('game')}
          onMenu={() => setScreen('menu')}
        />
      )}
    </SafeAreaView>
  );
}

// ─── MENU ────────────────────────────────────────────────
function MenuScreen({ bests, onStart }) {
  const [selected, setSelected] = useState('grid');

  return (
    <View style={st.center}>
      <Text style={st.mainTitle}>🧠 MemoryPulse</Text>
      <Text style={st.mainSub}>Train your memory</Text>

      <View style={{ width: '100%', paddingHorizontal: 20, gap: 10, marginVertical: 8 }}>
        {MODES.map(m => (
          <TouchableOpacity
            key={m.id}
            style={[st.modeCard, selected === m.id && st.modeCardActive]}
            onPress={() => setSelected(m.id)}
            activeOpacity={0.8}
          >
            <Text style={st.modeEmoji}>{m.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[st.modeLabel, selected === m.id && { color: C.white }]}>{m.label}</Text>
              <Text style={st.modeDesc}>{m.desc}</Text>
            </View>
            <View style={st.bestBadge}>
              <Text style={st.bestBadgeTxt}>🏆 {bests[m.id] || 0}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={st.startBtn} onPress={() => onStart(selected)} activeOpacity={0.85}>
        <Text style={st.startBtnTxt}>START →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── GAME SCREEN ─────────────────────────────────────────
function GameScreen({ mode, best, onEnd, onBack }) {
  const [phase, setPhase] = useState('showing');
  const [sequence, setSequence] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [userInput, setUserInput] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [level, setLevel] = useState(1);

  const phaseRef = useRef('showing');
  const seqRef = useRef([]);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const SHOW_DURATION = Math.max(350, 850 - level * 25);
  const PAUSE_DURATION = 280;

  const randomItem = () => {
    if (mode === 'grid') return Math.floor(Math.random() * 9);
    if (mode === 'number') return Math.floor(Math.random() * 9) + 1;
    if (mode === 'color') return Math.floor(Math.random() * GAME_COLORS.length);
  };

  const startRound = useCallback((currentSeq) => {
    setPhase('showing');
    phaseRef.current = 'showing';
    setUserInput([]);
    setFeedback(null);
    setActiveItem(null);
    seqRef.current = currentSeq;

    let i = 0;
    const showNext = () => {
      if (i >= currentSeq.length) {
        setActiveItem(null);
        setTimeout(() => { setPhase('input'); phaseRef.current = 'input'; }, PAUSE_DURATION);
        return;
      }
      setActiveItem(currentSeq[i]);
      setTimeout(() => {
        setActiveItem(null);
        setTimeout(() => { i++; showNext(); }, PAUSE_DURATION);
      }, SHOW_DURATION);
    };
    setTimeout(showNext, 700);
  }, [level]);

  useEffect(() => {
    const first = [randomItem()];
    setSequence(first);
    startRound(first);
  }, []);

  const handleInput = (item) => {
    if (phaseRef.current !== 'input') return;
    const newInput = [...userInput, item];
    setUserInput(newInput);
    const idx = newInput.length - 1;

    if (item !== seqRef.current[idx]) {
      setPhase('feedback');
      phaseRef.current = 'feedback';
      setFeedback('wrong');
      setActiveItem(item);
      setTimeout(() => { onEnd(level - 1); }, 1200);
      return;
    }

    setActiveItem(item);
    setTimeout(() => setActiveItem(null), 280);

    if (newInput.length === seqRef.current.length) {
      setPhase('feedback');
      phaseRef.current = 'feedback';
      setFeedback('correct');
      setTimeout(() => {
        const newSeq = [...seqRef.current, randomItem()];
        setSequence(newSeq);
        setLevel(l => l + 1);
        startRound(newSeq);
      }, 650);
    }
  };

  const isWatching = phase === 'showing';
  const isInput = phase === 'input';
  const indicatorColor = feedback === 'wrong' ? C.accent : feedback === 'correct' ? C.green : isInput ? C.inputting : C.watching;
  const indicatorLabel = feedback === 'wrong' ? '✗ Wrong!' : feedback === 'correct' ? '✓ Perfect!' : isInput ? '👆 YOUR TURN' : '👀 WATCH';

  return (
    <View style={st.gameBg}>
      {/* Header */}
      <View style={st.gameHeader}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={st.backBtn}>← Back</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={st.levelTxt}>Level {level}</Text>
          <Text style={st.seqLen}>{sequence.length} step{sequence.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={st.bestMini}>
          <Text style={st.bestMiniTxt}>🏆 {best}</Text>
        </View>
      </View>

      {/* BIG COLOR INDICATOR */}
      <Animated.View style={[
        st.indicator,
        { backgroundColor: indicatorColor }
      ]}>
        <Text style={st.indicatorTxt}>{indicatorLabel}</Text>
        {isInput && (
          <Text style={st.indicatorSub}>{userInput.length} / {sequence.length}</Text>
        )}
      </Animated.View>

      {/* Game area */}
      <View style={st.gameArea}>
        {mode === 'grid' && <GridBoard active={activeItem} onPress={handleInput} disabled={!isInput} feedback={feedback} />}
        {mode === 'number' && <NumberBoard active={activeItem} onPress={handleInput} disabled={!isInput} feedback={feedback} />}
        {mode === 'color' && <ColorBoard active={activeItem} onPress={handleInput} disabled={!isInput} feedback={feedback} />}
      </View>

      {/* Sequence dots */}
      <View style={st.seqDots}>
        {sequence.map((_, i) => (
          <View key={i} style={[
            st.dot,
            i < userInput.length && { backgroundColor: C.inputting },
            i === userInput.length && isInput && { backgroundColor: C.blue, transform: [{ scale: 1.4 }] },
          ]} />
        ))}
      </View>
    </View>
  );
}

// ─── GRID BOARD ──────────────────────────────────────────
function GridBoard({ active, onPress, disabled, feedback }) {
  const size = Math.floor((SW - 80) / 3);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: size * 3 + 16, gap: 8 }}>
      {Array.from({ length: 9 }, (_, i) => {
        const isActive = active === i;
        return (
          <TouchableOpacity
            key={i}
            onPress={() => !disabled && onPress(i)}
            activeOpacity={disabled ? 1 : 0.65}
            style={[st.gridCell, {
              width: size, height: size,
              backgroundColor: isActive
                ? (feedback === 'wrong' ? C.watching : C.yellow)
                : C.card,
              borderColor: isActive ? (feedback === 'wrong' ? C.watching : C.yellow) : '#2E2C40',
              transform: [{ scale: isActive ? 1.06 : 1 }],
            }]}
          />
        );
      })}
    </View>
  );
}

// ─── NUMBER BOARD ────────────────────────────────────────
function NumberBoard({ active, onPress, disabled, feedback }) {
  const size = Math.floor((SW - 80) / 3);
  return (
    <View style={{ alignItems: 'center', gap: 0 }}>
      <View style={[st.displayBox, active !== null && { borderColor: C.yellow, backgroundColor: '#2A2518' }]}>
        <Text style={[st.displayNum, active === null && { opacity: 0 }]}>
          {active !== null ? active : '0'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: size * 3 + 16, gap: 8, marginTop: 18 }}>
        {Array.from({ length: 9 }, (_, i) => i + 1).map(n => (
          <TouchableOpacity
            key={n}
            onPress={() => !disabled && onPress(n)}
            activeOpacity={disabled ? 1 : 0.65}
            style={[st.numCell, { width: size, height: size }]}
          >
            <Text style={st.numTxt}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── COLOR BOARD ─────────────────────────────────────────
function ColorBoard({ active, onPress, disabled, feedback }) {
  const size = Math.floor((SW - 80) / 3);
  return (
    <View style={{ alignItems: 'center', gap: 0 }}>
      <View style={[st.displayBox,
        active !== null && { backgroundColor: GAME_COLORS[active].hex, borderColor: GAME_COLORS[active].hex }
      ]}>
        <Text style={[st.displayColorName, { color: active !== null ? '#fff' : C.muted }]}>
          {active !== null ? GAME_COLORS[active].name : '?'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: size * 3 + 16, gap: 8, marginTop: 18 }}>
        {GAME_COLORS.map((col, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => !disabled && onPress(i)}
            activeOpacity={disabled ? 1 : 0.65}
            style={[st.colorCell, { width: size, height: size, backgroundColor: col.hex }]}
          >
            <Text style={st.colorCellTxt}>{col.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── RESULT ──────────────────────────────────────────────
function ResultScreen({ score, best, mode, onReplay, onMenu }) {
  const m = MODES.find(x => x.id === mode);
  const isNewBest = score >= best && score > 0;
  const bounce = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.spring(bounce, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, []);

  const getMessage = () => {
    if (score === 0) return "Don't give up!";
    if (score < 3) return "Good start!";
    if (score < 6) return "Nice memory!";
    if (score < 10) return "Impressive!";
    return "Memory master! 🏆";
  };

  return (
    <View style={st.center}>
      <Animated.View style={[st.resultCard, { transform: [{ scale: bounce }] }]}>
        <Text style={{ fontSize: 52 }}>🧠</Text>
        <Text style={st.resultTitle}>Game Over</Text>
        <Text style={st.resultMode}>{m?.emoji} {m?.label}</Text>

        {isNewBest && (
          <View style={st.newBestBadge}>
            <Text style={st.newBestTxt}>🏆 NEW BEST!</Text>
          </View>
        )}

        <View style={st.resultScoreBox}>
          <Text style={[st.resultScoreNum, { color: isNewBest ? C.yellow : C.accent }]}>{score}</Text>
          <Text style={st.resultScoreLbl}>levels completed</Text>
        </View>

        <View style={st.resultBestRow}>
          <Text style={st.resultBestTxt}>Best: {best}</Text>
        </View>

        <Text style={st.resultMsg}>{getMessage()}</Text>
      </Animated.View>

      <TouchableOpacity style={st.startBtn} onPress={onReplay} activeOpacity={0.85}>
        <Text style={st.startBtnTxt}>🔄 Try Again</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[st.startBtn, { backgroundColor: C.surface }]} onPress={onMenu}>
        <Text style={[st.startBtnTxt, { color: C.muted }]}>← Change Mode</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: C.bg, paddingHorizontal: 16 },
  mainTitle: { fontSize: 36, fontWeight: '800', color: C.white },
  mainSub: { fontSize: 15, color: C.muted },

  modeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, padding: 14, gap: 12, borderWidth: 1.5, borderColor: '#2E2C40' },
  modeCardActive: { borderColor: C.accent, backgroundColor: '#22172A' },
  modeEmoji: { fontSize: 26 },
  modeLabel: { fontSize: 15, fontWeight: '700', color: C.muted },
  modeDesc: { fontSize: 11, color: C.muted, marginTop: 2 },
  bestBadge: { backgroundColor: '#2A2518', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  bestBadgeTxt: { fontSize: 13, fontWeight: '700', color: C.yellow },

  startBtn: { backgroundColor: C.accent, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30 },
  startBtnTxt: { fontSize: 18, fontWeight: '800', color: '#fff' },

  gameBg: { flex: 1, backgroundColor: C.bg },
  gameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  backBtn: { fontSize: 14, color: C.muted, fontWeight: '600' },
  levelTxt: { fontSize: 20, fontWeight: '800', color: C.white },
  seqLen: { fontSize: 11, color: C.muted },
  bestMini: { backgroundColor: '#2A2518', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  bestMiniTxt: { fontSize: 13, fontWeight: '700', color: C.yellow },

  // BIG INDICATOR
  indicator: {
    marginHorizontal: 20,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 8,
    gap: 2,
  },
  indicatorTxt: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  indicatorSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  gameArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },

  gridCell: { borderRadius: 14, borderWidth: 2 },

  displayBox: { width: SW - 80, height: 90, backgroundColor: C.surface, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2E2C40' },
  displayNum: { fontSize: 60, fontWeight: '800', color: C.white },
  displayColorName: { fontSize: 26, fontWeight: '800' },

  numCell: { borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2E2C40' },
  numTxt: { fontSize: 26, fontWeight: '700', color: C.white },

  colorCell: { borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  colorCellTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },

  seqDots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 14, gap: 6, minHeight: 28 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#333' },

  resultCard: { backgroundColor: C.surface, borderRadius: 24, padding: 28, alignItems: 'center', gap: 8, width: '100%', borderWidth: 1, borderColor: '#2E2C40' },
  resultTitle: { fontSize: 26, fontWeight: '800', color: C.white },
  resultMode: { fontSize: 15, color: C.muted },
  newBestBadge: { backgroundColor: '#2A2518', paddingHorizontal: 20, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.yellow },
  newBestTxt: { fontSize: 14, fontWeight: '800', color: C.yellow },
  resultScoreBox: { backgroundColor: C.bg, borderRadius: 16, paddingHorizontal: 32, paddingVertical: 10, alignItems: 'center' },
  resultScoreNum: { fontSize: 52, fontWeight: '800' },
  resultScoreLbl: { fontSize: 12, color: C.muted },
  resultBestRow: { flexDirection: 'row', gap: 8 },
  resultBestTxt: { fontSize: 14, color: C.muted },
  resultMsg: { fontSize: 15, color: C.yellow, fontWeight: '600' },
});
