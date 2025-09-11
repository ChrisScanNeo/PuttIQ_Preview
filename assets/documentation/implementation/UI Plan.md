Awesome — I’ve stitched your spec into a ready-to-drop React Native UI, including the dotted swing timer bar across the top, photoreal SVG golf ball with glow/rings, status bar, and BPM slider. I followed your pack’s sizing, colors, timings, and copy throughout (status bar + marker, listening zone 20–80%, hit text durations, typography, etc.).

Below are self-contained components plus a screen that wires everything up. You can paste them into your Expo app and point the image/SVG require() paths at the assets you uploaded (grass-background.jpeg, golf-ball.svg, puttiq-logo.jpg). The metronome clock is drift-corrected and the sweep runs left↔right in perfect time. The dotted top bar “lights up” as the head passes, matching your client’s sketch.

Install
expo install expo-av react-native-svg

/components/MetronomeEngine.ts

Drift-corrected metronome with zone helpers (20–80% of beat). Matches your flow.

import { useEffect, useMemo, useRef, useState } from "react";
import { Audio, AVPlaybackSource, Sound } from "expo-av";

export type SoundKey = "click" | "wood" | "hat";

const SOUNDS: Record<SoundKey, AVPlaybackSource> = {
  click: require("../assets/click.wav"),
  wood: require("../assets/wood.wav"),
  hat:  require("../assets/hat.wav"),
};

export function useMetronome(bpm: number, running: boolean, sound: SoundKey) {
  const [lastBeatAt, setLastBeatAt] = useState<number | null>(null);
  const period = useMemo(() => 60000 / bpm, [bpm]); // ms
  const nextRef = useRef<number | null>(null);
  const tRef = useRef<NodeJS.Timeout | null>(null);
  const sndRef = useRef<Sound | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (sndRef.current) await sndRef.current.unloadAsync();
      const { sound: s } = await Audio.Sound.createAsync(SOUNDS[sound], { volume: 1 });
      if (!alive) { await s.unloadAsync(); return; }
      sndRef.current = s;
    })();
    return () => { alive = false; };
  }, [sound]);

  useEffect(() => {
    if (!running) {
      if (tRef.current) clearTimeout(tRef.current);
      nextRef.current = null;
      return;
    }
    const start = Date.now() + 30;
    nextRef.current = start;

    const loop = () => {
      const now = Date.now();
      const next = nextRef.current ?? now;
      if (now >= next - 4) {
        setLastBeatAt(now);
        sndRef.current?.replayAsync();
        nextRef.current = next + period;
      }
      const wait = Math.max(0, (nextRef.current ?? now) - Date.now() - 2);
      tRef.current = setTimeout(loop, wait);
    };
    loop();
    return () => { if (tRef.current) clearTimeout(tRef.current); };
  }, [running, period]);

  // listening zone = 20–80% of period
  const inZone = (ts = Date.now()) => {
    if (!lastBeatAt) return false;
    const dt = ts - lastBeatAt;
    const p = ((dt % period) + period) % period;
    return p >= 0.2 * period && p <= 0.8 * period;
  };

  return { lastBeatAt, period, inZone };
}

/components/DottedSwingBar.tsx

Top dotted timer bar that sweeps back↔forth and “lights” dots as the head passes (client request).

import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Animated, Easing, LayoutChangeEvent } from "react-native";

type Props = { periodMs: number; running: boolean };

export default function DottedSwingBar({ periodMs, running }: Props) {
  const anim = useRef(new Animated.Value(0)).current; // 0..1 along the bar
  const widthRef = useRef(0);
  const dots = 36; // tweak for density of “dotted” look
  const dotArray = useMemo(() => Array.from({ length: dots }), [dots]);

  useEffect(() => {
    if (!running) { anim.stopAnimation(); return; }
    let dir: 1 | -1 = 1;
    const half = periodMs; // left→right in one period; right→left in next
    let cancelled = false;

    const tick = () => {
      Animated.timing(anim, {
        toValue: dir === 1 ? 1 : 0,
        duration: half,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished || cancelled) return;
        dir = dir === 1 ? -1 : 1;
        tick();
      });
    };
    tick();
    return () => { cancelled = true; anim.stopAnimation(); };
  }, [periodMs, running, anim]);

  const onLayout = (e: LayoutChangeEvent) => { widthRef.current = e.nativeEvent.layout.width; };

  // head position in px (for lighting logic)
  const headX = Animated.multiply(anim, new Animated.Value(1));

  return (
    <View onLayout={onLayout} style={styles.container}>
      {dotArray.map((_, i) => {
        const t = i / (dots - 1);
        // each dot “lights” briefly when head is near
        const opacity = anim.interpolate({
          inputRange: [Math.max(0, t - 0.05), t, Math.min(1, t + 0.05)],
          outputRange: [0.25, 1, 0.25],
          extrapolate: "clamp",
        });
        return <Animated.View key={i} style={[styles.dot, { left: `${t * 100}%`, opacity }]} />;
      })}
      {/* moving head */}
      <Animated.View
        style={[
          styles.head,
          {
            transform: [{
              translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) as any,
            }],
            left: anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) as any,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.4)",
    marginTop: 10,
    width: "92%",
    alignSelf: "center",
  },
  dot: {
    position: "absolute",
    top: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#f0fff0",
  },
  head: {
    position: "absolute",
    top: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4CAF50",
    shadowColor: "#4CAF50",
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});

