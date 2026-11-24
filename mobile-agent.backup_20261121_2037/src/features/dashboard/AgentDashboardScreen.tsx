import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { ErrorBlock, LoadingBlock, MetricCard, PageContainer, PageHeading, Panel, PrimaryButton, DataCard, FieldRow } from '../../components/AgentUI';
import { fetchAgentDashboard } from '../../api/agentService';
import type { AgentDashboardData } from '../../types/agent';
import { COLORS } from '../../theme/colors';

export type AgentPageKey = 'dashboard' | 'compteurs' | 'abonnes' | 'releves' | 'missions' | 'anomalies' | 'notifications' | 'audit' | 'aide' | 'parametres' | 'profil';

export default function AgentDashboardScreen({ onNavigate }: { onNavigate: (page: AgentPageKey) => void }) {
  const { user, offlineWarning } = useAuth();
  const [data, setData] = useState<AgentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    setError('');
    if (refresh) setRefreshing(true); else setLoading(true);
    try { setData(await fetchAgentDashboard()); }
    catch (err: any) { setError(err?.message || 'Impossible de charger le tableau de bord.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = data?.stats || {};
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const recentReadings = data?.relevesRecents || [];
  const recentAnomalies = data?.anomaliesRecentes || [];
  const totalMeters = Number(stats.compteurs || 0);
  const activeMeters = Number(stats.compteursActifs || 0);
  const activeMeterPercent = totalMeters > 0 ? Math.min(100, Math.max(0, Math.round((activeMeters / totalMeters) * 100))) : 0;

  if (loading && !data) return <LoadingBlock label="Chargement du tableau de bord Agent…" />;
  if (error && !data) return <PageContainer><ErrorBlock message={error} onRetry={() => void load()} /></PageContainer>;

  return (
    <PageContainer refreshing={refreshing} onRefresh={() => void load(true)}>
      <View style={styles.banner}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>J</Text></View>
        <View style={styles.bannerText}>
          <Text style={styles.eyebrow}>SUIVI DES CONSOMMATIONS</Text>
          <Text style={styles.bannerTitle}>Bonjour, {user?.prenom || 'Agent'}</Text>
          <Text style={styles.bannerSub}>{today.charAt(0).toUpperCase() + today.slice(1)}</Text>
          <Text style={styles.updateText}>{refreshing ? 'Actualisation en cours…' : 'Données provenant du serveur JIRAMA'}</Text>
        </View>
        <PrimaryButton compact label="Actualiser" onPress={() => void load(true)} disabled={refreshing} />
      </View>
      {!!offlineWarning && <View style={styles.warning}><Text style={styles.warningText}>{offlineWarning}</Text></View>}
      {!!error && <ErrorBlock message={error} onRetry={() => void load(true)} />}

      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Chiffres clés</Text><Text style={styles.sectionHint}>Données de l’espace Agent</Text></View>
      <View style={styles.metricGrid}>
        <MetricCard label="Compteurs actifs" value={activeMeters.toLocaleString('fr-FR')} note={`${totalMeters.toLocaleString('fr-FR')} compteurs au total`} tone="blue" />
        <MetricCard label="Abonnés actifs" value={Number(stats.abonnesActifs || 0).toLocaleString('fr-FR')} note={`${Number(stats.abonnes || 0).toLocaleString('fr-FR')} abonnés enregistrés`} tone="green" />
        <MetricCard label="Relevés du mois" value={Number(stats.relevesMois || 0).toLocaleString('fr-FR')} tone="orange" />
        <MetricCard label="Anomalies à vérifier" value={Number(stats.anomalies || 0).toLocaleString('fr-FR')} tone="red" />
        <MetricCard label="Notifications en attente" value={Number(stats.notifications || 0).toLocaleString('fr-FR')} tone="blue" />
      </View>

      <Panel title="État des compteurs">
        <View style={styles.progressHeader}>
          <Text style={styles.progressValue}>{activeMeterPercent}%</Text>
          <Text style={styles.progressCaption}>{activeMeters.toLocaleString('fr-FR')} actifs sur {totalMeters.toLocaleString('fr-FR')} compteurs</Text>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${activeMeterPercent}%` }]} /></View>
        <Text style={styles.progressFootnote}>Indicateur calculé à partir des compteurs retournés par le tableau de bord du serveur.</Text>
      </Panel>

      <View style={styles.consumptionGrid}>
        <ConsumptionCard title="Consommation d’eau" unit="m³" type="EAU" readings={recentReadings} />
        <ConsumptionCard title="Consommation d’électricité" unit="kWh" type="ELECTRICITE" readings={recentReadings} />
      </View>

      <Panel title="Accès rapide">
        <View style={styles.quickGrid}>
          <Quick label="Compteurs" symbol="◉" onPress={() => onNavigate('compteurs')} />
          <Quick label="Abonnés" symbol="♙" onPress={() => onNavigate('abonnes')} />
          <Quick label="Relevés" symbol="▤" onPress={() => onNavigate('releves')} />
          <Quick label="Mes contrôles" symbol="☑" onPress={() => onNavigate('missions')} />
          <Quick label="Anomalies" symbol="⚑" onPress={() => onNavigate('anomalies')} />
          <Quick label="Notifications" symbol="♢" onPress={() => onNavigate('notifications')} />
        </View>
      </Panel>

      <Panel title="Relevés récents" right={<Text style={styles.count}>{recentReadings.length}</Text>}>
        {recentReadings.length === 0 ? <Text style={styles.emptyHint}>Aucun relevé récent disponible.</Text> : recentReadings.slice(0, 5).map((item: any, index) => (
          <DataCard key={String(item.id ?? index)} title={`Compteur ${item.numero_compteur || '—'}`} subtitle={`${item.abonne_nom || ''} ${item.abonne_prenom || ''}`.trim()} badge={String(item.type_releve || 'RELEVE')}>
            <FieldRow label="Date" value={formatDate(item.date_releve)} />
            <FieldRow label="Nouvel index" value={formatNumber(item.nouvel_index)} />
            <FieldRow label="Consommation" value={item.consommation ?? '—'} />
          </DataCard>
        ))}
        <PrimaryButton compact label="Consulter tous les relevés" onPress={() => onNavigate('releves')} />
      </Panel>

      <Panel title="Anomalies récentes" right={<Text style={styles.count}>{recentAnomalies.length}</Text>}>
        {recentAnomalies.length === 0 ? <Text style={styles.emptyHint}>Aucune anomalie récente retournée par le serveur.</Text> : recentAnomalies.slice(0, 5).map((item, index) => (
          <DataCard key={String(item.id ?? index)} title={item.type_anomalie || 'Anomalie'} subtitle={`Compteur ${item.numero_compteur || '—'} · Abonné ${item.numero_abonne || '—'}`} badge={item.niveau || item.statut}>
            <FieldRow label="Variation" value={item.variation === null || item.variation === undefined ? '—' : `${item.variation} %`} />
            <FieldRow label="Statut" value={item.statut} />
          </DataCard>
        ))}
        <PrimaryButton compact label="Consulter les anomalies" onPress={() => onNavigate('anomalies')} />
      </Panel>
    </PageContainer>
  );
}


function ConsumptionCard({ title, unit, type, readings }: { title: string; unit: string; type: string; readings: any[] }) {
  const rows = readings
    .filter((item) => String(item.type_compteur || '').toUpperCase() === type)
    .sort((a, b) => new Date(String(a.date_releve || '')).getTime() - new Date(String(b.date_releve || '')).getTime())
    .slice(-6);
  const total = rows.reduce((sum, item) => sum + (Number(item.consommation) || 0), 0);
  const max = Math.max(1, ...rows.map((item) => Number(item.consommation) || 0));

  return (
    <View style={styles.consumptionCard}>
      <View style={styles.consumptionHeading}>
        <Text style={styles.consumptionGlyph}>{type === 'EAU' ? '≈' : 'ϟ'}</Text>
        <View style={styles.consumptionTitleBlock}>
          <Text style={styles.consumptionTitle}>{title}</Text>
          <Text style={styles.consumptionSubtitle}>Consommations des derniers relevés</Text>
        </View>
      </View>
      <Text style={styles.consumptionTotal}>{formatDashboardNumber(total)} <Text style={styles.consumptionUnit}>{unit}</Text></Text>
      <Text style={styles.consumptionCount}>{rows.length} relevé{rows.length > 1 ? 's' : ''} récent{rows.length > 1 ? 's' : ''} disponibles</Text>
      {rows.length === 0 ? (
        <Text style={styles.consumptionEmpty}>Aucune donnée récente pour ce type de compteur.</Text>
      ) : (
        <View style={styles.chartBars}>
          {rows.map((item, index) => {
            const value = Number(item.consommation) || 0;
            const height = Math.max(4, Math.round((value / max) * 68));
            const dateValue = item.date_releve ? new Date(String(item.date_releve)) : null;
            const dateLabel = dateValue && !Number.isNaN(dateValue.getTime()) ? dateValue.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—';
            return (
              <View key={`${item.id ?? index}`} style={styles.chartBarColumn}>
                <Text style={styles.chartBarValue}>{formatDashboardNumber(value)}</Text>
                <View style={styles.chartBarTrack}><View style={[styles.chartBar, { height, backgroundColor: type === 'EAU' ? COLORS.blueLight : COLORS.orange }]} /></View>
                <Text style={styles.chartBarDate}>{dateLabel}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function formatDashboardNumber(value: number) {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

function Quick({ label, symbol, onPress }: { label: string; symbol: string; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.quickItem, pressed && { opacity: 0.76 }]}><Text style={styles.quickSymbol}>{symbol}</Text><Text style={styles.quickLabel}>{label}</Text><Text style={styles.quickAction}>Ouvrir →</Text></Pressable>;
}
function formatNumber(value: unknown) { if (value === null || value === undefined || value === '') return '—'; const n = Number(value); return Number.isFinite(n) ? n.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : String(value); }
function formatDate(value: unknown) { if (!value) return '—'; const d = new Date(String(value)); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('fr-FR'); }

const styles = StyleSheet.create({
  banner: { backgroundColor: 'rgba(248,250,252,0.96)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 }, brandMark: { width: 48, height: 48, borderRadius: 9, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center' }, brandMarkText: { color: '#FFFFFF', fontSize: 27, fontWeight: '900' }, bannerText: { flex: 1 }, eyebrow: { color: COLORS.blue, fontWeight: '900', fontSize: 8, letterSpacing: 1 }, bannerTitle: { color: COLORS.navy, fontSize: 17, fontWeight: '900', marginTop: 3 }, bannerSub: { color: COLORS.muted, fontSize: 10, textTransform: 'capitalize', marginTop: 2 }, updateText: { color: COLORS.subtle, fontSize: 9, marginTop: 5 }, warning: { backgroundColor: COLORS.warningBg, borderRadius: 9, padding: 11 }, warningText: { color: COLORS.warning, fontSize: 10, fontWeight: '700' }, sectionHead: { marginTop: 2 }, sectionTitle: { color: COLORS.navy, fontSize: 15, fontWeight: '900' }, sectionHint: { color: COLORS.muted, fontSize: 10, marginTop: 3 }, metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, justifyContent: 'space-between' }, progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }, progressValue: { color: COLORS.navy, fontSize: 27, fontWeight: '900' }, progressCaption: { color: COLORS.muted, fontSize: 10, flexShrink: 1, textAlign: 'right' }, progressTrack: { height: 9, marginTop: 10, borderRadius: 8, backgroundColor: COLORS.blueLight, overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: 8, backgroundColor: COLORS.blue }, progressFootnote: { color: COLORS.subtle, fontSize: 9, marginTop: 8 }, consumptionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, consumptionCard: { flexGrow: 1, flexBasis: '48%', minWidth: 220, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12 }, consumptionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, consumptionGlyph: { width: 32, height: 32, borderRadius: 8, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', backgroundColor: COLORS.blueLight, color: COLORS.blue, fontSize: 19, fontWeight: '900' }, consumptionTitleBlock: { flex: 1 }, consumptionTitle: { color: COLORS.navy, fontSize: 11, fontWeight: '900' }, consumptionSubtitle: { color: COLORS.muted, fontSize: 8, marginTop: 2 }, consumptionTotal: { color: COLORS.text, fontSize: 23, fontWeight: '900', marginTop: 12 }, consumptionUnit: { color: COLORS.muted, fontSize: 11, fontWeight: '700' }, consumptionCount: { color: COLORS.subtle, fontSize: 9, marginTop: 2 }, consumptionEmpty: { color: COLORS.muted, fontSize: 10, paddingVertical: 18 }, chartBars: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', marginTop: 12, minHeight: 92 }, chartBarColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' }, chartBarValue: { color: COLORS.muted, fontSize: 7, marginBottom: 3 }, chartBarTrack: { height: 68, justifyContent: 'flex-end', width: 12, backgroundColor: COLORS.field, borderRadius: 6, overflow: 'hidden' }, chartBar: { width: '100%', borderRadius: 6 }, chartBarDate: { color: COLORS.subtle, fontSize: 7, marginTop: 4 }, quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, quickItem: { width: '31%', minHeight: 86, backgroundColor: '#EEF5FB', borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, padding: 9 }, quickSymbol: { fontSize: 20, color: COLORS.blue, fontWeight: '900' }, quickLabel: { fontSize: 10, color: COLORS.navy, fontWeight: '900', marginTop: 5 }, quickAction: { color: COLORS.blue, fontSize: 9, marginTop: 5, fontWeight: '800' }, count: { color: COLORS.blue, fontSize: 11, fontWeight: '900' }, emptyHint: { color: COLORS.muted, fontSize: 11, paddingVertical: 10 },
});
