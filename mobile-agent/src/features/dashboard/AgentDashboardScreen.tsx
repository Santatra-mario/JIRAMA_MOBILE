import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';

import { useAuth } from '../../auth/AuthContext';
import {
  fetchAgentDashboard,
  fetchAgentMissions,
  localDateString,
} from '../../api/agentService';
import { ErrorBlock, LoadingBlock, PageContainer } from '../../components/AgentUI';
import type { AgentDashboardData, AgentMission } from '../../types/agent';
import { COLORS } from '../../theme/colors';

export type AgentPageKey =
  | 'dashboard'
  | 'compteurs'
  | 'abonnes'
  | 'releves'
  | 'missions'
  | 'anomalies'
  | 'notifications'
  | 'audit'
  | 'aide'
  | 'parametres'
  | 'profil';

type DashboardProps = {
  onNavigate: (page: AgentPageKey) => void;
  onSelectMission?: (missionId: number) => void;
};

type MetricTone = 'blue' | 'green' | 'orange' | 'red';

export default function AgentDashboardScreen({
  onNavigate,
  onSelectMission,
}: DashboardProps) {
  const { user, offlineWarning } = useAuth();
  const { width } = useWindowDimensions();
  const compact = width < 370;

  const [data, setData] = useState<AgentDashboardData | null>(null);
  const [missions, setMissions] = useState<AgentMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    setError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);

    const [dashboardResult, missionsResult] = await Promise.allSettled([
      fetchAgentDashboard(),
      fetchAgentMissions(),
    ]);

    if (dashboardResult.status === 'fulfilled') {
      setData(dashboardResult.value);
    }

    if (missionsResult.status === 'fulfilled') {
      setMissions(Array.isArray(missionsResult.value) ? missionsResult.value : []);
    }

    const errors: string[] = [];
    if (dashboardResult.status === 'rejected') {
      errors.push(
        dashboardResult.reason instanceof Error
          ? dashboardResult.reason.message
          : 'Statistiques indisponibles.',
      );
    }
    if (missionsResult.status === 'rejected') {
      errors.push(
        missionsResult.reason instanceof Error
          ? missionsResult.reason.message
          : 'Missions indisponibles.',
      );
    }

    if (errors.length === 2) setError(errors.join(' '));
    else if (errors.length) setError(errors.join(' '));

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = data?.stats || {};
  const today = localDateString();
  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const firstName = user?.prenom?.trim() || 'Agent';
  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(' ').trim();

  const assigned = missions.length;
  const completed = missions.filter(
    (mission) => String(mission.statut || '').toUpperCase() === 'TERMINEE',
  ).length;
  const pending = missions.filter(
    (mission) => String(mission.statut || '').toUpperCase() === 'PLANIFIEE',
  ).length;
  const anomalies = Number(stats.anomalies ?? data?.anomaliesRecentes?.length ?? 0);

  const todayMissions = useMemo(
    () => missions.filter((mission) => String(mission.date_prevue || '').slice(0, 10) === today),
    [missions, today],
  );

  const displayedMissions = useMemo(() => {
    if (todayMissions.length) return todayMissions.slice(0, 3);
    return missions
      .filter((mission) => ['PLANIFIEE', 'EN_COURS', 'A_REPROGRAMMER'].includes(String(mission.statut || '').toUpperCase()))
      .slice(0, 3);
  }, [missions, todayMissions]);

  if (loading && !data && missions.length === 0) {
    return <LoadingBlock label="Chargement de votre espace Agent…" />;
  }

  if (error && !data && missions.length === 0) {
    return (
      <PageContainer refreshing={refreshing} onRefresh={() => void load(true)}>
        <ErrorBlock message={error} onRetry={() => void load(true)} />
      </PageContainer>
    );
  }

  const metrics: Array<{
    label: string;
    value: string;
    tone: MetricTone;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    onPress: () => void;
  }> = [
    { label: 'Missions', value: formatInteger(assigned), tone: 'blue', icon: 'briefcase-outline', onPress: () => onNavigate('missions') },
    { label: 'Terminées', value: formatInteger(completed), tone: 'green', icon: 'checkmark-circle-outline', onPress: () => onNavigate('missions') },
    { label: 'En attente', value: formatInteger(pending), tone: 'orange', icon: 'time-outline', onPress: () => onNavigate('missions') },
    { label: 'Anomalies', value: formatInteger(anomalies), tone: 'red', icon: 'alert-circle-outline', onPress: () => onNavigate('anomalies') },
  ];

  return (
    <PageContainer refreshing={refreshing} onRefresh={() => void load(true)}>
      <View style={styles.welcomeBlock}>
        <View style={styles.welcomeCopy}>
          <Text style={styles.greeting}>
            Bonjour, <Text style={styles.greetingName}>{firstName}</Text>
          </Text>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.muted} />
            <Text style={styles.dateText}>{capitalize(todayLabel)}</Text>
          </View>
          {!!fullName && <Text style={styles.roleText}>Espace terrain · {fullName}</Text>}
        </View>
        <View style={styles.welcomeAvatar}>
          <Text style={styles.welcomeAvatarText}>{getInitials(user?.prenom, user?.nom)}</Text>
        </View>
      </View>

      {!!offlineWarning && (
        <View style={styles.noticeWarning}>
          <Ionicons name="cloud-offline-outline" size={17} color={COLORS.warning} />
          <Text style={styles.noticeWarningText}>{offlineWarning}</Text>
        </View>
      )}
      {!!error && (
        <View style={styles.noticeWarning}>
          <Ionicons name="information-circle-outline" size={17} color={COLORS.warning} />
          <Text style={styles.noticeWarningText}>{error}</Text>
        </View>
      )}

      <View style={styles.dayHero}>
        <View style={styles.heroDecorCircle} />
        <View style={styles.heroDecorCircleTwo} />
        <View style={styles.heroCopy}>
          <View style={styles.heroAccent} />
          <Text style={styles.heroEyebrow}>ESPACE AGENT JIRAMA</Text>
          <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>
            Votre journée de terrain
          </Text>
          <Text style={styles.heroSubtitle}>Missions réellement attribuées à votre compte</Text>
          <Pressable
            onPress={() => onNavigate('missions')}
            style={({ pressed }) => [styles.heroPill, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Ionicons name="locate-outline" size={18} color={COLORS.navy} />
            <Text style={styles.heroPillText}>{formatInteger(assigned)} mission{assigned > 1 ? 's' : ''}</Text>
          </Pressable>
        </View>
        <View style={styles.heroIllustration}>
          <View style={styles.heroIconBubble}>
            <Ionicons name="flash" size={28} color={COLORS.yellow} />
          </View>
          <View style={styles.heroIconBubbleSmall}>
            <Ionicons name="water" size={18} color="#FFFFFF" />
          </View>
          <Ionicons name="business-outline" size={76} color="rgba(255,255,255,0.32)" />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionAccent} />
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionTitle}>Chiffres clés</Text>
          <Text style={styles.sectionSubtitle}>Synthèse de vos opérations</Text>
        </View>
        <Pressable
          onPress={() => void load(true)}
          disabled={refreshing}
          style={styles.refreshButton}
          accessibilityRole="button"
          accessibilityLabel="Actualiser les chiffres clés"
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={COLORS.blue} />
          ) : (
            <Ionicons name="refresh-outline" size={19} color={COLORS.blue} />
          )}
        </Pressable>
      </View>

      <View style={styles.metricGrid}>
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionAccent} />
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionTitle}>Accès rapides</Text>
          <Text style={styles.sectionSubtitle}>Ouvrir un module de travail</Text>
        </View>
        <Pressable onPress={() => onNavigate('missions')} style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>Missions</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.blue} />
        </Pressable>
      </View>

      <View style={styles.quickGrid}>
        <QuickAccess label="Abonnés" icon="people-outline" tone="blue" onPress={() => onNavigate('abonnes')} />
        <QuickAccess label="Compteurs" icon="speedometer-outline" tone="blue" onPress={() => onNavigate('compteurs')} />
        <QuickAccess label="Relevés" icon="clipboard-outline" tone="green" onPress={() => onNavigate('releves')} />
        <QuickAccess label="Contrôles" icon="shield-checkmark-outline" tone="blue" onPress={() => onNavigate('missions')} />
        <QuickAccess label="Missions" icon="location-outline" tone="orange" onPress={() => onNavigate('missions')} />
        <QuickAccess label="Anomalies" icon="warning-outline" tone="red" onPress={() => onNavigate('anomalies')} />
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionAccent} />
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionTitle}>
            {todayMissions.length ? 'Mes missions aujourd’hui' : 'Mes prochaines missions'}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {todayMissions.length
              ? `${todayMissions.length} mission(s) programmée(s) aujourd’hui`
              : 'Affectations en attente ou en cours'}
          </Text>
        </View>
        <Pressable onPress={() => onNavigate('missions')} style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>Tout voir</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.blue} />
        </Pressable>
      </View>

      {displayedMissions.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-clear-outline" size={25} color={COLORS.blue} />
          </View>
          <Text style={styles.emptyTitle}>Aucune mission prévue</Text>
          <Text style={styles.emptyText}>
            Les missions apparaîtront ici lorsqu’elles seront affectées par le Responsable.
          </Text>
        </View>
      ) : (
        displayedMissions.map((mission) => (
          <MissionPreview
            key={mission.id}
            mission={mission}
            onPress={() => { if (onSelectMission) onSelectMission(mission.id); else onNavigate('missions'); }}
          />
        ))
      )}

      <View style={styles.infoNote}>
        <Ionicons name="information-circle-outline" size={19} color={COLORS.blue} />
        <Text style={styles.infoNoteText}>
          Avant d’enregistrer un relevé, vérifiez le numéro du compteur et l’ancien index enregistré.
        </Text>
      </View>
    </PageContainer>
  );
}