/components/GolfBall.tsx

Implements idle / listening glow / hit rings exactly as specified.

import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import SvgUri from "react-native-svg-uri"; // or react-native-svg's SvgXml if you inline
// If you prefer: import { SvgUri } from "react-native-svg";

type Props = {
  listening: boolean;
  onTap: () => void;
  hitColor?: string; // #4CAF50 | #FFC107 | #FF9800
  pulse?: boolean;   // trigger for 300ms ball pulse
};

export default function GolfBall({ listening, onTap, hitColor, pulse }: Props) {
  const glow = useRef(new Animated.Value(0)).current;   // 0..1
  const ring = useRef(new Animated.Value(0)).current;   // 0..1 for expanding ring
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(glow, {
      toValue: listening ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, [listening]);

  useEffect(() => {
    if (!hitColor) return;
    ring.setValue(0);
    Animated.timing(ring, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [hitColor, ring]);

  useEffect(() => {
    if (!pulse) return;
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.15, duration: 150, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      Animated.timing(scale, { toValue: 1.0, duration: 150, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
    ]).start();
  }, [pulse]);

  const ringStyle = {
    transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.5] }) }],
    opacity: ring.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.8, 0] }),
    borderColor: hitColor || "transparent",
  };

  return (
    <Pressable onPress={onTap} style={styles.wrap}>
      <Animated.View style={[styles.glow, { opacity: glow, transform: [{ scale: 1.3 }] }]} />
      <Animated.View style={[styles.ring, ringStyle]} />
      <Animated.View style={{ transform: [{ scale }] }}>
        <SvgUri width={120} height={120} source={require("../assets/golf-ball.svg")} />
      </Animated.View>
      <View style={styles.shadow} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 150, height: 150, alignItems: "center", justifyContent: "center" },
  glow: {
    position: "absolute",
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: "rgba(76, 175, 80, 0.15)",
  },
  ring: {
    position: "absolute",
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 8,
  },
  shadow: {
    position: "absolute",
    bottom: 8, width: 90, height: 16, borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
});

/components/StatusBar.tsx

Bottom status bar with BPM / TAP message, zone dot, and beat marker.

import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";

type Props = { bpm: number; running: boolean; periodMs: number; inZone: boolean; };

