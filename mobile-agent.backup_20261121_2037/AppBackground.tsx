import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ImageBackground, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

type Variant = 'dark' | 'light';

/** Halo lumineux qui dérive lentement (3 cercles superposés = effet de flou, sans dépendance). */
function Orb({ size, color, top, left, dx, dy, duration }: {
  size: number; color: string; top: number; left: number; dx: number; dy: number; duration: number;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(t, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [t, duration]);
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', top, left, width: size, height: size, transform: [{ translateX }, { translateY }] }}
    >
      {[1, 0.7, 0.42].map((k) => (
        <View
          key={k}
          style={{
            position: 'absolute',
            top: (size - size * k) / 2,
            left: (size - size * k) / 2,
            width: size * k,
            height: size * k,
            borderRadius: (size * k) / 2,
            backgroundColor: color,
          }}
        />
      ))}
    </Animated.View>
  );
}

/**
 * Fond de l'application.
 * - `dark`  : écran de connexion (bleu nuit + halos cyan)
 * - `light` : écrans internes (gris clair + halos bleus discrets)
 * - `image` : image de fond optionnelle, recouverte d'un voile pour garder le texte lisible.
 */
export default function AppBackground({ variant = 'light', image = null }: {
  variant?: Variant;
  image?: ImageSourcePropType | null;
}) {
  const { width, height } = useWindowDimensions();
  const dark = variant === 'dark';
  const base = dark ? '#061E3E' : '#F3F6FA';
  const haloA = dark ? 'rgba(22,166,217,0.14)' : 'rgba(8,102,178,0.07)';
  const haloB = dark ? 'rgba(8,102,178,0.24)' : 'rgba(22,166,217,0.08)';
  const haloC = dark ? 'rgba(255,176,32,0.08)' : 'rgba(255,176,32,0.06)';
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: base, overflow: 'hidden' }]}>
      {image ? (
        <ImageBackground source={image} resizeMode="cover" style={StyleSheet.absoluteFill}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(6,30,62,0.62)' : 'rgba(243,246,250,0.86)' }]} />
        </ImageBackground>
      ) : null}
      <Orb size={width * 1.1} color={haloA} top={-width * 0.45} left={-width * 0.3} dx={40} dy={30} duration={7000} />
      <Orb size={width * 0.9} color={haloB} top={height * 0.35} left={width * 0.35} dx={-50} dy={-40} duration={9000} />
      <Orb size={width * 0.7} color={haloC} top={height * 0.72} left={-width * 0.2} dx={35} dy={-30} duration={8000} />
    </View>
  );
}

/** Apparition douce (fondu + glissement vers le haut) à chaque changement de page. */
export function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 340, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}
