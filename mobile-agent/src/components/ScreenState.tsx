import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../theme/colors';

export function LoadingState({ label = 'Chargement...' }: { label?: string }) {
  return <View style={styles.center}><ActivityIndicator color={COLORS.blue} size="large" /><Text style={styles.muted}>{label}</Text></View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <View style={styles.box}><Text style={styles.errorTitle}>Une erreur est survenue</Text><Text style={styles.error}>{message}</Text>{onRetry ? <Pressable onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Réessayer</Text></Pressable> : null}</View>;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return <View style={styles.box}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.muted}>{message}</Text></View>;
}

const styles = StyleSheet.create({
  center: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: COLORS.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  box: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, padding: 18, borderRadius: 16, marginTop: 12 },
  errorTitle: { color: COLORS.danger, fontSize: 15, fontWeight: '900' },
  error: { color: COLORS.text, fontSize: 13, lineHeight: 20, marginTop: 6 },
  emptyTitle: { color: COLORS.text, fontSize: 15, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  retry: { marginTop: 14, alignSelf: 'flex-start', backgroundColor: COLORS.blueLight, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10 },
  retryText: { color: COLORS.blue, fontWeight: '900', fontSize: 12 },
});
