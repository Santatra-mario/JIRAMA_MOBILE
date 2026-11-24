import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { fetchAgentMissions } from '../../api/agentService';
import { EmptyState, ErrorState, LoadingState } from '../../components/ScreenState';
import { FilterRow } from '../../components/AgentUI';
import type { AgentMission } from '../../types/agent';
import { COLORS } from '../../theme/colors';

export default function MissionsScreen({ onSelect }: { onSelect: (mission: AgentMission) => void }) {
  const [missions, setMissions] = useState<AgentMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('TOUTES');
  const [quarterFilter, setQuarterFilter] = useState('TOUS');
  const [dateFilter, setDateFilter] = useState('TOUS');

  const load = useCallback(async () => {
    setError('');
    try { setMissions(await fetchAgentMissions()); }
    catch (err: any) { setError(err?.message || 'Impossible de charger les missions.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => missions.filter((m) => {
    const term = search.trim().toLowerCase();
    const matchText = !term || [m.numero_abonne, m.abonne_nom, m.abonne_prenom, m.numero_compteur, m.quartier, m.adresse, String(m.id)].some((v) => String(v || '').toLowerCase().includes(term));
    const status = String(m.statut || '').toUpperCase();
    const matchFilter = filter === 'TOUTES' || (filter === 'A_FAIRE' && ['PLANIFIEE', 'EN_COURS'].includes(status)) || (filter === 'TERMINEES' && status === 'TERMINEE') || (filter === 'A_REPROGRAMMER' && status === 'A_REPROGRAMMER');
    const quarter = quarterFilter === 'TOUS' || (quarterFilter === '__none__' ? !m.quartier : String(m.quartier || '') === quarterFilter);
    const day = dateFilter === 'TOUS' || String(m.date_prevue || '').slice(0, 10) === dateFilter;
    return matchText && matchFilter && quarter && day;
  }), [missions, search, filter, quarterFilter, dateFilter]);

  const quarters = Array.from(new Set(missions.map((m) => String(m.quartier || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'fr'));
  const days = Array.from(new Set(missions.map((m) => String(m.date_prevue || '').slice(0, 10)).filter(Boolean))).sort();
  const pendingCount = missions.filter((m) => ['PLANIFIEE', 'EN_COURS'].includes(String(m.statut || '').toUpperCase())).length;
  const completedCount = missions.filter((m) => String(m.statut || '').toUpperCase() === 'TERMINEE').length;

  if (loading) return <LoadingState label="Chargement des missions..." />;
  if (error && !missions.length) return <ErrorState message={error} onRetry={load} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.blue} />}>
      <Text style={styles.title}>Mes missions</Text><Text style={styles.subtitle}>Missions réellement attribuées à votre compte Agent.</Text>
      <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher abonné, compteur, quartier..." placeholderTextColor={COLORS.muted} style={styles.search} />
      <View style={styles.statsRow}><View style={styles.stat}><Text style={styles.statValue}>{missions.length}</Text><Text style={styles.statLabel}>Missions attribuées</Text></View><View style={styles.stat}><Text style={styles.statValue}>{pendingCount}</Text><Text style={styles.statLabel}>À réaliser</Text></View><View style={styles.stat}><Text style={styles.statValue}>{completedCount}</Text><Text style={styles.statLabel}>Terminées</Text></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {([['TOUTES', 'Toutes'], ['A_FAIRE', 'À faire'], ['TERMINEES', 'Terminées'], ['A_REPROGRAMMER', 'À revoir']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}><Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}</Text></Pressable>)}
      </ScrollView>
      <Text style={styles.filterLabel}>Quartier</Text>
      <FilterRow value={quarterFilter} onChange={setQuarterFilter} items={[{ value: 'TOUS', label: 'Tous' }, ...quarters.map((q) => ({ value: q, label: q })), ...(missions.some((m) => !m.quartier) ? [{ value: '__none__', label: 'Non renseigné' }] : [])]} />
      <Text style={styles.filterLabel}>Journée prévue</Text>
      <FilterRow value={dateFilter} onChange={setDateFilter} items={[{ value: 'TOUS', label: 'Toutes' }, ...days.map((d) => ({ value: d, label: formatDay(d) }))]} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {visible.length === 0 ? <EmptyState title="Aucune mission trouvée" message="Aucune mission ne correspond à votre recherche ou à ce filtre." /> : visible.map((mission) => <MissionCard key={mission.id} mission={mission} onPress={() => onSelect(mission)} />)}
    </ScrollView>
  );
}

function MissionCard({ mission, onPress }: { mission: AgentMission; onPress: () => void }) {
  const status = String(mission.statut || '').toUpperCase();
  const statusColor = status === 'TERMINEE' ? COLORS.success : status === 'A_REPROGRAMMER' ? COLORS.danger : status === 'EN_COURS' ? COLORS.blue : COLORS.warning;
  const customer = [mission.abonne_prenom, mission.abonne_nom].filter(Boolean).join(' ') || 'Abonné';
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
    <View style={styles.cardTop}><Text style={styles.missionId}>MISSION #{mission.id}</Text><View style={[styles.badge, { backgroundColor: statusColor + '18' }]}><Text style={[styles.badgeText, { color: statusColor }]}>{status.replaceAll('_', ' ')}</Text></View></View>
    <Text style={styles.customer}>{customer}</Text><Text style={styles.secondary}>Abonné : {mission.numero_abonne || '—'} · Compteur : {mission.numero_compteur || '—'}</Text>
    <View style={styles.row}><Text style={styles.meta}>{mission.quartier || 'Quartier non renseigné'}</Text><Text style={styles.meta}>{mission.date_prevue || 'Date non renseignée'}</Text></View>
    <Text style={styles.link}>Ouvrir la mission →</Text>
  </Pressable>;
}

function formatDay(value: string) { const d = new Date(`${value}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('fr-FR'); }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background }, statsRow: { flexDirection: 'row', gap: 8, marginTop: 4 }, stat: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10 }, statValue: { color: COLORS.navy, fontSize: 19, fontWeight: '900' }, statLabel: { color: COLORS.muted, fontSize: 8, fontWeight: '800', marginTop: 3 }, filterLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', marginTop: 6, marginBottom: 5 }, content: { padding: 16, paddingBottom: 30 }, title: { color: COLORS.text, fontSize: 24, fontWeight: '900' }, subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 5, marginBottom: 14 }, search: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#FFFFFF', paddingHorizontal: 14, color: COLORS.text }, filters: { gap: 8, paddingVertical: 13 }, filter: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, backgroundColor: '#FFFFFF', paddingVertical: 8, paddingHorizontal: 13 }, filterActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy }, filterText: { color: COLORS.muted, fontSize: 11, fontWeight: '800' }, filterTextActive: { color: '#FFFFFF' }, card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, padding: 15, marginBottom: 11 }, cardPressed: { opacity: 0.85 }, cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, missionId: { color: COLORS.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.6 }, badge: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 20 }, badgeText: { fontSize: 9, fontWeight: '900' }, customer: { color: COLORS.text, fontSize: 17, fontWeight: '900', marginTop: 12 }, secondary: { color: COLORS.muted, fontSize: 11, marginTop: 5 }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 13 }, meta: { color: COLORS.muted, fontSize: 10, flexShrink: 1 }, link: { color: COLORS.blue, fontSize: 12, fontWeight: '900', marginTop: 13 }, error: { color: COLORS.danger, marginBottom: 8, fontSize: 12 },
});
