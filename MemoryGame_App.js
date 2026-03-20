import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar, SafeAreaView, Animated, Modal, ScrollView, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

const { width: SW } = Dimensions.get('window');

// ─── CONFIG ──────────────────────────────────────────────
const REVENUECAT_KEY = 'test_bEeInQGmmJCqbgBfdZHvyVKrrjZ';
const ADMOB_APP_ID = 'ca-app-pub-2102575447461980~6609466609';
const AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : 'ca-app-pub-2102575447461980/7730976586';
const ENTITLEMENT_ID = 'premium';

// ─── COLORS ──────────────────────────────────────────────
const C = {
  bg: '#0F0E17', surface: '#1A1825', card: '#252336',
  accent: '#FF6B6B', blue: '#4ECDC4', purple: '#A855F7',
  yellow: '#FFD93D', green: '#6BCB77', white: '#FFFFFE',
  muted: '#A7A9BE', watching: '#FF6B6B', inputting: '#6BCB77',
  gold: '#FFD700',
};

const GAME_COLORS = [
  { name: 'Red',    hex: '#FF6B6B' },
  { name: 'Blue',   hex: '#4ECDC4' },
  { name: 'Yellow', hex: '#FFD93D' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Green',  hex: '#6BCB77' },
  { name: 'Orange', hex: '#FF9F43' },
];

const SHAPES = [
  { id: 0, name: 'Circle',         draw: (s,c) => <View style={{width:s,height:s,borderRadius:s/2,backgroundColor:c}}/> },
  { id: 1, name: 'Ellipse',        draw: (s,c) => <View style={{width:s*1.7,height:s*0.65,borderRadius:s,backgroundColor:c}}/> },
  { id: 2, name: 'Triangle',       draw: (s,c) => <EquilTriangle size={s} color={c}/> },
  { id: 3, name: 'Heart',          draw: (s,c) => <Heart size={s} color={c}/> },
  { id: 4, name: 'Pentagon',       draw: (s,c) => <Pentagon size={s} color={c}/> },
  { id: 5, name: 'Right Triangle', draw: (s,c) => <RightTriangle size={s} color={c}/> },
  { id: 6, name: 'Square',         draw: (s,c) => <View style={{width:s,height:s,backgroundColor:c,borderRadius:4}}/> },
  { id: 7, name: 'Rectangle',      draw: (s,c) => <View style={{width:s*1.65,height:s*0.6,backgroundColor:c,borderRadius:4}}/> },
  { id: 8, name: 'Rhombus',        draw: (s,c) => <Rhombus size={s} color={c}/> },
];

const LSHAPES = [
  { id: 0, rotate: 0 },   { id: 1, rotate: 45 },
  { id: 2, rotate: 90 },  { id: 3, rotate: 135 },
  { id: 4, rotate: 180 }, { id: 5, rotate: 225 },
  { id: 6, rotate: 270 }, { id: 7, rotate: 315 },
];

const FREE_MODES = [
  { id: 'grid',   label: '3×3 Grid', emoji: '⬜', desc: 'Remember lit squares' },
  { id: 'number', label: 'Numbers',  emoji: '🔢', desc: 'Remember number sequence' },
  { id: 'color',  label: 'Colors',   emoji: '🎨', desc: 'Remember color sequence' },
];

const PREMIUM_MODES = [
  { id: 'grid4',   label: '4×4 Grid', emoji: '🟦', desc: 'Bigger matrix challenge' },
  { id: 'shapes',  label: 'Shapes',   emoji: '🔷', desc: 'Remember geometric shapes' },
  { id: 'lshapes', label: 'L-Shapes', emoji: null, desc: 'Remember rotated corners' },
];

// ─── SHAPE COMPONENTS ────────────────────────────────────
function RightTriangle({ size: s, color }) {
  return <View style={{ width:0, height:0, borderLeftWidth:s, borderBottomWidth:s, borderLeftColor:'transparent', borderBottomColor:color }} />;
}
function EquilTriangle({ size: s, color }) {
  return <View style={{ width:0, height:0, borderLeftWidth:s*0.62, borderRightWidth:s*0.62, borderBottomWidth:s, borderLeftColor:'transparent', borderRightColor:'transparent', borderBottomColor:color }} />;
}
function Rhombus({ size: s, color }) {
  const d = s * 0.72;
  return <View style={{ width:d, height:d, backgroundColor:color, transform:[{rotate:'45deg'}] }} />;
}
function Pentagon({ size: s, color }) {
  return (
    <View style={{ alignItems:'center' }}>
      <View style={{ width:0, height:0, borderLeftWidth:s*0.56, borderRightWidth:s*0.56, borderBottomWidth:s*0.42, borderLeftColor:'transparent', borderRightColor:'transparent', borderBottomColor:color }} />
      <View style={{ width:s*1.12, height:s*0.52, backgroundColor:color, borderBottomLeftRadius:5, borderBottomRightRadius:5 }} />
    </View>
  );
}
function Heart({ size: s, color }) {
  const r = s * 0.28;
  return (
    <View style={{ width:s, height:s, alignItems:'center', justifyContent:'center' }}>
      <View style={{ position:'absolute', top:s*0.08, left:s*0.5-r*2+2, width:r*2, height:r*2, borderRadius:r, backgroundColor:color }} />
      <View style={{ position:'absolute', top:s*0.08, right:s*0.5-r*2+2, width:r*2, height:r*2, borderRadius:r, backgroundColor:color }} />
      <View style={{ position:'absolute', top:s*0.2, width:0, height:0, borderLeftWidth:s*0.5, borderRightWidth:s*0.5, borderTopWidth:s*0.65, borderLeftColor:'transparent', borderRightColor:'transparent', borderTopColor:color }} />
    </View>
  );
}
function LShape({ size: s, color, rotate }) {
  const th = Math.round(s * 0.35);
  return (
    <View style={{ transform:[{rotate:`${rotate}deg`}], width:s, height:s, justifyContent:'flex-start', alignItems:'flex-start' }}>
      <View style={{ width:s, height:th, backgroundColor:color, borderTopLeftRadius:6, borderTopRightRadius:6 }} />
      <View style={{ width:th, height:s-th, backgroundColor:color, borderBottomLeftRadius:6 }} />
    </View>
  );
}

// ─── AD HELPER ───────────────────────────────────────────
let interstitialAd = null;
let adLoaded = false;

function loadAd() {
  try {
    interstitialAd = InterstitialAd.createForAdRequest(AD_UNIT_ID);
    interstitialAd.addAdEventListener(AdEventType.LOADED, () => { adLoaded = true; });
    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => { adLoaded = false; loadAd(); });
    interstitialAd.load();
  } catch (e) { console.log('Ad load error:', e); }
}

