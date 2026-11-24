import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  archiveAgentNotification,
  deleteAgentNotification,
  fetchAgentNotifications,
  markAgentNotificationAsRead,
  markAllAgentNotificationsAsRead,
} from '../../api/agentService';
import { DataCard, EmptyBlock, ErrorBlock, FieldRow, FilterRow, LoadingBlock, PageContainer, PageHeading, PrimaryButton, SecondaryButton } from '../../components/AgentUI';
import type { AgentNotification } from '../../types/agent';
import { COLORS } from '../../theme/colors';

type NotificationFilter = 'TOUTES' | 'NON_LUES' | 'LUES';

export default function NotificationsScreen({ onOpenMission, onChanged }: { onOpenMission: (missionId: number) => void; onChanged?: () => void }) {
  const [items, setItems] = useState<AgentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<NotificationFilter>('TOUTES');

  const load = useCallback(async (refresh = false) => {
    setError(''); if (refresh) setRefreshing(true); else setLoading(true);
    try { const result = await fetchAgentNotifications(); setItems(result.items); }
    catch (err: any) { setError(err?.message || 'Impossible de charger les notifications.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const unread = items.filter((item) => String(item.statut).toUpperCase() === 'EN_ATTENTE').length;
  const visible = useMemo(() => items.filter((item) => {
    const q = search.trim().toLowerCase();
    const matchText = !q || [item.sujet, item.type, item.message, item.numero_compteur, item.numero_abonne, item.type_anomalie].join(' ').toLowerCase().includes(q);
    const status = String(item.statut || '').toUpperCase();
    const matchStatus = filter === 'TOUTES' || (filter === 'NON_LUES' && status === 'EN_ATTENTE') || (filter === 'LUES' && status !== 'EN_ATTENTE');
    return matchText && matchStatus;
  }), [items, search, filter]);

  const readOne = async (item: AgentNotification) => {
    if (busyId !== null || String(item.statut).toUpperCase() !== 'EN_ATTENTE') return;
    setBusyId(item.id); setError('');
    try {
      await markAgentNotificationAsRead(item.id);
      setItems((current) => current.map((n) => n.id === item.id ? { ...n, statut: 'ENVOYE' } : n));
      onChanged?.();
    } catch (err: any) { setError(err?.message || 'Impossible de marquer la notification comme lue.'); }
    finally { setBusyId(null); }
  };

  const readAll = async () => {
    if (!unread || busyId !== null) return;
    setBusyId(-1); setError('');
    try {
      await markAllAgentNotificationsAsRead();
      setItems((current) => current.map((n) => ({ ...n, statut: 'ENVOYE' })));
      onChanged?.();
    } catch (err: any) { setError(err?.message || 'Impossible de marquer toutes les notifications comme lues.'); }
    finally { setBusyId(null); }
  };

  const archiveOne = (item: AgentNotification) => {
    Alert.alert('Archiver la notification', 'Cette notification sera déplacée dans les archives.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Archiver', onPress: () => { void (async () => {
        setBusyId(item.id); setError('');
        try { await archiveAgentNotification(item.id); setItems((current) => current.filter((n) => n.id !== item.id)); onChanged?.(); }
        catch (err: any) { setError(err?.message || 'Impossible d’archiver la notification.'); }
        finally { setBusyId(null); }
      })(); } },
    ]);
  };

  const deleteOne = (item: AgentNotification) => {
    Alert.alert('Supprimer la notification', 'Cette suppression sera appliquée sur le serveur. Cette action peut être irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => { void (async () => {
        setBusyId(item.id); setError('');
        try { await deleteAgentNotification(item.id); setItems((current) => current.filter((n) => n.id !== item.id)); onChanged?.(); }
        catch (err: any) { setError(err?.message || 'Impossible de supprimer la notification.'); }
        finally { setBusyId(null); }
      })(); } },
    ]);
  };

  if (loading && !items.length) return <LoadingBlock label="Chargement des notifications…" />;
  return (
    <PageContainer refreshing={refreshing} onRefresh={() => void load(true)}>
      <PageHeading eyebrow="Consignes et alertes" title="Notifications" subtitle="Notifications adressées à votre compte Agent." right={<Text style={styles.count}>{unread} non lue(s)</Text>} />
      {!!error && <ErrorBlock message={error} onRetry={() => void load(true)} />}
      <PrimaryButton label={busyId === -1 ? 'Traitement…' : 'Marquer toutes comme lues'} onPress={() => void readAll()} disabled={unread === 0 || busyId !== null} />
      <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher une notification…" placeholderTextColor={COLORS.subtle} style={styles.search} />
      <FilterRow value={filter} onChange={(value) => setFilter(value as NotificationFilter)} items={[{ value: 'TOUTES', label: 'Toutes' }, { value: 'NON_LUES', label: 'Non lues' }, { value: 'LUES', label: 'Lues' }]} />
      {visible.length === 0 ? <EmptyBlock title="Aucune notification" message="Aucune notification ne correspond à votre recherche ou à ce filtre." /> : visible.map((item) => (
        <DataCard key={item.id} title={item.sujet || item.type || 'Notification'} subtitle={formatDate(item.created_at || item.date_envoi)} badge={item.statut}>
          <Text style={styles.message}>{item.message || 'Aucun message.'}</Text>
          {!!item.numero_compteur && <FieldRow label="Compteur" value={item.numero_compteur} />}
          {!!item.numero_abonne && <FieldRow label="Abonné" value={item.numero_abonne} />}
          {!!item.niveau && <FieldRow label="Niveau" value={item.niveau} />}
          <View style={styles.actions}>
            {String(item.statut).toUpperCase() === 'EN_ATTENTE' && <Pressable disabled={busyId !== null} onPress={() => void readOne(item)} style={styles.action}><Text style={styles.actionText}>{busyId === item.id ? '…' : 'Marquer comme lue'}</Text></Pressable>}
            {!!item.mission_id && <Pressable onPress={() => { if (String(item.statut).toUpperCase() === 'EN_ATTENTE') void readOne(item); onOpenMission(Number(item.mission_id)); }} style={styles.action}><Text style={styles.actionText}>Ouvrir la mission →</Text></Pressable>}
            <Pressable disabled={busyId !== null} onPress={() => archiveOne(item)} style={styles.action}><Text style={styles.actionText}>Archiver</Text></Pressable>
            <Pressable disabled={busyId !== null} onPress={() => deleteOne(item)} style={[styles.action, styles.deleteAction]}><Text style={[styles.actionText, styles.deleteText]}>Supprimer</Text></Pressable>
          </View>
        </DataCard>
      ))}
      {!!visible.length && <View style={styles.footer}><SecondaryButton label="Actualiser les notifications" onPress={() => void load(true)} /></View>}
    </PageContainer>
  );
}

function formatDate(value: unknown) { if (!value) return 'Date non renseignée'; const d = new Date(String(value)); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('fr-FR'); }
const styles = StyleSheet.create({ count: { color: COLORS.blue, fontWeight: '900', fontSize: 10 }, search: { minHeight: 45, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.field, borderRadius: 9, paddingHorizontal: 12, color: COLORS.text, fontSize: 12 }, message: { color: COLORS.text, fontSize: 11, lineHeight: 18 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 5 }, action: { paddingVertical: 8, paddingHorizontal: 10, backgroundColor: COLORS.blueLight, borderRadius: 8 }, actionText: { color: COLORS.blue, fontWeight: '900', fontSize: 10 }, deleteAction: { backgroundColor: COLORS.dangerBg }, deleteText: { color: COLORS.danger }, footer: { marginTop: 4 } });
