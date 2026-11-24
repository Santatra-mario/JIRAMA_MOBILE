import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { fetchAgentMissions } from '../../api/agentService';
import type { AgentMission } from '../../types/agent';
import { COLORS } from '../../theme/colors';

type Props = {
  onOpenMissions: () => void;
  onSelectMission?: (mission: AgentMission) => void;
};

function normalizeStatus(status: unknown): string {
  return String(status ?? '').trim().toUpperCase();
}

function getStatusLabel(status: unknown): string {
  const value = normalizeStatus(status);
  if (value === 'TERMINEE' || value === 'TERMINE') return 'Terminée';
  if (value === 'EN_COURS') return 'En cours';
  if (value === 'A_REPROGRAMMER') return 'À reprogrammer';
  if (value === 'PLANIFIEE' || value === 'PLANIFIE') return 'Planifiée';
  return value || 'Statut non renseigné';
}

function getStatusStyle(status: unknown) {
  const value = normalizeStatus(status);
  if (value === 'TERMINEE' || value === 'TERMINE') return styles.statusSuccess;
  if (value === 'A_REPROGRAMMER') return styles.statusDanger;
  if (value === 'EN_COURS') return styles.statusInfo;
  return styles.statusWarning;
}

function formatDate(value?: string | null): string {
  if (!value) return 'Date non renseignée';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AgentDashboardOverviewScreen({ onOpenMissions, onSelectMission }: Props) {
  const { user, offlineWarning } = useAuth();
  const [missions, setMissions] = useState<AgentMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadMissions = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      // Source de vérité : API Agent existante. Aucune statistique fictive.
      const rows = await fetchAgentMissions();
      setMissions(Array.isArray(rows) ? rows : []);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Impossible de charger vos missions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMissions();
  }, [loadMissions]);

  const stats = useMemo(() => {
    const pending = missions.filter((mission) =>
      ['PLANIFIEE', 'PLANIFIE', 'EN_COURS'].includes(normalizeStatus(mission.statut)),
    ).length;
    const completed = missions.filter((mission) =>
      ['TERMINEE', 'TERMINE'].includes(normalizeStatus(mission.statut)),
    ).length;
    const reschedule = missions.filter((mission) =>
      normalizeStatus(mission.statut) === 'A_REPROGRAMMER',
    ).length;
    return { total: missions.length, pending, completed, reschedule };
  }, [missions]);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadMissions(true)}
          tintColor={COLORS.blue}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>{today.toUpperCase()}</Text>
          <Text style={styles.title}>Bonjour, {user?.prenom || 'Agent'}</Text>
          <Text style={styles.subtitle}>Votre activité et vos missions de terrain.</Text>
        </View>
        <Pressable
          onPress={() => void loadMissions(true)}
          style={styles.refreshButton}
          accessibilityRole="button"
          accessibilityLabel="Actualiser les missions"
        >
          <Text style={styles.refreshIcon}>↻</Text>
        </Pressable>
      </View>

      {offlineWarning ? (
        <View style={styles.noticeWarning}>
          <Text style={styles.noticeTitle}>⚠️ Connexion à vérifier</Text>
          <Text style={styles.noticeText}>{offlineWarning}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.noticeError}>
          <Text style={styles.noticeTitle}>Impossible d'actualiser les données</Text>
          <Text style={styles.noticeText}>{error}</Text>
          <Pressable onPress={() => void loadMissions()} style={styles.retryButton}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.heroCard}>
        <View style={styles.heroTopLine}>
          <Text style={styles.heroEyebrow}>VOTRE SUIVI TERRAIN</Text>
          <Text style={styles.heroIcon}>📋</Text>
        </View>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" style={styles.heroLoader} />
        ) : (
          <Text style={styles.heroNumber}>{stats.total.toString().padStart(2, '0')}</Text>
        )}
        <Text style={styles.heroLabel}>Missions réellement affectées à votre compte</Text>
        <Pressable onPress={onOpenMissions} style={styles.heroButton}>
          <Text style={styles.heroButtonText}>Consulter mes missions  →</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
        <Text style={styles.sectionHint}>Données reçues du serveur</Text>
      </View>
      <View style={styles.metricsGrid}>
        <MetricCard emoji="🎯" label="À effectuer" value={loading ? '—' : stats.pending} tone="warning" />
        <MetricCard emoji="✅" label="Terminées" value={loading ? '—' : stats.completed} tone="success" />
        <MetricCard emoji="🔁" label="À reprogrammer" value={loading ? '—' : stats.reschedule} tone="danger" />
        <MetricCard emoji="📂" label="Total des missions" value={loading ? '—' : stats.total} tone="info" />
      </View>

      <View style={styles.listHeader}>
        <View>
          <Text style={styles.sectionTitle}>Mes missions</Text>
          <Text style={styles.sectionHint}>Affectations visibles pour votre session Agent</Text>
        </View>
        <Pressable onPress={onOpenMissions}>
          <Text style={styles.link}>Tout voir →</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.emptyCard}>
          <ActivityIndicator color={COLORS.blue} />
          <Text style={styles.emptyText}>Chargement des missions…</Text>
        </View>
      ) : missions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🗂️</Text>
          <Text style={styles.emptyTitle}>Aucune mission affectée</Text>
          <Text style={styles.emptyText}>Les missions apparaîtront ici après leur affectation par le Responsable.</Text>
        </View>
      ) : (
        missions.slice(0, 5).map((mission) => (
          <Pressable
            key={mission.id}
            onPress={() => onSelectMission?.(mission)}
            style={styles.missionCard}
            accessibilityRole="button"
            accessibilityLabel={`Ouvrir la mission ${mission.id}`}
          >
            <View style={styles.missionTop}>
              <View style={styles.missionIcon}><Text style={styles.missionEmoji}>📍</Text></View>
              <View style={styles.missionMain}>
                <Text style={styles.missionTitle} numberOfLines={2}>
                  {mission.quartier || mission.commune || `Mission n° ${mission.id}`}
                </Text>
                <Text style={styles.missionMeta}>
                  {mission.numero_abonne ? `Abonné ${mission.numero_abonne}` : `Référence mission ${mission.id}`}
                </Text>
              </View>
              <View style={[styles.statusPill, getStatusStyle(mission.statut)]}>
                <Text style={styles.statusText}>{getStatusLabel(mission.statut)}</Text>
              </View>
            </View>
            <View style={styles.missionBottom}>
              <Text style={styles.missionDate}>📅 {formatDate(mission.date_prevue)}</Text>
              <Text style={styles.missionCounter}>
                {mission.numero_compteur ? `Compteur ${mission.numero_compteur}` : 'Compteur à consulter'}
              </Text>
            </View>
          </Pressable>
        ))
      )}

      <View style={styles.fieldHint}>
        <Text style={styles.fieldHintEmoji}>ℹ️</Text>
        <Text style={styles.fieldHintText}>
          Vérifiez toujours le compteur et l'ancien index avant de saisir le nouvel index observé sur le terrain.
        </Text>
      </View>
    </ScrollView>
  );
}