function showAd(onDone) {
  try {
    if (adLoaded && interstitialAd) {
      interstitialAd.addAdEventListener(AdEventType.CLOSED, () => onDone && onDone());
      interstitialAd.show();
    } else {
      onDone && onDone();
    }
  } catch (e) { onDone && onDone(); }
}

// ─── APP ─────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('menu');
  const [mode, setMode] = useState('grid');
  const [finalScore, setFinalScore] = useState(0);
  const [bests, setBests] = useState({ grid:0, number:0, color:0, grid4:0, shapes:0, lshapes:0 });
  const [isPremium, setIsPremium] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [loading, setLoading] = useState(false);
  const levelsPlayedRef = useRef(0);

  // Init RevenueCat + AdMob
  useEffect(() => {
    // Load bests
    AsyncStorage.getItem('@memory_bests').then(val => {
      if (val) setBests(JSON.parse(val));
    });

    // Init RevenueCat
    try {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      Purchases.configure({ apiKey: REVENUECAT_KEY });
      checkPremium();
    } catch (e) { console.log('RC init error:', e); }

    // Load first ad
    loadAd();
  }, []);

  const checkPremium = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPremium(hasPremium);
    } catch (e) { console.log('RC check error:', e); }
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current?.availablePackages?.length > 0) {
        const pkg = offerings.current.availablePackages[0];
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
          setIsPremium(true);
          setShowSub(false);
        }
      }
    } catch (e) {
      if (!e.userCancelled) console.log('Purchase error:', e);
    }
    setLoading(false);
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        setIsPremium(true);
        setShowSub(false);
      }
    } catch (e) { console.log('Restore error:', e); }
    setLoading(false);
  };

  const saveBest = async (m, sc) => {
    setBests(prev => {
      if (sc > (prev[m] || 0)) {
        const u = { ...prev, [m]: sc };
        AsyncStorage.setItem('@memory_bests', JSON.stringify(u));
        return u;
      }
      return prev;
    });
  };

  const selectMode = (m) => {
    const isPremiumMode = PREMIUM_MODES.some(p => p.id === m);
    if (isPremiumMode && !isPremium) { setShowSub(true); return; }
    setMode(m);
    setScreen('game');
  };

  const handleLevelEnd = (sc, lvl) => {
    saveBest(mode, sc);
    setFinalScore(sc);
    levelsPlayedRef.current++;

    // Show ad every 2 levels if not premium
    if (!isPremium && levelsPlayedRef.current % 2 === 0) {
      showAd(() => setScreen('result'));
    } else {
      setScreen('result');
    }
  };

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {screen === 'menu' && (
        <MenuScreen bests={bests} isPremium={isPremium}
          onSelect={selectMode}
          onSub={() => setShowSub(true)}
        />
      )}
      {screen === 'game' && (
        <GameScreen key={`${mode}-${Date.now()}`} mode={mode} best={bests[mode]||0}
          isPremium={isPremium}
          onEnd={handleLevelEnd}
          onBack={() => setScreen('menu')}
        />
      )}
      {screen === 'result' && (
        <ResultScreen score={finalScore} best={bests[mode]||0} mode={mode}
          onReplay={() => setScreen('game')}
          onMenu={() => setScreen('menu')}
        />
      )}

      {/* SUBSCRIPTION MODAL */}
      <Modal visible={showSub} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={st.subBox}>
            <TouchableOpacity style={st.subClose} onPress={() => setShowSub(false)}>
              <Text style={st.subCloseTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={{ fontSize:48 }}>👑</Text>
            <Text style={st.subTitle}>MemoryPulse Pro</Text>
            <Text style={st.subPrice}>€2.99 / month</Text>
            <View style={st.subPerks}>
              {['No ads ever','Unlock 4×4 Grid','Unlock Shapes mode','Unlock L-Shapes mode'].map((p,i) => (
                <View key={i} style={st.subPerkRow}>
                  <Text style={st.subPerkCheck}>✓</Text>
                  <Text style={st.subPerkTxt}>{p}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={[st.subBtn, loading && { opacity:0.6 }]} onPress={handlePurchase} disabled={loading}>
              <Text style={st.subBtnTxt}>{loading ? 'Loading...' : 'Subscribe Now'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRestore} style={{ paddingVertical:8 }}>
              <Text style={{ fontSize:13, color:C.muted, textDecorationLine:'underline' }}>Restore purchases</Text>
            </TouchableOpacity>
            <Text style={st.subFine}>Cancel anytime. Auto-renews monthly.</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── MENU ────────────────────────────────────────────────
function MenuScreen({ bests, isPremium, onSelect, onSub }) {
  return (
    <ScrollView contentContainerStyle={st.menuScroll}>
      <Text style={st.mainTitle}>🧠 MemoryPulse</Text>
      <Text style={st.mainSub}>Train your memory</Text>

      <Text style={st.sectionLabel}>FREE MODES</Text>
      {FREE_MODES.map(m => (
        <TouchableOpacity key={m.id} style={st.modeCard} onPress={() => onSelect(m.id)} activeOpacity={0.8}>
          <Text style={st.modeEmoji}>{m.emoji}</Text>
          <View style={{ flex:1 }}>
            <Text style={st.modeLabel}>{m.label}</Text>
            <Text style={st.modeDesc}>{m.desc}</Text>
          </View>
          <View style={st.bestBadge}><Text style={st.bestBadgeTxt}>🏆 {bests[m.id]||0}</Text></View>
        </TouchableOpacity>
      ))}

      <View style={st.premiumHeader}>
        <Text style={st.sectionLabel}>👑 PREMIUM MODES</Text>
        {!isPremium && (
          <TouchableOpacity style={st.subMiniBtn} onPress={onSub}>
            <Text style={st.subMiniBtnTxt}>€2.99/mo</Text>
          </TouchableOpacity>
        )}
      </View>

      {PREMIUM_MODES.map(m => (
        <TouchableOpacity key={m.id} style={[st.modeCard, st.modeCardPremium]} onPress={() => onSelect(m.id)} activeOpacity={0.8}>
          {m.id === 'lshapes'
            ? <View style={{ width:28, height:28, justifyContent:'center', alignItems:'center' }}><LShape size={24} color={C.gold} rotate={0} /></View>
            : <Text style={st.modeEmoji}>{m.emoji}</Text>
          }
          <View style={{ flex:1 }}>
            <Text style={[st.modeLabel, { color:C.gold }]}>{m.label}</Text>
            <Text style={st.modeDesc}>{m.desc}</Text>
          </View>
          {isPremium
            ? <View style={st.bestBadge}><Text style={st.bestBadgeTxt}>🏆 {bests[m.id]||0}</Text></View>
            : <Text style={{ fontSize:18 }}>🔒</Text>
          }
        </TouchableOpacity>
      ))}

      {isPremium && (
        <View style={st.premiumBadge}><Text style={st.premiumBadgeTxt}>👑 Pro Member</Text></View>
      )}
    </ScrollView>
  );
}

// ─── GAME SCREEN ─────────────────────────────────────────
function GameScreen({ mode, best, isPremium, onEnd, onBack }) {
  const [phase, setPhase] = useState('showing');
  const [sequence, setSequence] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [userInput, setUserInput] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [level, setLevel] = useState(1);

  const phaseRef = useRef('showing');
  const seqRef = useRef([]);
  const levelRef = useRef(1);

  const SHOW_DURATION = Math.max(350, 850 - level * 25);
  const PAUSE = 280;

  const randomItem = () => {
    if (mode === 'grid')    return Math.floor(Math.random() * 9);
    if (mode === 'grid4')   return Math.floor(Math.random() * 16);
    if (mode === 'number')  return Math.floor(Math.random() * 9) + 1;
    if (mode === 'color')   return Math.floor(Math.random() * GAME_COLORS.length);
    if (mode === 'shapes')  return Math.floor(Math.random() * SHAPES.length);
    if (mode === 'lshapes') return Math.floor(Math.random() * LSHAPES.length);
  };

  const startRound = useCallback((seq) => {
    setPhase('showing'); phaseRef.current = 'showing';
    setUserInput([]); setFeedback(null); setActiveItem(null);
    seqRef.current = seq;
    let i = 0;
    const show = () => {
      if (i >= seq.length) {
        setActiveItem(null);
        setTimeout(() => { setPhase('input'); phaseRef.current = 'input'; }, PAUSE);
        return;
      }
      setActiveItem(seq[i]);
      setTimeout(() => { setActiveItem(null); setTimeout(() => { i++; show(); }, PAUSE); }, SHOW_DURATION);
    };
    setTimeout(show, 700);
  }, [level]);

  useEffect(() => {
    const f = [randomItem()];
    setSequence(f);
    startRound(f);
  }, []);

  const handleInput = (item) => {
    if (phaseRef.current !== 'input') return;
    const ni = [...userInput, item];
    setUserInput(ni);
    const idx = ni.length - 1;
    if (item !== seqRef.current[idx]) {
      setPhase('feedback'); phaseRef.current = 'feedback';
      setFeedback('wrong'); setActiveItem(item);
      setTimeout(() => onEnd(levelRef.current - 1, levelRef.current - 1), 1200);
      return;
    }
    setActiveItem(item);
    setTimeout(() => setActiveItem(null), 280);
    if (ni.length === seqRef.current.length) {
      setPhase('feedback'); phaseRef.current = 'feedback';
      setFeedback('correct');
      setTimeout(() => {
        const ns = [...seqRef.current, randomItem()];
        setSequence(ns);
        const nl = level + 1;
        setLevel(nl); levelRef.current = nl;
        startRound(ns);
      }, 650);
    }
  };

  const isInput = phase === 'input';
  const indColor = feedback === 'wrong' ? C.watching : feedback === 'correct' ? C.green : isInput ? C.inputting : C.watching;
  const indLabel = feedback === 'wrong' ? '✗ Wrong!' : feedback === 'correct' ? '✓ Perfect!' : isInput ? '👆 YOUR TURN' : '👀 WATCH';

  return (
    <SafeAreaView style={[st.gameBg, { flex:1 }]}>
      <View style={st.gameHeader}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
          <Text style={st.backBtn}>← Back</Text>
        </TouchableOpacity>
        <View style={{ alignItems:'center' }}>
          <Text style={st.levelTxt}>Level {level}</Text>
          <Text style={st.seqLen}>{sequence.length} step{sequence.length!==1?'s':''}</Text>
        </View>
        <View style={st.bestMini}><Text style={st.bestMiniTxt}>🏆 {best}</Text></View>
      </View>

      <View style={[st.indicator, { backgroundColor:indColor }]}>
        <Text style={st.indicatorTxt}>{indLabel}</Text>
        {isInput && <Text style={st.indicatorSub}>{userInput.length} / {sequence.length}</Text>}
      </View>

      <View style={st.gameArea}>
        {(mode==='grid'||mode==='grid4') && <GridBoard size={mode==='grid4'?4:3} active={activeItem} onPress={handleInput} disabled={!isInput} feedback={feedback} />}
        {mode==='number'  && <NumberBoard active={activeItem} onPress={handleInput} disabled={!isInput} />}
        {mode==='color'   && <ColorBoard  active={activeItem} onPress={handleInput} disabled={!isInput} />}
        {mode==='shapes'  && <ShapesBoard active={activeItem} onPress={handleInput} disabled={!isInput} feedback={feedback} />}
        {mode==='lshapes' && <LShapesBoard active={activeItem} onPress={handleInput} disabled={!isInput} feedback={feedback} />}
      </View>

      <View style={st.seqDots}>
        {sequence.map((_, i) => (
          <View key={i} style={[st.dot,
            i < userInput.length && { backgroundColor:C.inputting },
            i === userInput.length && isInput && { backgroundColor:C.blue, transform:[{scale:1.4}] },
          ]} />
        ))}
      </View>
    </SafeAreaView>
  );
}

// ─── BOARDS ──────────────────────────────────────────────
function GridBoard({ size, active, onPress, disabled, feedback }) {
  const cellSize = Math.floor((SW - (size===4?48:64)) / size);
  return (
    <View style={{ flexDirection:'row', flexWrap:'wrap', width:cellSize*size+(size-1)*8, gap:8 }}>
      {Array.from({ length:size*size }, (_,i) => {
        const isActive = active === i;
        return (
          <TouchableOpacity key={i} onPress={()=>!disabled&&onPress(i)} activeOpacity={disabled?1:0.65}
            style={[st.gridCell, { width:cellSize, height:cellSize,
              backgroundColor: isActive?(feedback==='wrong'?C.watching:C.yellow):C.card,
              borderColor: isActive?(feedback==='wrong'?C.watching:C.yellow):'#2E2C40',
              transform:[{scale:isActive?1.06:1}],
            }]}
          />
        );
      })}
    </View>
  );
}

function NumberBoard({ active, onPress, disabled }) {
  const size = Math.floor((SW-80)/3);
  return (
    <View style={{ alignItems:'center' }}>
      <View style={[st.displayBox, active!==null && { borderColor:C.yellow, backgroundColor:'#2A2518' }]}>
        <Text style={[st.displayNum, active===null && { opacity:0 }]}>{active!==null?active:'0'}</Text>
      </View>
      <View style={{ flexDirection:'row', flexWrap:'wrap', width:size*3+16, gap:8, marginTop:18 }}>
        {Array.from({length:9},(_,i)=>i+1).map(n=>(
          <TouchableOpacity key={n} onPress={()=>!disabled&&onPress(n)} activeOpacity={disabled?1:0.65}
            style={[st.numCell,{width:size,height:size}]}>
            <Text style={st.numTxt}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ColorBoard({ active, onPress, disabled }) {
  const size = Math.floor((SW-80)/3);
  return (
    <View style={{ alignItems:'center' }}>
      <View style={[st.displayBox, active!==null && { backgroundColor:GAME_COLORS[active].hex, borderColor:GAME_COLORS[active].hex }]}>
        <Text style={[st.displayColorName, { color:active!==null?'#fff':C.muted }]}>
          {active!==null?GAME_COLORS[active].name:'?'}
        </Text>
      </View>
      <View style={{ flexDirection:'row', flexWrap:'wrap', width:size*3+16, gap:8, marginTop:18 }}>
        {GAME_COLORS.map((col,i)=>(
          <TouchableOpacity key={i} onPress={()=>!disabled&&onPress(i)} activeOpacity={disabled?1:0.65}
            style={[st.colorCell,{width:size,height:size,backgroundColor:col.hex}]}>
            <Text style={st.colorCellTxt}>{col.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ShapesBoard({ active, onPress, disabled }) {
  const btnSize = Math.floor((SW-80)/3);
  const shapeSize = Math.floor(btnSize*0.5);
  return (
    <View style={{ alignItems:'center', gap:16 }}>
      <View style={[st.displayBox, { height:100 }, active!==null && { borderColor:C.purple }]}>
        {active !== null
          ? <View style={{ alignItems:'center', justifyContent:'center', flex:1 }}>{SHAPES[active].draw(50, C.purple)}</View>
          : <Text style={{ color:C.muted, fontSize:22 }}>?</Text>
        }
      </View>
      <View style={{ flexDirection:'row', flexWrap:'wrap', width:btnSize*3+16, gap:8 }}>
        {SHAPES.map((sh,i) => (
          <TouchableOpacity key={i} onPress={()=>!disabled&&onPress(i)} activeOpacity={disabled?1:0.65}
            style={[st.shapeCell, { width:btnSize, height:btnSize, backgroundColor:C.card, borderColor:'#2E2C40' }]}>
            <View style={{ alignItems:'center', justifyContent:'center', flex:1 }}>
              {sh.draw(shapeSize, C.muted)}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function LShapesBoard({ active, onPress, disabled }) {
  const btnSize = Math.floor((SW-80)/4-6);
  const shapeSize = Math.floor(btnSize*0.52);
  return (
    <View style={{ alignItems:'center', gap:16 }}>
      <View style={[st.displayBox, { height:100 }, active!==null && { borderColor:C.blue }]}>
        {active !== null
          ? <View style={{ alignItems:'center', justifyContent:'center', flex:1 }}><LShape size={50} color={C.blue} rotate={LSHAPES[active].rotate} /></View>
          : <Text style={{ color:C.muted, fontSize:22 }}>?</Text>
        }
      </View>
      <View style={{ flexDirection:'row', flexWrap:'wrap', width:(btnSize+8)*4, gap:8 }}>
        {LSHAPES.map((ls,i) => (
          <TouchableOpacity key={i} onPress={()=>!disabled&&onPress(i)} activeOpacity={disabled?1:0.65}
            style={[st.shapeCell, { width:btnSize, height:btnSize, backgroundColor:C.card, borderColor:'#2E2C40' }]}>
            <View style={{ alignItems:'center', justifyContent:'center', flex:1 }}>
              <LShape size={shapeSize} color={C.muted} rotate={ls.rotate} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── RESULT ──────────────────────────────────────────────
function ResultScreen({ score, best, mode, onReplay, onMenu }) {
  const allModes = [...FREE_MODES, ...PREMIUM_MODES];
  const m = allModes.find(x => x.id === mode);
  const isNewBest = score >= best && score > 0;
  const bounce = useRef(new Animated.Value(0.85)).current;
  useEffect(() => { Animated.spring(bounce, { toValue:1, friction:4, useNativeDriver:true }).start(); }, []);
  const msg = score===0?"Don't give up!":score<3?"Good start!":score<6?"Nice memory!":score<10?"Impressive!":"Memory master! 🏆";

  return (
    <View style={st.center}>
      <Animated.View style={[st.resultCard, { transform:[{scale:bounce}] }]}>
        <Text style={{ fontSize:52 }}>🧠</Text>
        <Text style={st.resultTitle}>Game Over</Text>
        <Text style={st.resultMode}>{m?.emoji || '⌐'} {m?.label}</Text>
        {isNewBest && <View style={st.newBestBadge}><Text style={st.newBestTxt}>🏆 NEW BEST!</Text></View>}
        <View style={st.resultScoreBox}>
          <Text style={[st.resultScoreNum, { color:isNewBest?C.yellow:C.accent }]}>{score}</Text>
          <Text style={st.resultScoreLbl}>levels completed</Text>
        </View>
        <Text style={{ fontSize:14, color:C.muted }}>Best: {best}</Text>
        <Text style={st.resultMsg}>{msg}</Text>
      </Animated.View>
      <TouchableOpacity style={st.startBtn} onPress={onReplay}><Text style={st.startBtnTxt}>🔄 Try Again</Text></TouchableOpacity>
      <TouchableOpacity style={[st.startBtn, { backgroundColor:C.surface }]} onPress={onMenu}>
        <Text style={[st.startBtnTxt, { color:C.muted }]}>← Change Mode</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────
const st = StyleSheet.create({
  safe: { flex:1, backgroundColor:C.bg },
  center: { flex:1, alignItems:'center', justifyContent:'center', gap:12, backgroundColor:C.bg, paddingHorizontal:16 },
  menuScroll: { alignItems:'center', paddingVertical:32, paddingHorizontal:20, gap:10 },
  mainTitle: { fontSize:34, fontWeight:'800', color:C.white },
  mainSub: { fontSize:14, color:C.muted },
  sectionLabel: { fontSize:11, fontWeight:'700', color:C.muted, letterSpacing:1.5, alignSelf:'flex-start', marginTop:8 },
  premiumHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', width:'100%', marginTop:8 },
  subMiniBtn: { backgroundColor:C.purple+'33', paddingHorizontal:12, paddingVertical:4, borderRadius:12, borderWidth:1, borderColor:C.purple },
  subMiniBtnTxt: { fontSize:12, fontWeight:'700', color:C.purple },
  modeCard: { flexDirection:'row', alignItems:'center', backgroundColor:C.surface, borderRadius:16, padding:14, gap:12, borderWidth:1.5, borderColor:'#2E2C40', width:'100%' },
  modeCardPremium: { borderColor:C.gold+'55', backgroundColor:'#1E1A10' },
  modeEmoji: { fontSize:24 },
  modeLabel: { fontSize:15, fontWeight:'700', color:C.white },
  modeDesc: { fontSize:11, color:C.muted, marginTop:2 },
  bestBadge: { backgroundColor:'#2A2518', paddingHorizontal:10, paddingVertical:4, borderRadius:12 },
  bestBadgeTxt: { fontSize:13, fontWeight:'700', color:C.yellow },
  premiumBadge: { backgroundColor:C.purple+'22', paddingHorizontal:20, paddingVertical:8, borderRadius:20, borderWidth:1, borderColor:C.purple, marginTop:8 },
  premiumBadgeTxt: { fontSize:14, fontWeight:'700', color:C.purple },
  startBtn: { backgroundColor:C.accent, paddingHorizontal:40, paddingVertical:15, borderRadius:30 },
  startBtnTxt: { fontSize:18, fontWeight:'800', color:'#fff' },
  gameBg: { backgroundColor:C.bg },
  gameHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingTop:23, paddingBottom:4 },
  backBtn: { fontSize:14, color:C.muted, fontWeight:'600' },
  levelTxt: { fontSize:20, fontWeight:'800', color:C.white },
  seqLen: { fontSize:11, color:C.muted },
  bestMini: { backgroundColor:'#2A2518', paddingHorizontal:10, paddingVertical:4, borderRadius:10 },
  bestMiniTxt: { fontSize:13, fontWeight:'700', color:C.yellow },
  indicator: { marginHorizontal:20, borderRadius:18, paddingVertical:14, paddingHorizontal:20, alignItems:'center', marginBottom:8, gap:2 },
  indicatorTxt: { fontSize:22, fontWeight:'800', color:'#fff', letterSpacing:1 },
  indicatorSub: { fontSize:14, color:'rgba(255,255,255,0.8)', fontWeight:'600' },
  gameArea: { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:16 },
  gridCell: { borderRadius:14, borderWidth:2 },
  displayBox: { width:SW-80, height:90, backgroundColor:C.surface, borderRadius:18, alignItems:'center', justifyContent:'center', borderWidth:2, borderColor:'#2E2C40' },
  displayNum: { fontSize:60, fontWeight:'800', color:C.white },
  displayColorName: { fontSize:26, fontWeight:'800' },
  numCell: { borderRadius:12, backgroundColor:C.card, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#2E2C40' },
  numTxt: { fontSize:26, fontWeight:'700', color:C.white },
  colorCell: { borderRadius:12, alignItems:'center', justifyContent:'center' },
  colorCellTxt: { fontSize:11, fontWeight:'700', color:'#fff' },
  shapeCell: { borderRadius:12, borderWidth:2, alignItems:'center', justifyContent:'center', padding:4 },
  seqDots: { flexDirection:'row', flexWrap:'wrap', justifyContent:'center', paddingHorizontal:20, paddingBottom:14, gap:6, minHeight:28 },
  dot: { width:10, height:10, borderRadius:5, backgroundColor:'#333' },
  resultCard: { backgroundColor:C.surface, borderRadius:24, padding:28, alignItems:'center', gap:8, width:'100%', borderWidth:1, borderColor:'#2E2C40' },
  resultTitle: { fontSize:26, fontWeight:'800', color:C.white },
  resultMode: { fontSize:15, color:C.muted },
  newBestBadge: { backgroundColor:'#2A2518', paddingHorizontal:20, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor:C.yellow },
  newBestTxt: { fontSize:14, fontWeight:'800', color:C.yellow },
  resultScoreBox: { backgroundColor:C.bg, borderRadius:16, paddingHorizontal:32, paddingVertical:10, alignItems:'center' },
  resultScoreNum: { fontSize:52, fontWeight:'800' },
  resultScoreLbl: { fontSize:12, color:C.muted },
  resultMsg: { fontSize:15, color:C.yellow, fontWeight:'600' },
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.85)', alignItems:'center', justifyContent:'center', padding:20 },
  subBox: { backgroundColor:C.surface, borderRadius:28, padding:28, width:'100%', alignItems:'center', gap:12, borderWidth:1, borderColor:C.purple+'66' },
  subClose: { position:'absolute', top:16, right:20 },
  subCloseTxt: { fontSize:18, color:C.muted },
  subTitle: { fontSize:26, fontWeight:'800', color:C.white },
  subPrice: { fontSize:18, color:C.gold, fontWeight:'700' },
  subPerks: { width:'100%', gap:8, marginVertical:4 },
  subPerkRow: { flexDirection:'row', alignItems:'center', gap:10 },
  subPerkCheck: { fontSize:16, color:C.green, fontWeight:'700' },
  subPerkTxt: { fontSize:15, color:C.white },
  subBtn: { backgroundColor:C.purple, paddingHorizontal:40, paddingVertical:15, borderRadius:30, width:'100%', alignItems:'center' },
  subBtnTxt: { fontSize:18, fontWeight:'800', color:'#fff' },
  subFine: { fontSize:11, color:C.muted, textAlign:'center' },
});
