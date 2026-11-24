import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { fetchAgentMission, reportUnsuccessfulVisit, startAgentMission } from '../../api/agentService';
import { ErrorState, LoadingState } from '../../components/ScreenState';
import type { AgentMission } from '../../types/agent';
import { COLORS } from '../../theme/colors';

const VISIT_RESULTS = [
  ['ABONNE_ABSENT', 'Abonné absent'],
  ['COMPTEUR_INACCESSIBLE', 'Compteur inaccessible'],
  ['INDEX_ILLISIBLE', 'Index illisible'],
  ['COMPTEUR_A_INTERVENIR', 'Compteur à faire intervenir'],
  ['AUTRE', 'Autre situation'],
] as const;

export default function MissionDetailScreen({ missionId, onBack, onRead, onUpdated }: { missionId: number; onBack: () => void; onRead: (mission: AgentMission) => void; onUpdated: () => void }) {
  const [mission, setMission] = useState<AgentMission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [result, setResult] = useState<string>('ABONNE_ABSENT');
  const [reason, setReason] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { setMission(await fetchAgentMission(missionId)); }
    catch (err: any) { setError(err?.message || 'Mission indisponible.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [missionId]);

  const start = async () => {
    if (!mission) return;
    setSaving(true); setError('');
    try { await startAgentMission(mission.id); await load(); onUpdated(); }
    catch (err: any) { setError(err?.message || 'Impossible de démarrer la mission.'); }
    finally { setSaving(false); }
  };

  const sendReport = async () => {
    if (!mission || reason.trim().length < 3) { setError('Décrivez brièvement la situation (3 caractères minimum).'); return; }
    setSaving(true); setError('');
    try { await reportUnsuccessfulVisit(mission.id, result, reason.trim()); setReporting(false); setReason(''); await load(); onUpdated(); }
    catch (err: any) { setError(err?.message || 'Impossible de transmettre le résultat de visite.'); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingState label="Chargement du détail de mission..." />;
  if (error && !mission) return <ErrorState message={error} onRetry={load} />;
  if (!mission) return <ErrorState message="Mission introuvable." onRetry={load} />;

  const customer = [mission.abonne_prenom, mission.abonne_nom].filter(Boolean).join(' ') || 'Abonné';
  const status = String(mission.statut || '').toUpperCase();
  const open = ['PLANIFIEE', 'EN_COURS'].includes(status);

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Pressable onPress={onBack} style={styles.back}><Text style={styles.backText}>← Retour aux missions</Text></Pressable>
    <View style={styles.header}><Text style={styles.eyebrow}>MISSION #{mission.id}</Text><Text style={styles.title}>{customer}</Text><Text style={styles.sub}>Abonné {mission.numero_abonne || '—'}</Text></View>
    <Info label="Adresse" value={mission.adresse || 'Non renseignée'} />
    <Info label="Quartier / Commune" value={[mission.quartier, mission.commune].filter(Boolean).join(' · ') || 'Non renseigné'} />
    <Info label="Compteur" value={`${mission.numero_compteur || '—'} · ${mission.type_compteur || 'Type non précisé'}`} />
    <Info label="Date prévue" value={mission.date_prevue || 'Non renseignée'} />
    <Info label="Statut" value={status.replaceAll('_', ' ')} />
    <View style={styles.readingCard}><Text style={styles.readingLabel}>DERNIER INDEX DE RÉFÉRENCE</Text><Text style={styles.readingValue}>{mission.dernier_index ?? 'Premier relevé'} <Text style={styles.unit}>{mission.type_compteur === 'EAU' ? 'm³' : 'kWh'}</Text></Text><Text style={styles.readingDate}>Date : {mission.dernier_releve || 'Aucun relevé antérieur'}</Text><Text style={styles.readingHint}>Valeur fournie par le serveur · Lecture seule</Text></View>
    {!!mission.observations && <Info label="Consignes" value={mission.observations} />}
    {!!error && <Text style={styles.error}>{error}</Text>}
    {open ? <>
      {status !== 'EN_COURS' && <ActionButton title="Démarrer le contrôle" onPress={start} loading={saving} />}
      <ActionButton title="Saisir le nouvel index" onPress={() => onRead(mission)} />
      <Pressable style={styles.outlineButton} onPress={() => setReporting((v) => !v)}><Text style={styles.outlineText}>{reporting ? 'Fermer le formulaire' : 'Signaler une visite sans relevé'}</Text></Pressable>
      {reporting && <View style={styles.reportCard}><Text style={styles.reportTitle}>Résultat de la visite</Text>{VISIT_RESULTS.map(([value, label]) => <Pressable key={value} onPress={() => setResult(value)} style={styles.choice}><View style={[styles.radio, result === value && styles.radioActive]} /> <Text style={styles.choiceText}>{label}</Text></Pressable>)}<TextInput value={reason} onChangeText={setReason} placeholder="Décrivez la situation constatée..." placeholderTextColor={COLORS.muted} multiline style={styles.textarea} /><ActionButton title="Transmettre au Responsable" onPress={sendReport} loading={saving} /></View>}
    </> : <View style={styles.closed}><Text style={styles.closedText}>Cette mission n'est pas actuellement ouverte à la saisie.</Text></View>}
  </ScrollView>;
}

function Info({ label, value }: { label: string; value: string }) { return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>; }
function ActionButton({ title, onPress, loading = false }: { title: string; onPress: () => void; loading?: boolean }) { return <Pressable disabled={loading} onPress={onPress} style={[styles.primary, loading && { opacity: 0.6 }]}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{title}</Text>}</Pressable>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background }, content: { padding: 16, paddingBottom: 35 }, back: { paddingVertical: 9 }, backText: { color: COLORS.blue, fontSize: 12, fontWeight: '900' }, header: { backgroundColor: COLORS.navy, borderRadius: 18, padding: 19, marginBottom: 12 }, eyebrow: { color: '#9DDDE9', fontSize: 10, fontWeight: '900' }, title: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', marginTop: 8 }, sub: { color: '#D6E5ED', marginTop: 5, fontSize: 12 }, info: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, padding: 13, borderRadius: 12, marginBottom: 8 }, infoLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '800' }, infoValue: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginTop: 5 }, readingCard: { backgroundColor: COLORS.blueLight, borderColor: '#B9DDEB', borderWidth: 1, borderRadius: 15, padding: 16, marginVertical: 8 }, readingLabel: { color: COLORS.blue, fontWeight: '900', fontSize: 10, letterSpacing: 0.8 }, readingValue: { color: COLORS.navy, fontSize: 30, fontWeight: '900', marginTop: 9 }, unit: { fontSize: 15 }, readingDate: { color: COLORS.text, fontSize: 11, marginTop: 4 }, readingHint: { color: COLORS.muted, fontSize: 10, marginTop: 7 }, primary: { minHeight: 50, backgroundColor: COLORS.blue, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingHorizontal: 12 }, primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' }, outlineButton: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#FFFFFF', borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 10 }, outlineText: { color: COLORS.text, fontSize: 12, fontWeight: '800' }, reportCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, padding: 14, marginTop: 12 }, reportTitle: { color: COLORS.text, fontSize: 15, fontWeight: '900', marginBottom: 8 }, choice: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 10 }, radio: { width: 17, height: 17, borderRadius: 9, borderWidth: 1.5, borderColor: COLORS.muted }, radioActive: { borderWidth: 5, borderColor: COLORS.blue }, choiceText: { color: COLORS.text, fontSize: 12 }, textarea: { borderColor: COLORS.border, borderWidth: 1, borderRadius: 10, minHeight: 80, padding: 11, textAlignVertical: 'top', color: COLORS.text, marginTop: 8 }, error: { color: COLORS.danger, fontSize: 12, marginVertical: 8 }, closed: { padding: 14, backgroundColor: COLORS.warningBg, borderRadius: 12, marginTop: 12 }, closedText: { color: COLORS.warning, fontSize: 12, fontWeight: '700' },
});
