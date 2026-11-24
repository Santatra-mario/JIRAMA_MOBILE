import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { fetchAgentCompteurs, fetchAgentReleves, updateAgentReleve } from '../../api/agentService';
import { DataCard, EmptyBlock, ErrorBlock, FieldRow, FilterRow, FormField, LoadingBlock, PageContainer, PageHeading, Panel, PrimaryButton, SecondaryButton } from '../../components/AgentUI';
import { useAuth } from '../../auth/AuthContext';
import type { AgentCompteur, AgentReleve } from '../../types/agent';
import { COLORS } from '../../theme/colors';

type TypeFilter = 'TOUS' | 'EAU' | 'ELECTRICITE';
type EditForm = { id: number; type_releve: string; date_releve: string; date_ancien_releve: string; ancien_index: string; nouvel_index: string; observation: string };

export default function RelevesScreen({ onCreate }: { onCreate: (compteur: AgentCompteur) => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<AgentReleve[]>([]);
  const [compteurs, setCompteurs] = useState<AgentCompteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('TOUS');
  const [showCounterPicker, setShowCounterPicker] = useState(false);
  const [counterSearch, setCounterSearch] = useState('');
  const [editItem, setEditItem] = useState<EditForm | null>(null);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [pdfBusyId, setPdfBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async (refresh = false) => {
    setError(''); if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const [readings, meters] = await Promise.all([fetchAgentReleves(), fetchAgentCompteurs()]);
      setItems(readings); setCompteurs(meters);
    } catch (err: any) { setError(err?.message || 'Impossible de charger les relevés.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => items.filter((item) => {
    const q = search.trim().toLowerCase();
    const text = [item.numero_compteur, item.numero_abonne, item.abonne_nom, item.abonne_prenom, item.type_releve, item.observation, String(item.id)].join(' ').toLowerCase();
    return (!q || text.includes(q)) && (typeFilter === 'TOUS' || String(item.type_compteur).toUpperCase() === typeFilter);
  }), [items, search, typeFilter]);
  const filteredCounters = compteurs.filter((item) => [item.numero_compteur, item.numero_abonne, item.abonne_nom, item.abonne_prenom].join(' ').toLowerCase().includes(counterSearch.toLowerCase()));

  const beginEdit = (item: AgentReleve) => {
    setEditError('');
    setEditItem({
      id: item.id,
      type_releve: String(item.type_releve || '').toUpperCase(),
      date_releve: toInputDate(item.date_releve),
      date_ancien_releve: toInputDate(item.date_ancien_releve),
      ancien_index: item.ancien_index === null || item.ancien_index === undefined ? '' : String(item.ancien_index),
      nouvel_index: String(item.nouvel_index ?? ''),
      observation: item.observation || '',
    });
  };

  const saveCorrection = async () => {
    if (!editItem || editSaving) return;
    setEditError('');
    const newIndex = Number(editItem.nouvel_index.trim().replace(',', '.'));
    if (!editItem.nouvel_index.trim() || !Number.isFinite(newIndex) || newIndex < 0) { setEditError('Le nouvel index doit être un nombre positif ou nul.'); return; }
    if (!isValidDate(editItem.date_releve)) { setEditError('La date du relevé enregistré est invalide.'); return; }
    if (editItem.type_releve !== 'INITIAL') {
      if (!isValidDate(editItem.date_ancien_releve)) { setEditError('La date du relevé précédent est obligatoire et doit être valide.'); return; }
      if (editItem.date_ancien_releve >= editItem.date_releve) { setEditError('La date précédente doit être antérieure à la date du relevé actuel.'); return; }
      if (editItem.ancien_index !== '' && newIndex < Number(editItem.ancien_index)) { setEditError('Le nouvel index ne peut pas être inférieur à l’ancien index enregistré.'); return; }
    }
    setEditSaving(true);
    try {
      await updateAgentReleve(editItem.id, {
        date_releve: editItem.date_releve,
        ...(editItem.type_releve !== 'INITIAL' ? { date_ancien_releve: editItem.date_ancien_releve } : {}),
        nouvel_index: newIndex,
        observation: editItem.observation.trim() || null,
      });
      setEditItem(null);
      setNotice('Correction enregistrée par le serveur.');
      await load(true);
    } catch (err: any) { setEditError(err?.message || 'Le serveur a refusé la correction du relevé.'); }
    finally { setEditSaving(false); }
  };

  const exportPdf = async (item: AgentReleve) => {
    setPdfBusyId(item.id); setError('');
    try {
      // Ces modules Expo sont installés avec `npx expo install expo-print expo-sharing`.
      // @ts-ignore - dépendance Expo ajoutée à l'installation décrite dans le README mobile.
      const Print = await import('expo-print');
      // @ts-ignore - dépendance Expo ajoutée à l'installation décrite dans le README mobile.
      const Sharing = await import('expo-sharing');
      const unit = item.unite || (String(item.type_compteur).toUpperCase() === 'EAU' ? 'm³' : 'kWh');
      const subscriber = `${item.abonne_prenom || ''} ${item.abonne_nom || ''}`.trim() || 'Non renseigné';
      const html = buildReleveHtml({ ...item, subscriber, unit });
      const file = await Print.printToFileAsync({ html, base64: false });
      const shareAvailable = await Sharing.isAvailableAsync();
      if (shareAvailable) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: `Relevé JIRAMA REL-${item.id}` });
      } else {
        await Print.printAsync({ html });
      }
    } catch (err: any) {
      setError(err?.message || 'Impossible de générer ou partager le PDF du relevé.');
    } finally { setPdfBusyId(null); }
  };

  if (loading && !items.length) return <LoadingBlock label="Chargement des relevés…" />;
  return (
    <PageContainer refreshing={refreshing} onRefresh={() => void load(true)}>
      <PageHeading eyebrow="Saisie et historique des index" title="Relevés" subtitle="Historique des relevés enregistrés et accès à la saisie d’un index physique." right={<Text style={styles.total}>{visible.length} / {items.length}</Text>} />
      {!!error && <ErrorBlock message={error} onRetry={() => void load(true)} />}
      {!!notice && <View style={styles.notice}><Text style={styles.noticeText}>{notice}</Text><Pressable onPress={() => setNotice('')}><Text style={styles.noticeClose}>✕</Text></Pressable></View>}
      <PrimaryButton label="＋ Saisir un nouvel index" onPress={() => setShowCounterPicker((value) => !value)} />
      {showCounterPicker && <Panel title="Choisir le compteur à relever">
        <TextInput value={counterSearch} onChangeText={setCounterSearch} placeholder="Rechercher un compteur ou un abonné…" placeholderTextColor={COLORS.subtle} style={styles.search} />
        {filteredCounters.slice(0, 30).map((counter) => <Pressable key={counter.id} onPress={() => { setShowCounterPicker(false); setCounterSearch(''); onCreate(counter); }} style={styles.counterOption}><View style={{ flex: 1 }}><Text style={styles.counterName}>{counter.numero_compteur}</Text><Text style={styles.counterSub}>{counter.numero_abonne || '—'} · {[counter.abonne_prenom, counter.abonne_nom].filter(Boolean).join(' ')}</Text></View><Text style={styles.arrow}>Ouvrir →</Text></Pressable>)}
        {filteredCounters.length === 0 && <Text style={styles.emptyText}>Aucun compteur correspondant.</Text>}
      </Panel>}
      <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher compteur, abonné, observation…" placeholderTextColor={COLORS.subtle} style={styles.search} />
      <FilterRow value={typeFilter} onChange={(value) => setTypeFilter(value as TypeFilter)} items={[{ value: 'TOUS', label: 'Tous les types' }, { value: 'EAU', label: 'Eau' }, { value: 'ELECTRICITE', label: 'Électricité' }]} />
      {visible.length === 0 ? <EmptyBlock title="Aucun relevé" message="Aucun relevé ne correspond à la recherche ou aux filtres." /> : visible.map((item) => {
        const canEdit = Number(item.created_by) === Number(user?.id);
        return (
          <DataCard key={item.id} title={`Compteur ${item.numero_compteur || '—'}`} subtitle={`${[item.abonne_prenom, item.abonne_nom].filter(Boolean).join(' ') || 'Abonné'} · ${item.numero_abonne || '—'}`} badge={item.type_releve || 'RELEVE'}>
            <FieldRow label="Date du relevé" value={formatDate(item.date_releve)} />
            <FieldRow label="Date de référence" value={formatDate(item.date_ancien_releve)} />
            <FieldRow label="Ancien index" value={formatNumber(item.ancien_index)} />
            <FieldRow label="Nouvel index" value={formatNumber(item.nouvel_index)} />
            <FieldRow label="Consommation" value={item.type_releve === 'INITIAL' || item.consommation === null || item.consommation === undefined ? 'Non calculée' : `${formatNumber(item.consommation)} ${item.unite || ''}`} />
            {!!item.observation && <FieldRow label="Observation" value={item.observation} />}
            <Text style={styles.readOnly}>Historique consultatif · source : PostgreSQL</Text>
            <View style={styles.actionRow}>
              <SecondaryButton label={pdfBusyId === item.id ? 'Préparation du PDF…' : 'PDF / Relevé'} onPress={() => void exportPdf(item)} disabled={pdfBusyId !== null} />
              {canEdit && <PrimaryButton compact label="Corriger" onPress={() => beginEdit(item)} />}
            </View>
          </DataCard>
        );
      })}

      <Modal visible={!!editItem} animationType="slide" transparent onRequestClose={() => !editSaving && setEditItem(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}><View style={{ flex: 1 }}><Text style={styles.modalTitle}>Corriger le relevé #{editItem?.id}</Text><Text style={styles.modalSub}>Seul un relevé créé par votre compte peut être corrigé.</Text></View><Pressable disabled={editSaving} onPress={() => setEditItem(null)}><Text style={styles.close}>✕</Text></Pressable></View>
            {editItem && <>
              <Text style={styles.readOnlyNote}>Date du relevé conservée : {editItem.date_releve || '—'}</Text>
              {editItem.type_releve !== 'INITIAL' && <FormField label="Date du relevé précédent (AAAA-MM-JJ) *" value={editItem.date_ancien_releve} onChangeText={(value) => setEditItem((current) => current ? { ...current, date_ancien_releve: value } : current)} placeholder="2026-10-01" />}
              <FieldRow label="Ancien index · lecture seule" value={editItem.ancien_index || '—'} />
              <FormField label="Nouvel index corrigé *" value={editItem.nouvel_index} onChangeText={(value) => setEditItem((current) => current ? { ...current, nouvel_index: value.replace(/[^0-9.,]/g, '') } : current)} keyboardType="numeric" />
              <FormField label="Observation" value={editItem.observation} onChangeText={(value) => setEditItem((current) => current ? { ...current, observation: value } : current)} multiline />
              {!!editError && <ErrorBlock message={editError} />}
              <Text style={styles.readOnlyNote}>L’index de référence est conservé par le Backend. La consommation est recalculée selon l’historique du compteur.</Text>
              <View style={styles.modalActions}><SecondaryButton label="Annuler" onPress={() => setEditItem(null)} disabled={editSaving} /><PrimaryButton label={editSaving ? 'Enregistrement…' : 'Enregistrer la correction'} onPress={() => void saveCorrection()} disabled={editSaving} /></View>
              {editSaving && <ActivityIndicator color={COLORS.blue} />}
            </>}
          </View>
        </View>
      </Modal>
    </PageContainer>
  );
}

