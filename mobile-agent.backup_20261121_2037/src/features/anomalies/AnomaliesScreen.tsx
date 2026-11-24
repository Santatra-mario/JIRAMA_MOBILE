import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { fetchAgentAnomalies } from '../../api/agentService';
import { DataCard, EmptyBlock, ErrorBlock, FieldRow, FilterRow, LoadingBlock, PageContainer, PageHeading } from '../../components/AgentUI';
import type { AgentAnomalie } from '../../types/agent';
import { COLORS } from '../../theme/colors';

export default function AnomaliesScreen() {
  const [items, setItems] = useState<AgentAnomalie[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [niveau, setNiveau] = useState('');
  const [statut, setStatut] = useState('');

  const load = useCallback(async (refresh = false) => {
    setError(''); if (refresh) setRefreshing(true); else setLoading(true);
    try { setItems(await fetchAgentAnomalies({ recherche: search || undefined, type: type || undefined, niveau: niveau || undefined, statut: statut || undefined })); }
    catch (err: any) { setError(err?.message || 'Impossible de charger les anomalies.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search, type, niveau, statut]);
  useEffect(() => { const timer = setTimeout(() => void load(), 220); return () => clearTimeout(timer); }, [load]);

  const visible = useMemo(() => items, [items]);
  if (loading && !items.length) return <LoadingBlock label="Chargement des anomalies…" />;
  return (
    <PageContainer refreshing={refreshing} onRefresh={() => void load(true)}>
      <PageHeading eyebrow="Écarts à vérifier" title="Anomalies" subtitle="Signaux de consommation inhabituelle et anomalies enregistrées. Un signal n’est pas automatiquement une fraude confirmée." right={<Text style={styles.total}>{visible.length}</Text>} />
      {!!error && <ErrorBlock message={error} onRetry={() => void load(true)} />}
      <TextInput value={search} onChangeText={setSearch} placeholder="Compteur, abonné, type…" placeholderTextColor={COLORS.subtle} style={styles.search} />
      <FilterRow value={type} onChange={setType} items={[{ value: '', label: 'Tous types' }, { value: 'EAU', label: 'Eau' }, { value: 'ELECTRICITE', label: 'Électricité' }]} />
      <FilterRow value={niveau} onChange={setNiveau} items={[{ value: '', label: 'Tous niveaux' }, { value: 'ATTENTION', label: 'Attention' }, { value: 'SUSPECTE', label: 'Suspecte' }, { value: 'CRITIQUE', label: 'Critique' }]} />
      <FilterRow value={statut} onChange={setStatut} items={[{ value: '', label: 'Tous statuts' }, { value: 'NOUVELLE', label: 'Nouvelle' }, { value: 'EN_COURS', label: 'En cours' }, { value: 'VERIFIEE', label: 'Vérifiée' }, { value: 'RESOLUE', label: 'Résolue' }]} />
      {visible.length === 0 ? <EmptyBlock title="Aucune anomalie" message="Aucune anomalie ne correspond aux filtres sélectionnés." /> : visible.map((item) => (
        <DataCard key={item.id} title={item.type_anomalie || 'Écart détecté'} subtitle={`Compteur ${item.numero_compteur || '—'} · Abonné ${item.numero_abonne || '—'}`} badge={item.niveau || item.statut}>
          <FieldRow label="Statut" value={item.statut} />
          <FieldRow label="Direction" value={item.direction} />
          <FieldRow label="Valeur observée" value={item.valeur === null || item.valeur === undefined ? '—' : `${item.valeur} ${item.unite || ''}`} />
          <FieldRow label="Valeur de référence" value={item.valeur_reference === null || item.valeur_reference === undefined ? '—' : `${item.valeur_reference} ${item.unite || ''}`} />
          <FieldRow label="Variation" value={item.variation === null || item.variation === undefined ? '—' : `${item.variation} %`} />
          <FieldRow label="Date de détection" value={formatDate(item.date_detection || item.date_releve)} />
          {!!item.description && <Text style={styles.description}>{item.description}</Text>}
          {!!item.commentaire && <Text style={styles.description}>Observation : {item.commentaire}</Text>}
        </DataCard>
      ))}
    </PageContainer>
  );
}
function formatDate(value: unknown) { if (!value) return '—'; const d = new Date(String(value)); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('fr-FR'); }
const styles = StyleSheet.create({ total: { color: COLORS.blue, fontWeight: '900' }, search: { minHeight: 45, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.field, borderRadius: 9, paddingHorizontal: 12, color: COLORS.text, fontSize: 12 }, description: { color: COLORS.muted, fontSize: 10, lineHeight: 16, marginTop: 5 } });
