import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { fetchAgentAbonnes } from '../../api/agentService';
import { DataCard, EmptyBlock, ErrorBlock, FieldRow, FilterRow, LoadingBlock, PageContainer, PageHeading, SecondaryButton } from '../../components/AgentUI';
import type { AgentAbonne } from '../../types/agent';
import { COLORS } from '../../theme/colors';

export default function AbonnesScreen() {
  const [items, setItems] = useState<AgentAbonne[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('TOUS');
  const [withMeters, setWithMeters] = useState('TOUS');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    setError(''); if (refresh) setRefreshing(true); else setLoading(true);
    try { setItems(await fetchAgentAbonnes()); }
    catch (err: any) { setError(err?.message || 'Impossible de charger les abonnés.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => items.filter((item) => {
    const q = search.trim().toLocaleLowerCase('fr');
    const haystack = [item.numero_abonne, item.nom, item.prenom, item.adresse, item.telephone].join(' ').toLocaleLowerCase('fr');
    const count = Number(item.nombre_compteurs || 0);
    return (!q || haystack.includes(q))
      && (status === 'TOUS' || String(item.statut).toUpperCase() === status)
      && (withMeters === 'TOUS' || (withMeters === 'AVEC' ? count > 0 : count === 0));
  }), [items, search, status, withMeters]);

  const copyPhone = async (item: AgentAbonne) => {
    const phone = String(item.telephone || '').trim();
    if (!phone) { Alert.alert('Téléphone absent', 'Aucun numéro de téléphone n’est enregistré pour cet abonné.'); return; }
    try {
      // Le paquet est installé avec `npx expo install expo-clipboard`.
      // @ts-ignore — résolution effectuée après installation dans le projet Expo.
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(phone);
      Alert.alert('Numéro copié', `${phone} · ${item.prenom || ''} ${item.nom}`.trim());
    } catch {
      Alert.alert('Copie indisponible', `Numéro de téléphone : ${phone}`);
    }
  };

  if (loading && !items.length) return <LoadingBlock label="Chargement des abonnés…" />;
  return (
    <PageContainer refreshing={refreshing} onRefresh={() => void load(true)}>
      <PageHeading eyebrow="Fichier clientèle" title="Abonnés" subtitle="Consultation des abonnés, installations et informations de suivi disponibles pour l’Agent." right={<Text style={styles.total}>{visible.length} / {items.length}</Text>} />
      {!!error && <ErrorBlock message={error} onRetry={() => void load(true)} />}
      <TextInput value={search} onChangeText={setSearch} placeholder="Numéro, nom, adresse, téléphone…" placeholderTextColor={COLORS.subtle} style={styles.search} />
      <FilterRow value={status} onChange={setStatus} items={[{ value: 'TOUS', label: 'Tous statuts' }, { value: 'ACTIF', label: 'Actifs' }, { value: 'INACTIF', label: 'Inactifs' }]} />
      <FilterRow value={withMeters} onChange={setWithMeters} items={[{ value: 'TOUS', label: 'Tous' }, { value: 'AVEC', label: 'Avec compteur' }, { value: 'SANS', label: 'Sans compteur' }]} />
      {visible.length === 0 ? <EmptyBlock title="Aucun abonné" message="Aucun abonné ne correspond aux critères sélectionnés." /> : visible.map((item) => (
        <DataCard key={item.id} title={`${item.prenom || ''} ${item.nom || ''}`.trim() || 'Nom non renseigné'} subtitle={`N° abonné ${item.numero_abonne || '—'}`} badge={item.statut} onPress={() => setExpandedId(expandedId === item.id ? null : item.id)} action={<SecondaryButton compact label="Copier le téléphone" onPress={() => void copyPhone(item)} disabled={!item.telephone} />}>
          <FieldRow label="Adresse" value={item.adresse} />
          <FieldRow label="Téléphone" value={item.telephone} />
          <FieldRow label="Compteurs associés" value={item.nombre_compteurs ?? 0} />
          <FieldRow label="Dernier relevé" value={formatDate(item.dernier_releve)} />
          {expandedId === item.id && <View style={styles.expanded}><FieldRow label="Identifiant interne" value={item.id} /><Text style={styles.note}>Les informations sont consultatives. Les modifications contractuelles ne sont pas proposées dans l’espace Agent Mobile.</Text></View>}
          <Text style={styles.expandHint}>{expandedId === item.id ? 'Toucher pour réduire' : 'Toucher pour afficher les informations détaillées'}</Text>
        </DataCard>
      ))}
    </PageContainer>
  );
}
function formatDate(value: unknown) { if (!value) return 'Aucun relevé'; const d = new Date(`${String(value).slice(0, 10)}T00:00:00`); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('fr-FR'); }
const styles = StyleSheet.create({ total: { color: COLORS.blue, fontWeight: '900', fontSize: 11 }, search: { minHeight: 46, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.field, borderRadius: 9, paddingHorizontal: 12, color: COLORS.text, fontSize: 12 }, expanded: { borderTopWidth: 1, borderColor: COLORS.border, paddingTop: 8, marginTop: 5 }, note: { color: COLORS.muted, fontSize: 10, lineHeight: 16, marginTop: 6 }, expandHint: { color: COLORS.blue, fontSize: 9, fontWeight: '800', marginTop: 4 } });
