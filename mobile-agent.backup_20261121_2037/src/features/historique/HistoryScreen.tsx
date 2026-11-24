import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchAgentReleves } from '../../api/agentService';
import { EmptyState, ErrorState, LoadingState } from '../../components/ScreenState';
import type { AgentReleve } from '../../types/agent';
import { COLORS } from '../../theme/colors';

export default function HistoryScreen() {
  const [rows, setRows] = useState<AgentReleve[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => { setError(''); try { setRows(await fetchAgentReleves()); } catch (err: any) { setError(err?.message || 'Historique indisponible.'); } finally { setLoading(false); setRefreshing(false); } }, []);
  useEffect(() => { load(); }, [load]);
  if (loading) return <LoadingState label="Chargement de votre historique..." />;
  if (error && !rows.length) return <ErrorState message={error} onRetry={load} />;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
    <Text style={styles.title}>Historique des relevés</Text><Text style={styles.subtitle}>Consultation des opérations autorisées pour votre compte.</Text>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {rows.length === 0 ? <EmptyState title="Aucun relevé" message="Aucun relevé n'est disponible pour vos missions." /> : rows.map((row) => <View key={row.id} style={styles.card}><Text style={styles.date}>{String(row.date_releve || '').slice(0, 10)}</Text><Text style={styles.meter}>{row.numero_compteur || `Compteur #${row.compteur_id}`}</Text><Text style={styles.details}>{row.numero_abonne || 'Abonné'} · {row.type_compteur || ''}</Text><View style={styles.readingRow}><View><Text style={styles.label}>Nouvel index</Text><Text style={styles.value}>{row.nouvel_index} {row.unite || ''}</Text></View><View><Text style={styles.label}>Consommation</Text><Text style={styles.value}>{row.consommation ?? '—'} {row.unite || ''}</Text></View></View><Text style={styles.type}>{row.type_releve || 'RELEVÉ'}</Text></View>)}
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: COLORS.background }, content: { padding: 16, paddingBottom: 30 }, title: { color: COLORS.text, fontSize: 23, fontWeight: '900' }, subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 5, marginBottom: 15 }, card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14, marginBottom: 10 }, date: { color: COLORS.muted, fontSize: 10, fontWeight: '800' }, meter: { color: COLORS.text, fontSize: 16, fontWeight: '900', marginTop: 7 }, details: { color: COLORS.muted, fontSize: 11, marginTop: 4 }, readingRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }, label: { color: COLORS.muted, fontSize: 9, fontWeight: '800' }, value: { color: COLORS.navy, fontSize: 18, fontWeight: '900', marginTop: 4 }, type: { color: COLORS.blue, fontSize: 10, fontWeight: '900', marginTop: 12 }, error: { color: COLORS.danger, fontSize: 12, marginBottom: 10 } });