function MetricCard({
  emoji,
  label,
  value,
  tone,
}: {
  emoji: string;
  label: string;
  value: number | string;
  tone: 'warning' | 'success' | 'danger' | 'info';
}) {
  const toneColor = {
    warning: COLORS.warning,
    success: COLORS.success,
    danger: COLORS.danger,
    info: COLORS.blue,
  }[tone];
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: `${toneColor}16` }]}>
        <Text style={styles.metricEmoji}>{emoji}</Text>
      </View>
      <Text style={[styles.metricValue, { color: toneColor }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 14, paddingTop: 15, paddingBottom: 24 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  headingCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: COLORS.blue, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  title: { color: COLORS.navy, fontSize: 23, fontWeight: '900', marginTop: 4 },
  subtitle: { color: COLORS.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  refreshButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  refreshIcon: { color: COLORS.blue, fontSize: 26, fontWeight: '700', lineHeight: 29 },
  noticeWarning: { padding: 11, borderRadius: 12, backgroundColor: COLORS.warningBg, borderColor: '#EACB8C', borderWidth: 1, marginBottom: 12 },
  noticeError: { padding: 11, borderRadius: 12, backgroundColor: COLORS.dangerBg, borderColor: '#F1BFC5', borderWidth: 1, marginBottom: 12 },
  noticeTitle: { color: COLORS.text, fontSize: 11, fontWeight: '900' },
  noticeText: { color: COLORS.text, fontSize: 10, lineHeight: 16, marginTop: 4 },
  retryButton: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#FFFFFF', marginTop: 8 },
  retryText: { color: COLORS.danger, fontSize: 10, fontWeight: '900' },
  heroCard: { backgroundColor: COLORS.navy, borderRadius: 18, padding: 17, marginBottom: 18, overflow: 'hidden' },
  heroTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroEyebrow: { color: '#A9DDE8', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  heroIcon: { fontSize: 22 },
  heroNumber: { color: '#FFFFFF', fontSize: 39, fontWeight: '900', marginTop: 7 },
  heroLoader: { alignSelf: 'flex-start', marginTop: 16, marginBottom: 10 },
  heroLabel: { color: '#D7E8F0', fontSize: 10, marginTop: 1 },
  heroButton: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 10, marginTop: 13 },
  heroButtonText: { color: COLORS.navy, fontSize: 10, fontWeight: '900' },
  sectionHeading: { marginBottom: 9 },
  sectionTitle: { color: COLORS.navy, fontSize: 15, fontWeight: '900' },
  sectionHint: { color: COLORS.muted, fontSize: 9, marginTop: 3 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 19 },
  metricCard: { width: '48%', flexGrow: 1, minHeight: 112, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, padding: 12 },
  metricIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricEmoji: { fontSize: 16 },
  metricValue: { fontSize: 25, fontWeight: '900', marginTop: 7 },
  metricLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '800', marginTop: 1 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9, gap: 8 },
  link: { color: COLORS.blue, fontSize: 10, fontWeight: '900' },
  emptyCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, minHeight: 116, padding: 15, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 24, marginBottom: 5 },
  emptyTitle: { color: COLORS.text, fontSize: 12, fontWeight: '900' },
  emptyText: { color: COLORS.muted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 5 },
  missionCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, marginBottom: 9 },
  missionTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  missionIcon: { width: 37, height: 37, borderRadius: 11, backgroundColor: COLORS.blueLight, alignItems: 'center', justifyContent: 'center' },
  missionEmoji: { fontSize: 17 },
  missionMain: { flex: 1, minWidth: 0 },
  missionTitle: { color: COLORS.text, fontSize: 11, fontWeight: '900' },
  missionMeta: { color: COLORS.muted, fontSize: 9, marginTop: 3 },
  statusPill: { maxWidth: 105, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5 },
  statusSuccess: { backgroundColor: COLORS.successBg },
  statusInfo: { backgroundColor: COLORS.blueLight },
  statusWarning: { backgroundColor: COLORS.warningBg },
  statusDanger: { backgroundColor: COLORS.dangerBg },
  statusText: { color: COLORS.text, fontSize: 8, fontWeight: '900' },
  missionBottom: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 10, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', gap: 7, flexWrap: 'wrap' },
  missionDate: { color: COLORS.muted, fontSize: 9 },
  missionCounter: { color: COLORS.muted, fontSize: 9 },
  fieldHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: COLORS.blueLight, borderRadius: 12, padding: 11, marginTop: 5 },
  fieldHintEmoji: { fontSize: 13 },
  fieldHintText: { flex: 1, color: COLORS.navy, fontSize: 9, lineHeight: 15 },
});
