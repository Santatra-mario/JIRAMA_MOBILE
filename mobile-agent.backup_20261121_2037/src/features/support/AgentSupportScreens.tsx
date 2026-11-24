import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { changeAgentPassword, fetchAgentArchivedNotifications, fetchAgentAuditLogs, fetchAgentSettings, saveAgentPreferences, saveAgentProfile } from '../../api/agentService';
import { DataCard, EmptyBlock, ErrorBlock, FieldRow, FilterRow, FormField, LoadingBlock, PageContainer, PageHeading, PrimaryButton, SecondaryButton, StatusBadge } from '../../components/AgentUI';
import { useAuth } from '../../auth/AuthContext';
import { COLORS } from '../../theme/colors';

export function JournalAuditScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async (refresh = false) => { setError(''); if (refresh) setRefreshing(true); else setLoading(true); try { setLogs(await fetchAgentAuditLogs()); } catch (err: any) { setError(err?.message || 'Impossible de charger le journal.'); } finally { setLoading(false); setRefreshing(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => { const q = search.trim().toLowerCase(); return logs.filter((item) => [item.action, item.resource_type, item.resource_id, item.result, detailsToText(item.details)].join(' ').toLowerCase().includes(q)); }, [logs, search]);
  if (loading && !logs.length) return <LoadingBlock label="Chargement du journal d’activité…" />;
  return <PageContainer refreshing={refreshing} onRefresh={() => void load(true)}>
    <PageHeading eyebrow="Traçabilité" title="Journal d’activité" subtitle="Historique des opérations enregistrées pour votre compte Agent." />
    {!!error && <ErrorBlock message={error} onRetry={() => void load(true)} />}
    <View style={styles.statsRow}><View style={styles.statBox}><Text style={styles.statValue}>{logs.length}</Text><Text style={styles.statLabel}>Événements chargés</Text></View><View style={styles.statBox}><Text style={styles.statValue}>{new Set(logs.map((x) => x.action)).size}</Text><Text style={styles.statLabel}>Types d’actions</Text></View></View>
    <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher une action ou une ressource…" placeholderTextColor={COLORS.subtle} style={styles.input} />
    {filtered.length === 0 ? <EmptyBlock title="Aucun événement" message="Aucune entrée du journal ne correspond à votre recherche." /> : filtered.map((log, index) => <DataCard key={`${log.source || 'log'}-${log.id || index}`} title={String(log.action || 'ACTION').replace(/_/g, ' ')} subtitle={formatDate(log.created_at)} badge={log.result || 'SUCCES'}>
      <FieldRow label="Ressource" value={`${log.resource_type || '—'}${log.resource_id ? ` · ${log.resource_id}` : ''}`} />
      <FieldRow label="Résultat" value={log.result || 'SUCCES'} />
      {!!detailsToText(log.details) && <Text style={styles.details}>{detailsToText(log.details)}</Text>}
    </DataCard>)}
  </PageContainer>;
}

export function AideScreen() {
  const sections = [
    { title: 'Votre espace Agent', body: 'Le tableau de bord présente les indicateurs de suivi disponibles sur le serveur. Les rubriques Compteurs, Abonnés, Relevés, Mes contrôles et Anomalies permettent de consulter les données autorisées pour votre compte.' },
    { title: 'Réaliser un relevé', body: 'Ouvrez une mission affectée ou choisissez un compteur disponible. Vérifiez le numéro du compteur et l’ancien index affiché en lecture seule. Saisissez uniquement le nouvel index réellement observé, puis ajoutez une observation si nécessaire. Le serveur calcule la consommation et contrôle la cohérence.' },
    { title: 'Anomalies et contrôles', body: 'Une variation ou une valeur inhabituelle constitue un signal à vérifier. Elle ne prouve pas automatiquement une fraude ni un compteur bloqué. Décrivez les faits constatés sans modifier l’historique.' },
    { title: 'Connexion et synchronisation', body: 'Le téléphone doit joindre l’API Express du projet sur le réseau local ou l’adresse de déploiement configurée. Une opération n’est considérée comme enregistrée qu’après confirmation du serveur. En cas d’erreur réseau, réessayez lorsque la connexion est rétablie.' },
    { title: 'Sécurité', body: 'Ne partagez pas votre mot de passe ni votre session. L’application affiche uniquement les données et les actions accordées au rôle AGENT.' },
  ];
  const [expanded, setExpanded] = useState(0);
  return <PageContainer>
    <PageHeading eyebrow="Centre d’assistance" title="Aide" subtitle="Guide d’utilisation de l’espace Agent JIRAMA." />
    <View style={styles.helpBanner}><Text style={styles.helpEyebrow}>JIRAMA · ESPACE AGENT</Text><Text style={styles.helpTitle}>Comment utiliser votre espace ?</Text><Text style={styles.helpBody}>Consultez les rubriques et les consignes ci-dessous pour réaliser les opérations autorisées.</Text></View>
    {sections.map((section, index) => <View key={section.title} style={styles.helpCard}><Pressable onPress={() => setExpanded(expanded === index ? -1 : index)} style={styles.helpToggle}><Text style={styles.helpSectionTitle}>{section.title}</Text><Text style={styles.helpPlus}>{expanded === index ? '−' : '+'}</Text></Pressable>{expanded === index && <Text style={styles.helpText}>{section.body}</Text>}</View>)}
  </PageContainer>;
}

export function SettingsScreen() {
  const { user } = useAuth();
  const [section, setSection] = useState('profil');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState({ nom: user?.nom || '', prenom: user?.prenom || '', email: user?.email || '' });
  const [preferences, setPreferences] = useState<any>({ theme: 'system', compactMode: false, reduceMotion: false, notifications: { anomalies: true, releves: true, decisions: true } });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [archives, setArchives] = useState<any[]>([]);
  const [archiveError, setArchiveError] = useState('');

  const load = useCallback(async () => {
    setError(''); setLoading(true);
    try {
      const data = await fetchAgentSettings();
      if (data?.status !== 'success') throw new Error(data?.message || 'Réponse invalide des paramètres.');
      setProfile({ nom: data.profile?.nom || '', prenom: data.profile?.prenom || '', email: data.profile?.email || '' });
      setPreferences((current: any) => ({ ...current, ...(data.settings || {}), notifications: { ...current.notifications, ...(data.settings?.notifications || {}) } }));
    } catch (err: any) { setError(err?.message || 'Impossible de charger les paramètres.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const loadArchives = async () => {
    setArchiveError('');
    try { setArchives(await fetchAgentArchivedNotifications()); }
    catch (err: any) { setArchiveError(err?.message || 'La consultation des archives n’est pas disponible sur cette version du serveur.'); }
  };
  useEffect(() => { if (section === 'archives') void loadArchives(); }, [section]);

  const runSave = async (action: () => Promise<any>, message: string) => {
    setSaving(true); setError(''); setSuccess('');
    try { const response = await action(); if (response?.status !== 'success') throw new Error(response?.message || 'Le serveur n’a pas confirmé la modification.'); setSuccess(response.message || message); }
    catch (err: any) { setError(err?.message || 'Impossible d’enregistrer la modification.'); }
    finally { setSaving(false); }
  };

  return <PageContainer>
    <PageHeading eyebrow="Préférences du compte" title="Paramètres" subtitle="Paramètres personnels gérés par le service existant." />
    <FilterRow value={section} onChange={setSection} items={[{ value: 'profil', label: 'Mon profil' }, { value: 'securite', label: 'Sécurité' }, { value: 'apparence', label: 'Apparence' }, { value: 'notifications', label: 'Notifications' }, { value: 'archives', label: 'Archives' }]} />
    {loading ? <LoadingBlock label="Chargement des paramètres…" /> : <>
      {!!error && <ErrorBlock message={error} />}
      {!!success && <View style={styles.successBox}><Text style={styles.successText}>{success}</Text></View>}
      {section === 'profil' && <View style={styles.formPanel}>
        <FormField label="Prénom" value={profile.prenom} onChangeText={(v) => setProfile((p) => ({ ...p, prenom: v }))} />
        <FormField label="Nom" value={profile.nom} onChangeText={(v) => setProfile((p) => ({ ...p, nom: v }))} />
        <FormField label="Adresse e-mail" value={profile.email} onChangeText={(v) => setProfile((p) => ({ ...p, email: v }))} keyboardType="email-address" />
        <Text style={styles.helper}>Identifiant : {user?.identifiant || '—'} · Rôle : AGENT</Text>
        <PrimaryButton label={saving ? 'Enregistrement…' : 'Enregistrer le profil'} onPress={() => void runSave(() => saveAgentProfile(profile), 'Profil enregistré.')} disabled={saving} />
      </View>}
      {section === 'securite' && <View style={styles.formPanel}>
        <FormField label="Mot de passe actuel" value={password.currentPassword} onChangeText={(v) => setPassword((p) => ({ ...p, currentPassword: v }))} secureTextEntry />
        <FormField label="Nouveau mot de passe" value={password.newPassword} onChangeText={(v) => setPassword((p) => ({ ...p, newPassword: v }))} secureTextEntry />
        <FormField label="Confirmer le nouveau mot de passe" value={password.confirmPassword} onChangeText={(v) => setPassword((p) => ({ ...p, confirmPassword: v }))} secureTextEntry />
        <Text style={styles.helper}>Le serveur impose au minimum huit caractères et vérifie le mot de passe actuel.</Text>
        <PrimaryButton label={saving ? 'Modification…' : 'Modifier le mot de passe'} onPress={() => void runSave(() => changeAgentPassword(password), 'Mot de passe modifié.')} disabled={saving} />
      </View>}
      {section === 'apparence' && <View style={styles.formPanel}>
        <Text style={styles.settingTitle}>Thème de l’espace</Text>
        {(['clair', 'sombre', 'system'] as const).map((value) => <Choice key={value} label={value === 'clair' ? 'Clair' : value === 'sombre' ? 'Sombre' : 'Automatique'} selected={preferences.theme === value} onPress={() => setPreferences((p: any) => ({ ...p, theme: value }))} />)}
        <SwitchRow label="Affichage compact" value={!!preferences.compactMode} onChange={(v) => setPreferences((p: any) => ({ ...p, compactMode: v }))} />
        <SwitchRow label="Réduire les animations" value={!!preferences.reduceMotion} onChange={(v) => setPreferences((p: any) => ({ ...p, reduceMotion: v }))} />
        <PrimaryButton label={saving ? 'Enregistrement…' : 'Enregistrer les préférences'} onPress={() => void runSave(() => saveAgentPreferences(preferences), 'Préférences enregistrées.')} disabled={saving} />
      </View>}
      {section === 'notifications' && <View style={styles.formPanel}>
        <Text style={styles.helper}>Les alertes métier obligatoires restent soumises aux règles de l’application.</Text>
        <SwitchRow label="Alertes d’anomalie" value={preferences.notifications?.anomalies !== false} onChange={(v) => setPreferences((p: any) => ({ ...p, notifications: { ...p.notifications, anomalies: v } }))} />
        <SwitchRow label="Informations sur les relevés" value={preferences.notifications?.releves !== false} onChange={(v) => setPreferences((p: any) => ({ ...p, notifications: { ...p.notifications, releves: v } }))} />
        <SwitchRow label="Retours de traitement" value={preferences.notifications?.decisions !== false} onChange={(v) => setPreferences((p: any) => ({ ...p, notifications: { ...p.notifications, decisions: v } }))} />
        <PrimaryButton label={saving ? 'Enregistrement…' : 'Enregistrer les préférences'} onPress={() => void runSave(() => saveAgentPreferences(preferences), 'Préférences enregistrées.')} disabled={saving} />
      </View>}
      {section === 'archives' && <View style={styles.formPanel}>
        {!!archiveError && <ErrorBlock message={archiveError} onRetry={() => void loadArchives()} />}
        {archives.length === 0 ? <EmptyBlock title="Aucune notification archivée" message="Aucune notification archivée n’a été retournée par le serveur." /> : archives.map((item, index) => <DataCard key={item.id || index} title={item.sujet || 'Notification'} subtitle={formatDate(item.created_at || item.date_envoi)} badge="ARCHIVEE"><Text style={styles.archiveMessage}>{item.message || 'Aucun message.'}</Text></DataCard>)}
      </View>}
    </>}
  </PageContainer>;
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.choice}><Text style={[styles.radio, selected && styles.radioActive]}>{selected ? '●' : '○'}</Text><Text style={styles.choiceText}>{label}</Text></Pressable>; }
function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) { return <Pressable onPress={() => onChange(!value)} style={styles.switchRow}><Text style={styles.switchLabel}>{label}</Text><View style={[styles.switchTrack, value && styles.switchOn]}><View style={[styles.switchThumb, value && styles.switchThumbOn]} /></View></Pressable>; }
function detailsToText(value: any) { if (!value) return ''; if (typeof value === 'string') return value; try { return JSON.stringify(value); } catch { return String(value); } }
function formatDate(value: unknown) { if (!value) return '—'; const d = new Date(String(value)); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('fr-FR'); }
const styles = StyleSheet.create({ statsRow: { flexDirection: 'row', gap: 9 }, statBox: { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 13 }, statValue: { color: COLORS.navy, fontSize: 24, fontWeight: '900' }, statLabel: { color: COLORS.muted, fontSize: 9, marginTop: 4 }, input: { minHeight: 45, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.field, borderRadius: 9, paddingHorizontal: 12, color: COLORS.text, fontSize: 12 }, details: { color: COLORS.muted, backgroundColor: COLORS.field, padding: 9, borderRadius: 8, fontSize: 10, lineHeight: 16 }, helpBanner: { backgroundColor: COLORS.navy, borderRadius: 13, padding: 17 }, helpEyebrow: { color: '#B9D4E8', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, helpTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 8 }, helpBody: { color: '#DBE8F4', fontSize: 11, lineHeight: 17, marginTop: 6 }, helpCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, padding: 13 }, helpToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, helpSectionTitle: { color: COLORS.navy, fontSize: 12, fontWeight: '900', flex: 1 }, helpPlus: { color: COLORS.blue, fontWeight: '900', fontSize: 18 }, helpText: { color: COLORS.muted, fontSize: 11, lineHeight: 18, marginTop: 10 }, formPanel: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 13 }, helper: { color: COLORS.muted, fontSize: 10, lineHeight: 16, marginBottom: 12 }, successBox: { backgroundColor: COLORS.successBg, padding: 11, borderRadius: 9 }, successText: { color: COLORS.success, fontSize: 11, fontWeight: '800' }, settingTitle: { color: COLORS.navy, fontWeight: '900', fontSize: 13, marginBottom: 8 }, choice: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 10 }, radio: { color: COLORS.subtle, fontSize: 17, fontWeight: '900' }, radioActive: { color: COLORS.blue }, choiceText: { color: COLORS.text, fontSize: 11, fontWeight: '700' }, switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border }, switchLabel: { color: COLORS.text, fontSize: 11, fontWeight: '700', flex: 1 }, switchTrack: { width: 42, height: 24, borderRadius: 14, backgroundColor: COLORS.borderStrong, justifyContent: 'center', paddingHorizontal: 3 }, switchOn: { backgroundColor: COLORS.blue }, switchThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.white }, switchThumbOn: { alignSelf: 'flex-end' }, archiveMessage: { color: COLORS.muted, fontSize: 10, lineHeight: 16 } });