function MetricCard({
  label,
  value,
  tone,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  tone: MetricTone;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  const color = toneColor(tone);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.metricCard, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={[styles.metricIcon, { backgroundColor: color + '16' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.metricTextBlock}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#7890A8" />
      <View style={[styles.metricBottomLine, { backgroundColor: color }]} />
    </Pressable>
  );
}

function QuickAccess({
  label,
  icon,
  tone,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tone: MetricTone;
  onPress: () => void;
}) {
  const color = toneColor(tone);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickCard, pressed && styles.quickCardPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.quickIconWrap, { backgroundColor: color + '16' }]}>
        <Ionicons name={icon} size={25} color={color} />
      </View>
      <Text numberOfLines={1} style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function MissionPreview({ mission, onPress }: { mission: AgentMission; onPress: () => void }) {
  const status = String(mission.statut || '').toUpperCase();
  const statusLabel = status === 'TERMINEE'
    ? 'Terminée'
    : status === 'EN_COURS'
      ? 'En cours'
      : status === 'A_REPROGRAMMER'
        ? 'À reprogrammer'
        : 'À faire';
  const color = status === 'TERMINEE'
    ? COLORS.success
    : status === 'A_REPROGRAMMER'
      ? COLORS.danger
      : status === 'EN_COURS'
        ? COLORS.blue
        : COLORS.warning;
  const place = mission.quartier || mission.commune || mission.adresse || 'Localisation non renseignée';
  const meter = mission.numero_compteur ? `Compteur ${mission.numero_compteur}` : 'Compteur non renseigné';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.missionCard, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir mission ${mission.id}, ${statusLabel}`}
    >
      <View style={styles.missionIconWrap}>
        <Ionicons
          name={String(mission.type_compteur || '').toUpperCase() === 'EAU' ? 'water-outline' : 'flash-outline'}
          size={25}
          color={COLORS.blue}
        />
      </View>
      <View style={styles.missionBody}>
        <Text style={styles.missionTitle} numberOfLines={1}>
          {String(mission.type_compteur || '').toUpperCase() === 'EAU' ? 'Contrôle compteur d’eau' : 'Relevé électrique'}
        </Text>
        <View style={styles.missionMetaRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.subtle} />
          <Text style={styles.missionMeta} numberOfLines={1}>{place}</Text>
        </View>
        <View style={styles.missionMetaRow}>
          <Ionicons name="speedometer-outline" size={14} color={COLORS.subtle} />
          <Text style={styles.missionMeta} numberOfLines={1}>{meter}</Text>
        </View>
        <Text style={[styles.missionDate, { color }]}>{statusLabel} · {formatDate(mission.date_prevue)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.subtle} />
    </Pressable>
  );
}

function toneColor(tone: MetricTone) {
  return tone === 'green'
    ? COLORS.success
    : tone === 'orange'
      ? COLORS.orange
      : tone === 'red'
        ? COLORS.danger
        : COLORS.blue;
}

function formatInteger(value: number) {
  return value.toLocaleString('fr-FR');
}

function formatDate(value: unknown) {
  if (!value) return 'Date à définir';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getInitials(first?: string | null, last?: string | null) {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || 'AG';
}

const styles = StyleSheet.create({
  welcomeBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  welcomeCopy: { flex: 1, minWidth: 0 },
  greeting: { color: '#52647B', fontSize: 23, fontWeight: '500' },
  greetingName: { color: COLORS.blue, fontWeight: '900' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  dateText: { color: COLORS.muted, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  roleText: { color: COLORS.subtle, fontSize: 10, marginTop: 4 },
  welcomeAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.blueLight, borderWidth: 2, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  welcomeAvatarText: { color: COLORS.blue, fontSize: 13, fontWeight: '900' },
  noticeWarning: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.warningBg, borderRadius: 12, padding: 10, marginBottom: 12 },
  noticeWarningText: { color: COLORS.warning, fontSize: 11, lineHeight: 16, flex: 1 },
  dayHero: { minHeight: 152, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 15, backgroundColor: COLORS.navy, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  heroDecorCircle: { position: 'absolute', right: -38, top: -70, height: 205, width: 205, borderRadius: 103, backgroundColor: 'rgba(36,137,205,0.26)' },
  heroDecorCircleTwo: { position: 'absolute', right: 57, bottom: -108, height: 170, width: 170, borderRadius: 85, backgroundColor: 'rgba(247,198,0,0.12)' },
  heroCopy: { flex: 1, minWidth: 0, zIndex: 2 },
  heroAccent: { width: 5, height: 66, backgroundColor: COLORS.yellow, position: 'absolute', left: 0, top: 4, borderRadius: 5 },
  heroEyebrow: { color: '#A9D7F3', fontSize: 8, fontWeight: '900', letterSpacing: 1.3, marginLeft: 15 },
  heroTitle: { color: COLORS.white, fontSize: 22, lineHeight: 27, fontWeight: '900', marginLeft: 15, marginTop: 7 },
  heroTitleCompact: { fontSize: 19, lineHeight: 23 },
  heroSubtitle: { color: '#DCEBFA', fontSize: 10, lineHeight: 15, marginLeft: 15, marginTop: 5, maxWidth: 220 },
  heroPill: { alignSelf: 'flex-start', minHeight: 36, borderRadius: 20, backgroundColor: COLORS.yellow, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7, marginLeft: 15, marginTop: 12 },
  heroPillText: { color: COLORS.navy, fontSize: 13, fontWeight: '900' },
  heroIllustration: { width: 75, height: 105, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  heroIconBubble: { position: 'absolute', top: 0, right: 1, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  heroIconBubbleSmall: { position: 'absolute', bottom: 3, left: 0, width: 31, height: 31, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.19)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 5, marginBottom: 11 },
  sectionAccent: { width: 4, height: 34, borderRadius: 4, backgroundColor: COLORS.blue },
  sectionTitleWrap: { flex: 1, minWidth: 0 },
  sectionTitle: { color: COLORS.navy, fontSize: 18, fontWeight: '900' },
  sectionSubtitle: { color: COLORS.subtle, fontSize: 10, marginTop: 2 },
  refreshButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.blueLight, alignItems: 'center', justifyContent: 'center' },
  seeAllButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  seeAllText: { color: COLORS.blue, fontSize: 11, fontWeight: '900' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 18 },
  metricCard: { width: '48.3%', minHeight: 102, backgroundColor: COLORS.white, borderRadius: 19, borderColor: '#E2EAF3', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 9, overflow: 'hidden' },
  metricIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  metricTextBlock: { flex: 1, minWidth: 0 },
  metricLabel: { color: COLORS.navy, fontSize: 12, fontWeight: '800' },
  metricValue: { fontSize: 29, lineHeight: 34, fontWeight: '900', marginTop: 2 },
  metricBottomLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginBottom: 18 },
  quickCard: { width: '31.6%', minHeight: 88, backgroundColor: COLORS.white, borderRadius: 17, borderWidth: 1, borderColor: '#E2EAF3', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, paddingVertical: 10, gap: 6, elevation: 2, shadowColor: '#1E3A5F', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  quickCardPressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  quickIconWrap: { width: 43, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: COLORS.navy, fontSize: 10, fontWeight: '900' },
  missionCard: { minHeight: 106, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: COLORS.white, borderRadius: 19, borderWidth: 1, borderColor: '#E2EAF3', padding: 12, marginBottom: 9, elevation: 2, shadowColor: '#1E3A5F', shadowOpacity: 0.05, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } },
  missionIconWrap: { width: 49, height: 49, borderRadius: 25, backgroundColor: COLORS.blueLight, alignItems: 'center', justifyContent: 'center' },
  missionBody: { flex: 1, minWidth: 0 },
  missionTitle: { color: COLORS.navy, fontSize: 14, fontWeight: '900', marginBottom: 5 },
  missionMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  missionMeta: { color: COLORS.muted, fontSize: 10, flex: 1 },
  missionDate: { fontSize: 10, fontWeight: '900', marginTop: 5 },
  emptyCard: { backgroundColor: COLORS.white, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', padding: 20, marginBottom: 16 },
  emptyIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.blueLight, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  emptyTitle: { color: COLORS.navy, fontSize: 13, fontWeight: '900' },
  emptyText: { color: COLORS.subtle, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  infoNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EAF4FC', borderRadius: 13, padding: 12, marginTop: 2, marginBottom: 10 },
  infoNoteText: { flex: 1, color: COLORS.navy, fontSize: 10, lineHeight: 15 },
  pressed: { opacity: 0.78 },
});
