import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createAgentReleve, localDateString } from '../../api/agentService';
import type { AgentCompteur, AgentMission } from '../../types/agent';
import { COLORS } from '../../theme/colors';

export default function ReleveFormScreen({ mission, compteur, onBack, onSaved }: {
  mission?: AgentMission | null;
  compteur?: AgentCompteur | null;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [newIndex, setNewIndex] = useState('');
  const [observation, setObservation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const counterId = Number(mission?.compteur_id ?? compteur?.id ?? 0);
  const previousIndex = mission?.dernier_index ?? compteur?.dernier_index ?? null;
  const counterNumber = mission?.numero_compteur ?? compteur?.numero_compteur ?? '—';
  const counterType = mission?.type_compteur ?? compteur?.type ?? 'Type non précisé';
  const previousDate = mission?.dernier_releve ?? compteur?.dernier_releve ?? null;
  const unit = counterType === 'EAU' ? 'm³' : 'kWh';

  const submit = async () => {
    setError(''); setSuccess('');
    if (!counterId) { setError('Aucun compteur valide n’est associé à cette saisie.'); return; }
    if (!newIndex.trim()) { setError('Saisissez le nouvel index observé.'); return; }
    const normalized = newIndex.trim().replace(',', '.');
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 0) { setError('Le nouvel index doit être un nombre positif ou nul.'); return; }
    if (previousIndex !== null && previousIndex !== undefined && value < Number(previousIndex)) {
      setError('Le nouvel index est inférieur au dernier index enregistré. Vérifiez la valeur sur le compteur ou signalez la situation ; ne modifiez pas l’ancien index.'); return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const response = await createAgentReleve({
        ...(mission ? { mission_id: Number(mission.id), date_visite_reelle: localDateString() } : {}),
        compteur_id: counterId,
        nouvel_index: value,
        observation: observation.trim() || null,
      });
      if (response?.status !== 'success') throw new Error(response?.message || 'Le serveur n’a pas confirmé le relevé.');
      setSuccess(response.message || 'Relevé enregistré par le serveur.');
    } catch (err: any) {
      setError(err?.message || 'Impossible de transmettre le relevé.');
    } finally { setSaving(false); }
  };

  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} style={styles.back}><Text style={styles.backText}>← Retour</Text></Pressable>
      <Text style={styles.title}>Saisie du nouvel index</Text>
      <Text style={styles.subtitle}>Renseignez uniquement la valeur réellement observée sur le compteur. L’ancien index est fourni par le Backend et reste en lecture seule.</Text>
      <View style={styles.meterCard}>
        <Text style={styles.label}>COMPTEUR</Text><Text style={styles.meterNumber}>{counterNumber}</Text><Text style={styles.meterType}>{counterType} · {unit}</Text>
        <View style={styles.divider} />
        <Text style={styles.label}>DERNIER INDEX DE RÉFÉRENCE · LECTURE SEULE</Text>
        <Text style={styles.previous}>{previousIndex ?? 'Aucun — premier relevé'}</Text>
        <Text style={styles.previousDate}>{previousDate || 'Aucun relevé antérieur'}</Text>
        {mission ? <Text style={styles.previousDate}>Mission #{mission.id} · Date prévue : {mission.date_prevue || '—'}</Text> : null}
      </View>
      <View style={styles.formCard}>
        <Text style={styles.label}>NOUVEL INDEX OBSERVÉ *</Text>
        <TextInput value={newIndex} onChangeText={(v) => { setNewIndex(v.replace(/[^0-9.,]/g, '')); setError(''); setSuccess(''); }} keyboardType="decimal-pad" placeholder="Ex. 1278" placeholderTextColor={COLORS.subtle} style={styles.indexInput} editable={!saving && !success} />
        <Text style={styles.hint}>La consommation et la cohérence avec l’historique sont contrôlées par le Backend. Pour un compteur sans historique, le premier relevé est traité comme initial.</Text>
        <Text style={[styles.label, { marginTop: 18 }]}>OBSERVATION (FACULTATIVE)</Text>
        <TextInput value={observation} onChangeText={setObservation} placeholder="Ex. compteur accessible, cadran lisible…" placeholderTextColor={COLORS.subtle} multiline style={styles.observation} editable={!saving && !success} />
      </View>
      {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
      {!!success && <View style={styles.successBox}><Text style={styles.successText}>{success}</Text><Text style={styles.successHint}>Le serveur a confirmé l’enregistrement. La donnée affichée provient de la réponse du Backend.</Text></View>}
      {!success ? <Pressable disabled={saving} onPress={() => void submit()} style={[styles.submit, saving && { opacity: 0.6 }]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Enregistrer le relevé</Text>}</Pressable> : <Pressable onPress={onSaved} style={styles.submit}><Text style={styles.submitText}>Revenir à la page précédente</Text></Pressable>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ flex: { flex: 1 }, screen: { flex: 1 }, content: { padding: 16, paddingBottom: 35 }, back: { paddingVertical: 8 }, backText: { color: COLORS.blue, fontSize: 12, fontWeight: '900' }, title: { color: COLORS.navy, fontSize: 23, fontWeight: '900', marginTop: 7 }, subtitle: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 15 }, meterCard: { backgroundColor: COLORS.navy, borderRadius: 13, padding: 17 }, label: { color: '#B9D4E8', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 }, meterNumber: { color: '#FFFFFF', fontSize: 25, fontWeight: '900', marginTop: 6 }, meterType: { color: '#C9E3ED', fontSize: 11, marginTop: 3 }, divider: { height: 1, backgroundColor: '#31566F', marginVertical: 15 }, previous: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 7 }, previousDate: { color: '#C9E3ED', fontSize: 10, marginTop: 4 }, formCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, padding: 16, marginTop: 13 }, indexInput: { height: 68, borderWidth: 2, borderColor: COLORS.blue, borderRadius: 10, marginTop: 9, paddingHorizontal: 16, fontSize: 29, fontWeight: '900', color: COLORS.navy, textAlign: 'center', backgroundColor: '#F8FCFE' }, hint: { color: COLORS.muted, fontSize: 10, lineHeight: 16, marginTop: 7 }, observation: { minHeight: 85, borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, padding: 11, color: COLORS.text, textAlignVertical: 'top', marginTop: 8 }, errorBox: { marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: COLORS.dangerBg }, errorText: { color: COLORS.danger, fontSize: 12, lineHeight: 18, fontWeight: '700' }, successBox: { marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: COLORS.successBg }, successText: { color: COLORS.success, fontSize: 13, fontWeight: '900' }, successHint: { color: COLORS.text, fontSize: 11, marginTop: 5 }, submit: { backgroundColor: COLORS.blue, minHeight: 51, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 15 }, submitText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' } });
