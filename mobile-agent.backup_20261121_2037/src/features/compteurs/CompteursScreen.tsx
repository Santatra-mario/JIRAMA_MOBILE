import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createAgentCompteur, fetchAgentAbonnes, fetchAgentCompteurs } from '../../api/agentService';
import { DataCard, EmptyBlock, ErrorBlock, FieldRow, FilterRow, FormField, LoadingBlock, PageContainer, PageHeading, PrimaryButton, SecondaryButton } from '../../components/AgentUI';
import type { AgentAbonne, AgentCompteur } from '../../types/agent';
import { COLORS } from '../../theme/colors';

export default function CompteursScreen({ onCreateReleve }: { onCreateReleve: (compteur: AgentCompteur) => void }) {
  const [items, setItems] = useState<AgentCompteur[]>([]);
  const [abonnes, setAbonnes] = useState<AgentAbonne[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('TOUS');
  const [statusFilter, setStatusFilter] = useState('TOUS');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [numero, setNumero] = useState('');
  const [type, setType] = useState<'EAU' | 'ELECTRICITE'>('ELECTRICITE');
  const [dateInstallation, setDateInstallation] = useState('');
  const [abonneId, setAbonneId] = useState('');
  const [abonneSearch, setAbonneSearch] = useState('');

  const load = useCallback(async (refresh = false) => {
    setError('');
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const [compteurs, subscribers] = await Promise.all([fetchAgentCompteurs(), fetchAgentAbonnes()]);
      setItems(compteurs);
      setAbonnes(subscribers);
    } catch (err: any) { setError(err?.message || 'Impossible de charger les compteurs.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => items.filter((item) => {
    const q = search.trim().toLocaleLowerCase('fr');
    const haystack = [item.numero_compteur, item.numero_abonne, item.abonne_nom, item.abonne_prenom, item.abonne_adresse].join(' ').toLocaleLowerCase('fr');
    return (!q || haystack.includes(q))
      && (typeFilter === 'TOUS' || String(item.type).toUpperCase() === typeFilter)
      && (statusFilter === 'TOUS' || String(item.statut).toUpperCase() === statusFilter);
  }), [items, search, typeFilter, statusFilter]);
  const activeAbonnes = useMemo(() => abonnes.filter((a) => String(a.statut).toLowerCase() === 'actif'), [abonnes]);
  const searchedAbonnes = activeAbonnes.filter((a) => [a.numero_abonne, a.nom, a.prenom].join(' ').toLowerCase().includes(abonneSearch.toLowerCase()));

  const resetForm = () => { setNumero(''); setType('ELECTRICITE'); setDateInstallation(''); setAbonneId(''); setAbonneSearch(''); setFormError(''); };
  const save = async () => {
    setFormError('');
    if (!numero.trim()) { setFormError('Le numéro du compteur est obligatoire.'); return; }
    if (!abonneId) { setFormError('Sélectionnez un abonné actif.'); return; }
    if (items.some((item) => item.numero_compteur.trim().toLowerCase() === numero.trim().toLowerCase())) { setFormError('Ce numéro de compteur existe déjà dans la liste chargée.'); return; }
    setSaving(true);
    try {
      const response = await createAgentCompteur({ numero_compteur: numero.trim(), type, date_installation: dateInstallation.trim() || null, statut: 'ACTIF', abonne_id: Number(abonneId) });
      if (response?.status !== 'success') throw new Error(response?.message || 'Le serveur n’a pas confirmé la création.');
      setModalVisible(false); resetForm(); await load(true);
    } catch (err: any) { setFormError(err?.message || 'Impossible de créer le compteur.'); }
    finally { setSaving(false); }
  };

  if (loading && !items.length) return <LoadingBlock label="Chargement des compteurs…" />;
  return (
    <PageContainer refreshing={refreshing} onRefresh={() => void load(true)}>
      <PageHeading eyebrow="Gestion des installations" title="Compteurs" subtitle="Consultation et enregistrement des compteurs accessibles à votre compte Agent." right={<Text style={styles.total}>{visible.length} / {items.length}</Text>} />
      {!!error && <ErrorBlock message={error} onRetry={() => void load(true)} />}
      <PrimaryButton label="＋ Ajouter un compteur" onPress={() => { resetForm(); setModalVisible(true); }} />
      <TextInput value={search} onChangeText={setSearch} placeholder="Numéro, abonné, adresse…" placeholderTextColor={COLORS.subtle} style={styles.search} />
      <FilterRow value={typeFilter} onChange={setTypeFilter} items={[{ value: 'TOUS', label: 'Tous les types' }, { value: 'EAU', label: 'Eau' }, { value: 'ELECTRICITE', label: 'Électricité' }]} />
      <FilterRow value={statusFilter} onChange={setStatusFilter} items={[{ value: 'TOUS', label: 'Tous statuts' }, { value: 'ACTIF', label: 'Actifs' }, { value: 'INACTIF', label: 'Inactifs' }, { value: 'A_VERIFIER', label: 'À vérifier' }]} />
      {visible.length === 0 ? <EmptyBlock title="Aucun compteur" message="Aucun compteur ne correspond à la recherche ou aux filtres sélectionnés." /> : visible.map((item) => (
        <DataCard key={item.id} title={`N° ${item.numero_compteur}`} subtitle={`${item.type === 'EAU' ? 'Eau · m³' : 'Électricité · kWh'} · ${[item.abonne_prenom, item.abonne_nom].filter(Boolean).join(' ') || 'Abonné non renseigné'}`} badge={item.statut} onPress={() => setExpandedId(expandedId === item.id ? null : item.id)} action={<PrimaryButton compact label="Saisir un relevé" onPress={() => onCreateReleve(item)} />}>
          <FieldRow label="Référence abonné" value={item.numero_abonne} />
          <FieldRow label="Dernier relevé" value={formatDate(item.dernier_releve)} />
          <FieldRow label="Dernier index" value={formatNumber(item.dernier_index)} />
          <FieldRow label="Dernière consommation" value={item.derniere_consommation === null || item.derniere_consommation === undefined ? '—' : `${formatNumber(item.derniere_consommation)} ${item.type === 'EAU' ? 'm³' : 'kWh'}`} />
          {expandedId === item.id && <View style={styles.expanded}><FieldRow label="ID technique" value={item.id} /><FieldRow label="Date installation" value={formatDate(item.date_installation)} /><FieldRow label="Adresse" value={item.abonne_adresse} /><FieldRow label="Téléphone" value={item.abonne_telephone} /></View>}
          <Text style={styles.expandHint}>{expandedId === item.id ? 'Toucher pour réduire' : 'Toucher pour voir les détails'}</Text>
        </DataCard>
      ))}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => !saving && setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}><View style={{ flex: 1 }}><Text style={styles.modalTitle}>Ajouter un compteur</Text><Text style={styles.modalSubtitle}>Le numéro, le type et l’abonné sont obligatoires.</Text></View><Pressable onPress={() => !saving && setModalVisible(false)}><Text style={styles.close}>✕</Text></Pressable></View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <FormField label="Numéro du compteur *" value={numero} onChangeText={setNumero} placeholder="Ex. ELEC-0001" />
              <Text style={styles.formLabel}>Type de compteur</Text>
              <View style={styles.typeRow}><TypeButton label="Eau" active={type === 'EAU'} onPress={() => setType('EAU')} /><TypeButton label="Électricité" active={type === 'ELECTRICITE'} onPress={() => setType('ELECTRICITE')} /></View>
              <FormField label="Date d’installation (AAAA-MM-JJ)" value={dateInstallation} onChangeText={setDateInstallation} placeholder="2026-01-31" />
              <FormField label="Rechercher un abonné actif" value={abonneSearch} onChangeText={setAbonneSearch} placeholder="Numéro ou nom" />
              <View style={styles.abonneList}>{searchedAbonnes.slice(0, 12).map((a) => <Pressable key={a.id} onPress={() => setAbonneId(String(a.id))} style={[styles.abonneOption, String(a.id) === abonneId && styles.abonneSelected]}><Text style={styles.abonneOptionText}>{a.numero_abonne} · {[a.prenom, a.nom].filter(Boolean).join(' ')}</Text>{String(a.id) === abonneId && <Text style={styles.check}>✓</Text>}</Pressable>)}{searchedAbonnes.length === 0 && <Text style={styles.helper}>Aucun abonné actif correspondant.</Text>}</View>
              {!!formError && <Text style={styles.formError}>{formError}</Text>}
              <View style={styles.modalActions}>{saving ? <ActivityIndicator color={COLORS.blue} /> : <><SecondaryButton label="Annuler" onPress={() => setModalVisible(false)} /><PrimaryButton label="Enregistrer le compteur" onPress={() => void save()} /></>}</View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </PageContainer>
  );
}

function TypeButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.typeButton, active && styles.typeButtonActive]}><Text style={[styles.typeButtonText, active && styles.typeButtonTextActive]}>{label}</Text></Pressable>; }
function formatNumber(value: unknown) { if (value === null || value === undefined || value === '') return '—'; const n = Number(value); return Number.isFinite(n) ? n.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : String(value); }
function formatDate(value: unknown) { if (!value) return '—'; const s = String(value).slice(0, 10); const d = new Date(`${s}T00:00:00`); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR'); }

const styles = StyleSheet.create({ total: { color: COLORS.blue, fontWeight: '900', fontSize: 11 }, search: { minHeight: 46, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.field, borderRadius: 9, paddingHorizontal: 12, color: COLORS.text, fontSize: 12 }, expanded: { borderTopWidth: 1, borderColor: COLORS.border, paddingTop: 7, marginTop: 5 }, expandHint: { color: COLORS.blue, fontSize: 9, fontWeight: '800', marginTop: 4 }, modalBackdrop: { flex: 1, backgroundColor: 'rgba(10,53,102,0.58)', justifyContent: 'center', padding: 12 }, modalCard: { maxHeight: '92%', backgroundColor: COLORS.surface, borderRadius: 14, padding: 15, borderWidth: 1, borderColor: COLORS.border }, modalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 }, modalTitle: { color: COLORS.navy, fontWeight: '900', fontSize: 18 }, modalSubtitle: { color: COLORS.muted, fontSize: 10, marginTop: 4 }, close: { color: COLORS.muted, fontSize: 22, paddingHorizontal: 6 }, formLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '900', marginBottom: 7 }, typeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 }, typeButton: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, alignItems: 'center' }, typeButtonActive: { borderColor: COLORS.blue, backgroundColor: COLORS.blueLight }, typeButtonText: { color: COLORS.muted, fontWeight: '800', fontSize: 11 }, typeButtonTextActive: { color: COLORS.blue }, abonneList: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, overflow: 'hidden', marginBottom: 10 }, abonneOption: { padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border }, abonneSelected: { backgroundColor: COLORS.blueLight }, abonneOptionText: { color: COLORS.text, fontSize: 10, flex: 1 }, check: { color: COLORS.success, fontWeight: '900' }, helper: { color: COLORS.muted, padding: 10, fontSize: 10 }, formError: { color: COLORS.danger, fontSize: 11, marginBottom: 10 }, modalActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingVertical: 8 },
});