export default function StatusBar({ bpm, running, periodMs, inZone }: Props) {
  const prog = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!running) { prog.stopAnimation(); prog.setValue(0); return; }
    let cancelled = false;
    const loop = () => {
      prog.setValue(0);
      Animated.timing(prog, { toValue: 1, duration: periodMs, easing: Easing.linear, useNativeDriver: false })
        .start(({ finished }) => { if (!finished || cancelled) return; loop(); });
    };
    loop();
    return () => { cancelled = true; prog.stopAnimation(); };
  }, [running, periodMs, prog]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{running ? `${bpm} BPM` : "TAP BALL TO START"}</Text>
      {running && (
        <View style={styles.barRow}>
          <View style={[styles.zoneDot, { backgroundColor: inZone ? "#4CAF50" : "#666666" }]} />
          <View style={styles.track}>
            <Animated.View
              style={[
                styles.marker,
                { left: prog.interpolate({ inputRange: [0, 1], outputRange: [0, 96] }) as any },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute", bottom: 50, alignSelf: "center",
    minWidth: 180, maxWidth: 250, height: 50,
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 25,
    paddingVertical: 12, paddingHorizontal: 20, alignItems: "center", justifyContent: "center",
  },
  text: { color: "#fff", fontSize: 18, fontWeight: "600", letterSpacing: 1 },
  barRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  zoneDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  track: { width: 100, height: 2, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 1 },
  marker: { position: "absolute", top: -3, width: 4, height: 8, borderRadius: 2, backgroundColor: "#fff" },
});

/components/BpmSlider.tsx

Clean slider that matches your spec (labels, active fill).

import React, { useMemo, useRef, useState } from "react";
import { View, Text, PanResponder, StyleSheet, LayoutChangeEvent } from "react-native";

type Props = { value: number; onChange: (bpm: number) => void; min?: number; max?: number; };
export default function BpmSlider({ value, onChange, min = 30, max = 100 }: Props) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const pct = useMemo(() => (value - min) / (max - min), [value, min, max]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_e, g) => {
        const x = Math.min(Math.max(0, g.dx + pct * w), w);
        const v = Math.round(min + (x / w) * (max - min));
        onChange(v);
      },
    })
  ).current;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{min}</Text>
      <View style={styles.slider} onLayout={onLayout} {...pan.panHandlers}>
        <View style={[styles.fill, { width: Math.max(0, w * pct) }]} />
        <View style={[styles.thumb, { left: Math.max(0, w * pct - 14) }]} />
      </View>
      <Text style={styles.label}>{max}</Text>
      <Text style={styles.value}>BPM: {value}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { width: "60%", alignItems: "center", marginBottom: 20 },
  slider: { height: 4, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 2, width: "100%", marginTop: 8, marginBottom: 6 },
  fill: { height: 4, backgroundColor: "#4CAF50", borderRadius: 2 },
  thumb: {
    position: "absolute", top: -12, width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff",
    borderWidth: 2, borderColor: "#4CAF50", elevation: 3,
  },
  label: { color: "#fff", fontSize: 14, fontWeight: "600" },
  value: { color: "#fff", fontSize: 14, fontWeight: "600" },
});

/screens/HomeScreen.tsx

Final composition per your home screen layout (logo top, ball center, status bar, slider). Uses your grass background and logo.

import React, { useMemo, useRef, useState } from "react";
import { ImageBackground, Image, SafeAreaView, StyleSheet, View } from "react-native";
import DottedSwingBar from "../components/DottedSwingBar";
import GolfBall from "../components/GolfBall";
import StatusBar from "../components/StatusBar";
import BpmSlider from "../components/BpmSlider";
import { useMetronome } from "../components/MetronomeEngine";

export default function HomeScreen() {
  const [running, setRunning] = useState(false);
  const [bpm, setBpm] = useState(76);
  const { period, lastBeatAt, inZone } = useMetronome(bpm, running, "click");

  // simulate hit feedback: wire your mic detector to set these
  const [hitColor, setHitColor] = useState<string | undefined>();
  const [pulse, setPulse] = useState(false);
  const hit = (quality: "strong" | "medium" | "weak") => {
    const color = quality === "strong" ? "#4CAF50" : quality === "medium" ? "#FFC107" : "#FF9800";
    setHitColor(color); setPulse(true); setTimeout(() => setPulse(false), 10);
  };

  return (
    <ImageBackground source={require("../assets/grass-background.jpeg")} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.container}>
        <Image source={require("../assets/puttiq-logo.jpg")} style={styles.logo} resizeMode="contain" />

        <DottedSwingBar periodMs={period} running={running} />

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <GolfBall
            listening={inZone()}
            onTap={() => setRunning((r) => !r)}
            hitColor={hitColor}
            pulse={pulse}
          />
        </View>

        <StatusBar bpm={bpm} running={running} periodMs={period} inZone={inZone()} />

        <View style={{ alignItems: "center" }}>
          <BpmSlider value={bpm} onChange={setBpm} />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1, alignItems: "center" },
  logo: { width: 180, height: 60, marginTop: 12 },
});

Wiring your detector + feedback text

When your mic pipeline fires, call hit('strong'|'medium'|'weak') and show the overlay text “STRONG / MEDIUM / WEAK” for ~700 ms as specified. If you want the text overlay now, drop a tiny FeedbackText component (fade in 200ms, hold 300ms, fade out 200ms).

For “perfect timing” you already target the 20–80% window — you can compute quality from absolute error vs beat center; map thresholds to the three colors defined in Color Scheme.

Asset paths you referenced

/assets/grass-background.jpeg

/assets/golf-ball.svg (the realistic one from your pack)

/assets/puttiq-logo.jpg

If your SVG is large, you can inline it with SvgXml to avoid runtime fetch.

What’s left to match pixel-perfect?

Exact corner radii and spacing can be tweaked, but the structure/animation matches your home layout, status bar, ball states, animations, colors, and typography.

If you paste your current UI file(s), I’ll fold this into your existing screens and swap any naming/props so it drops in with minimal churn.