function buildReleveHtml(item: AgentReleve & { subscriber: string; unit: string }): string {
  const escapeMap: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const safe = (value: unknown) => String(value ?? '—').replace(/[&<>"']/g, (char) => escapeMap[char] || char);
  const initial = String(item.type_releve).toUpperCase() === 'INITIAL';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
    body{font-family:Arial,sans-serif;color:#172536;padding:28px} .brand{font-size:22px;font-weight:800;color:#0A3566;letter-spacing:1px} .sub{font-size:10px;color:#53657B;letter-spacing:1px;margin-top:3px} hr{border:0;border-top:2px solid #0F5FA8;margin:20px 0} h1{font-size:18px;color:#0A3566} .note{font-size:10px;color:#53657B} .grid{display:flex;gap:12px;margin:18px 0}.box{flex:1;border:1px solid #D5DEEA;border-radius:8px;padding:12px;background:#F8FAFC}.label{font-size:9px;color:#53657B;text-transform:uppercase;font-weight:700}.value{font-size:15px;font-weight:800;margin-top:6px}.index{font-size:27px;color:#0F5FA8;font-weight:800}table{width:100%;border-collapse:collapse;margin-top:15px}td{border-bottom:1px solid #D5DEEA;padding:10px 6px;font-size:11px}td:first-child{color:#53657B;width:42%}.foot{margin-top:30px;border-top:1px solid #D5DEEA;padding-top:10px;font-size:9px;color:#53657B}
    </style></head><body><div class="brand">JIRAMA</div><div class="sub">SUIVI DES CONSOMMATIONS · ESPACE AGENT</div><hr><h1>Relevé de compteur · REL-${safe(item.id)}</h1><p class="note">Document de consultation généré depuis l’application mobile. Ce document n’est pas une facture officielle.</p><div class="grid"><div class="box"><div class="label">Titulaire du compte</div><div class="value">${safe(item.subscriber)}</div><div class="note">Abonné n° ${safe(item.numero_abonne)}</div></div><div class="box"><div class="label">Compteur</div><div class="value">${safe(item.numero_compteur)}</div><div class="note">${safe(item.type_compteur)}</div></div></div><div class="label">Nouvel index enregistré</div><div class="index">${safe(formatNumber(item.nouvel_index))} ${safe(item.unit)}</div><table><tr><td>Date du relevé</td><td>${safe(formatDate(item.date_releve))}</td></tr><tr><td>Ancien index</td><td>${safe(formatNumber(item.ancien_index))}</td></tr><tr><td>Consommation</td><td>${initial || item.consommation == null ? 'Non calculée' : `${safe(formatNumber(item.consommation))} ${safe(item.unit)}`}</td></tr><tr><td>Type de relevé</td><td>${safe(item.type_releve)}</td></tr><tr><td>Observation</td><td>${safe(item.observation || '—')}</td></tr></table><div class="foot">Référence REL-${safe(item.id)} · Données consultées depuis le système JIRAMA. Toute correction doit être réalisée dans l’application par un utilisateur autorisé.</div></body></html>`;
}

function toInputDate(value: unknown): string { if (!value) return ''; const text = String(value); return text.length >= 10 ? text.slice(0, 10) : text; }
function isValidDate(value: string): boolean { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const date = new Date(`${value}T00:00:00`); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value; }
function formatNumber(value: unknown) { if (value === null || value === undefined || value === '') return '—'; const n = Number(value); return Number.isFinite(n) ? n.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : String(value); }
function formatDate(value: unknown) { if (!value) return '—'; const d = new Date(String(value)); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('fr-FR'); }
const styles = StyleSheet.create({
  total: { color: COLORS.blue, fontWeight: '900' }, search: { minHeight: 45, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.field, borderRadius: 9, paddingHorizontal: 12, color: COLORS.text, fontSize: 12 }, counterOption: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: COLORS.border, paddingVertical: 10, gap: 8 }, counterName: { color: COLORS.navy, fontSize: 11, fontWeight: '900' }, counterSub: { color: COLORS.muted, fontSize: 9, marginTop: 3 }, arrow: { color: COLORS.blue, fontSize: 10, fontWeight: '900' }, emptyText: { color: COLORS.muted, fontSize: 10, paddingVertical: 8 }, readOnly: { color: COLORS.subtle, fontSize: 9, fontWeight: '700', marginTop: 4 }, actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }, notice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.successBg, padding: 10, borderRadius: 8 }, noticeText: { color: COLORS.success, fontSize: 10, fontWeight: '800', flex: 1 }, noticeClose: { color: COLORS.success, fontWeight: '900', paddingHorizontal: 6 }, modalBackdrop: { flex: 1, backgroundColor: 'rgba(10,30,50,0.48)', justifyContent: 'flex-end', padding: 10 }, modalCard: { backgroundColor: COLORS.white, borderRadius: 15, padding: 15, maxHeight: '90%' }, modalHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 12 }, modalTitle: { color: COLORS.navy, fontSize: 16, fontWeight: '900' }, modalSub: { color: COLORS.muted, fontSize: 10, marginTop: 3 }, close: { color: COLORS.muted, fontSize: 20, paddingHorizontal: 5 }, readOnlyNote: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginVertical: 8 }, modalActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
