import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { fetchAgentNotificationCount } from '../api/agentService';
import LoginScreen from '../features/auth/LoginScreen';
import AgentDashboardScreen, { type AgentPageKey } from '../features/dashboard/AgentDashboardScreen';
import CompteursScreen from '../features/compteurs/CompteursScreen';
import AbonnesScreen from '../features/abonnes/AbonnesScreen';
import RelevesScreen from '../features/releves/RelevesScreen';
import MissionsScreen from '../features/missions/MissionsScreen';
import MissionDetailScreen from '../features/missions/MissionDetailScreen';
import AnomaliesScreen from '../features/anomalies/AnomaliesScreen';
import NotificationsScreen from '../features/notifications/NotificationsScreen';
import ReleveFormScreen from '../features/releves/ReleveFormScreen';
import ProfileScreen from '../features/profil/ProfileScreen';
import { AideScreen, JournalAuditScreen, SettingsScreen } from '../features/support/AgentSupportScreens';
import type { AgentCompteur, AgentMission } from '../types/agent';
import { COLORS } from '../theme/colors';

type ScreenState =
  | { type: 'page'; page: AgentPageKey }
  | { type: 'mission'; missionId: number }
  | { type: 'releve'; mission?: AgentMission | null; compteur?: AgentCompteur | null; returnPage: AgentPageKey };

type MenuItem = { key: AgentPageKey; label: string; symbol: string; group: 'main' | 'footer' };

const MENU_ITEMS: MenuItem[] = [
  { key: 'dashboard', label: 'Tableau de bord', symbol: '▦', group: 'main' },
  { key: 'compteurs', label: 'Compteurs', symbol: '◉', group: 'main' },
  { key: 'abonnes', label: 'Abonnés', symbol: '♙', group: 'main' },
  { key: 'releves', label: 'Relevés', symbol: '▤', group: 'main' },
  { key: 'missions', label: 'Mes contrôles', symbol: '☑', group: 'main' },
  { key: 'anomalies', label: 'Anomalies', symbol: '⚑', group: 'main' },
  { key: 'audit', label: 'Journal d’activité', symbol: '◷', group: 'footer' },
  { key: 'aide', label: 'Centre d’aide', symbol: '?', group: 'footer' },
  { key: 'parametres', label: 'Paramètres', symbol: '⚙', group: 'footer' },
];

const PAGE_TITLES: Record<AgentPageKey, string> = {
  dashboard: 'Tableau de bord',
  compteurs: 'Compteurs',
  abonnes: 'Abonnés',
  releves: 'Relevés',
  missions: 'Mes contrôles',
  anomalies: 'Anomalies',
  notifications: 'Notifications',
  audit: 'Journal d’activité',
  aide: 'Centre d’aide',
  parametres: 'Paramètres',
  profil: 'Mon profil',
};

export default function RootNavigator() {
  const { user, loading, offlineWarning } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 760;
  const [sidebarExpanded, setSidebarExpanded] = useState(isTablet);
  const [screen, setScreen] = useState<ScreenState>({ type: 'page', page: 'dashboard' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);

  useEffect(() => {
    if (isTablet) setSidebarExpanded(true);
    else setSidebarExpanded(false);
  }, [isTablet]);

  const activePage: AgentPageKey = screen.type === 'page'
    ? screen.page
    : screen.type === 'mission'
      ? 'missions'
      : screen.returnPage;

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    setNotificationLoading(true);
    try {
      setUnreadCount(await fetchAgentNotificationCount());
    } catch {
      // Une erreur de badge ne doit pas bloquer l'accès aux autres pages.
    } finally {
      setNotificationLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshNotifications();
    const interval = setInterval(() => { void refreshNotifications(); }, 30000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const navigate = useCallback((page: AgentPageKey) => {
    setScreen({ type: 'page', page });
    setRefreshKey((value) => value + 1);
  }, []);

  const openMission = useCallback((missionId: number) => {
    setScreen({ type: 'mission', missionId });
  }, []);

  const openMissionReleve = useCallback((mission: AgentMission) => {
    setScreen({ type: 'releve', mission, returnPage: 'missions' });
  }, []);

  const openCounterReleve = useCallback((compteur: AgentCompteur, returnPage: AgentPageKey = 'compteurs') => {
    setScreen({ type: 'releve', compteur, returnPage });
  }, []);

  const pageSubtitle = useMemo(() => {
    if (screen.type === 'mission') return `Détail de la mission #${screen.missionId}`;
    if (screen.type === 'releve') return 'Saisie du nouvel index observé';
    return 'Espace Agent · JIRAMA Antsirabe';
  }, [screen]);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ActivityIndicator color={COLORS.blue} size="large" />
        <Text style={styles.loadingText}>Vérification de votre session Agent…</Text>
      </View>
    );
  }

  if (!user) return <LoginScreen offlineWarning={offlineWarning} />;

  const renderPage = () => {
    if (screen.type === 'mission') {
      return (
        <MissionDetailScreen
          key={`mission-${screen.missionId}-${refreshKey}`}
          missionId={screen.missionId}
          onBack={() => navigate('missions')}
          onRead={openMissionReleve}
          onUpdated={() => {
            setRefreshKey((value) => value + 1);
            void refreshNotifications();
          }}
        />
      );
    }

    if (screen.type === 'releve') {
      return (
        <ReleveFormScreen
          key={`releve-${screen.mission?.id || screen.compteur?.id || 'new'}`}
          mission={screen.mission}
          compteur={screen.compteur}
          onBack={() => {
            if (screen.mission) setScreen({ type: 'mission', missionId: screen.mission.id });
            else navigate(screen.returnPage);
          }}
          onSaved={() => {
            const previous = screen;
            setRefreshKey((value) => value + 1);
            if (previous.mission) setScreen({ type: 'mission', missionId: previous.mission.id });
            else navigate(previous.returnPage);
            void refreshNotifications();
          }}
        />
      );
    }

    switch (screen.page) {
      case 'dashboard':
        return <AgentDashboardScreen key={`dashboard-${refreshKey}`} onNavigate={navigate} />;
      case 'compteurs':
        return <CompteursScreen key={`compteurs-${refreshKey}`} onCreateReleve={(meter) => openCounterReleve(meter, 'compteurs')} />;
      case 'abonnes':
        return <AbonnesScreen key={`abonnes-${refreshKey}`} />;
      case 'releves':
        return <RelevesScreen key={`releves-${refreshKey}`} onCreate={(meter) => openCounterReleve(meter, 'releves')} />;
      case 'missions':
        return <MissionsScreen key={`missions-${refreshKey}`} onSelect={(mission) => openMission(mission.id)} />;
      case 'anomalies':
        return <AnomaliesScreen key={`anomalies-${refreshKey}`} />;
      case 'notifications':
        return <NotificationsScreen key={`notifications-${refreshKey}`} onOpenMission={openMission} onChanged={() => void refreshNotifications()} />;
      case 'audit':
        return <JournalAuditScreen key={`audit-${refreshKey}`} />;
      case 'aide':
        return <AideScreen />;
      case 'parametres':
        return <SettingsScreen key={`settings-${refreshKey}`} />;
      case 'profil':
        return <ProfileScreen />;
      default:
        return <AgentDashboardScreen onNavigate={navigate} />;
    }
  };

  const sidebarWidth = sidebarExpanded ? (isTablet ? 224 : 178) : 62;
  const firstName = user.prenom || 'Agent';
  const initials = `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() || 'A';
  const isNotifications = screen.type === 'page' && screen.page === 'notifications';

  return (
    <ImageBackground source={require('../../assets/jirama-background.jpg')} style={styles.background} imageStyle={styles.backgroundImage}>
      <View style={styles.backgroundWash}>
        <SafeAreaView style={styles.safe}>
          <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
          <View style={styles.appShell}>
            <View style={[styles.sidebar, { width: sidebarWidth }]}>
              <View style={[styles.sidebarBrand, !sidebarExpanded && styles.sidebarBrandCompact]}>
                <Image source={require('../../assets/jirama-logo.png')} style={styles.logo} resizeMode="contain" />
                {sidebarExpanded && <View style={styles.brandCopy}><Text style={styles.brandName}>JIRAMA</Text><Text style={styles.brandSubtitle}>ESPACE AGENT</Text></View>}
              </View>

              <Pressable onPress={() => setSidebarExpanded((value) => !value)} style={[styles.collapseButton, !sidebarExpanded && styles.collapseButtonCompact]} accessibilityRole="button" accessibilityLabel={sidebarExpanded ? 'Réduire le menu' : 'Agrandir le menu'}>
                <Text style={styles.collapseGlyph}>{sidebarExpanded ? '‹' : '☰'}</Text>
                {sidebarExpanded && <Text style={styles.collapseText}>Réduire le menu</Text>}
              </Pressable>

              <ScrollView style={styles.sidebarScroll} contentContainerStyle={styles.sidebarItems} showsVerticalScrollIndicator={false}>
                <Text style={[styles.menuSectionLabel, !sidebarExpanded && styles.hiddenLabel]}>MENU PRINCIPAL</Text>
                {MENU_ITEMS.filter((item) => item.group === 'main').map((item) => (
                  <SidebarItem key={item.key} item={item} active={activePage === item.key} expanded={sidebarExpanded} onPress={() => navigate(item.key)} />
                ))}
                <View style={styles.sidebarDivider} />
                <Text style={[styles.menuSectionLabel, !sidebarExpanded && styles.hiddenLabel]}>ASSISTANCE</Text>
                {MENU_ITEMS.filter((item) => item.group === 'footer').map((item) => (
                  <SidebarItem key={item.key} item={item} active={activePage === item.key} expanded={sidebarExpanded} onPress={() => navigate(item.key)} />
                ))}
              </ScrollView>

              <Pressable onPress={() => navigate('profil')} style={[styles.profileMenu, activePage === 'profil' && styles.menuItemActive]}>
                <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{initials}</Text></View>
                {sidebarExpanded && <View style={styles.profileText}><Text numberOfLines={1} style={styles.profileName}>{firstName} {user.nom}</Text><Text style={styles.profileRole}>AGENT</Text></View>}
              </Pressable>
            </View>

            <View style={styles.mainColumn}>
              <View style={styles.topbar}>
                <View style={styles.topbarTitleBlock}>
                  <Text numberOfLines={1} style={styles.topbarTitle}>{screen.type === 'releve' ? 'Saisie du relevé' : screen.type === 'mission' ? 'Détail de mission' : PAGE_TITLES[screen.page]}</Text>
                  <Text numberOfLines={1} style={styles.topbarSubtitle}>{pageSubtitle}</Text>
                </View>
                <View style={styles.topbarActions}>
                  <Pressable onPress={() => { navigate('notifications'); void refreshNotifications(); }} style={[styles.notificationButton, isNotifications && styles.notificationButtonActive]} accessibilityRole="button" accessibilityLabel="Ouvrir les notifications">
                    <Text style={styles.notificationGlyph}>♢</Text>
                    {unreadCount > 0 && <View style={styles.notificationCount}><Text style={styles.notificationCountText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View>}
                  </Pressable>
                  <Pressable onPress={() => navigate('profil')} style={styles.topbarUser} accessibilityRole="button" accessibilityLabel="Ouvrir mon profil">
                    <View style={styles.topbarAvatar}><Text style={styles.topbarAvatarText}>{initials}</Text></View>
                    {width >= 410 && <View style={styles.topbarUserText}><Text numberOfLines={1} style={styles.topbarUserName}>{firstName}</Text><Text style={styles.topbarUserRole}>Agent</Text></View>}
                  </Pressable>
                </View>
              </View>

              <View style={styles.contentFrame}>
                {renderPage()}
              </View>

              <View style={styles.bottomStatus}>
                <View style={styles.onlineDot} />
                <Text style={styles.bottomStatusText}>{notificationLoading ? 'Actualisation…' : 'Espace Agent sécurisé · API JIRAMA'}</Text>
                {width >= 440 && <Text style={styles.bottomStatusHint}>Données du serveur JIRAMA</Text>}
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

function SidebarItem({ item, active, expanded, onPress }: { item: MenuItem; active: boolean; expanded: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, active && styles.menuItemActive, pressed && styles.menuItemPressed, !expanded && styles.menuItemCompact]} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: active }}>
      <Text style={[styles.menuGlyph, active && styles.menuGlyphActive]}>{item.symbol}</Text>
      {expanded && <Text numberOfLines={1} style={[styles.menuLabel, active && styles.menuLabelActive]}>{item.label}</Text>}
      {active && expanded && <View style={styles.activeMarker} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  background: { flex: 1, backgroundColor: COLORS.background },
  backgroundImage: { opacity: 0.24 },
  backgroundWash: { flex: 1, backgroundColor: 'rgba(237,242,247,0.78)' },
  safe: { flex: 1 },
  appShell: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(237,242,247,0.18)' },
  sidebar: { backgroundColor: 'rgba(255,255,255,0.97)', borderRightWidth: 1, borderRightColor: COLORS.border, paddingTop: 8, paddingBottom: 8 },
  sidebarBrand: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 9, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sidebarBrandCompact: { justifyContent: 'center', paddingHorizontal: 6 },
  logo: { width: 36, height: 36 },
  brandCopy: { flex: 1 },
  brandName: { color: COLORS.navy, fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  brandSubtitle: { color: COLORS.blue, fontSize: 8, fontWeight: '900', letterSpacing: 1.1, marginTop: 2 },
  collapseButton: { height: 42, marginHorizontal: 10, marginTop: 10, marginBottom: 8, borderRadius: 9, backgroundColor: COLORS.blueLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  collapseButtonCompact: { marginHorizontal: 8 },
  collapseGlyph: { color: COLORS.blue, fontSize: 17, fontWeight: '900' },
  collapseText: { color: COLORS.blue, fontSize: 10, fontWeight: '900' },
  sidebarScroll: { flex: 1 },
  sidebarItems: { paddingHorizontal: 8, paddingBottom: 12 },
  menuSectionLabel: { color: COLORS.subtle, fontSize: 8, fontWeight: '900', letterSpacing: 1.05, paddingHorizontal: 8, paddingTop: 12, paddingBottom: 7 },
  hiddenLabel: { height: 7, paddingTop: 0, paddingBottom: 0, opacity: 0 },
  menuItem: { minHeight: 43, borderRadius: 9, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginBottom: 4, gap: 10, position: 'relative' },
  menuItemCompact: { justifyContent: 'center', paddingHorizontal: 0 },
  menuItemActive: { backgroundColor: COLORS.blueLight },
  menuItemPressed: { opacity: 0.74 },
  menuGlyph: { width: 25, textAlign: 'center', color: COLORS.muted, fontSize: 18, fontWeight: '800' },
  menuGlyphActive: { color: COLORS.blue },
  menuLabel: { color: COLORS.text, fontSize: 10, fontWeight: '800', flex: 1 },
  menuLabelActive: { color: COLORS.blue, fontWeight: '900' },
  activeMarker: { position: 'absolute', left: 0, top: 9, bottom: 9, width: 3, borderRadius: 3, backgroundColor: COLORS.blue },
  sidebarDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 6, marginTop: 10, marginBottom: 3 },
  profileMenu: { minHeight: 54, marginHorizontal: 8, paddingHorizontal: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: COLORS.border },
  profileAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.blueLight, justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { color: COLORS.blue, fontSize: 11, fontWeight: '900' },
  profileText: { flex: 1 },
  profileName: { color: COLORS.navy, fontSize: 10, fontWeight: '900' },
  profileRole: { color: COLORS.subtle, fontSize: 8, fontWeight: '800', marginTop: 2 },
  mainColumn: { flex: 1, minWidth: 0 },
  topbar: { minHeight: 62, backgroundColor: 'rgba(255,255,255,0.96)', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  topbarTitleBlock: { flex: 1, minWidth: 0 },
  topbarTitle: { color: COLORS.navy, fontSize: 15, fontWeight: '900' },
  topbarSubtitle: { color: COLORS.muted, fontSize: 9, marginTop: 3 },
  topbarActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notificationButton: { width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.field, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notificationButtonActive: { backgroundColor: COLORS.blueLight },
  notificationGlyph: { color: COLORS.blue, fontSize: 22, fontWeight: '800' },
  notificationCount: { position: 'absolute', right: -4, top: -4, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1, borderColor: COLORS.white },
  notificationCountText: { color: COLORS.white, fontSize: 8, fontWeight: '900' },
  topbarUser: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topbarAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.blueLight, alignItems: 'center', justifyContent: 'center' },
  topbarAvatarText: { color: COLORS.blue, fontSize: 10, fontWeight: '900' },
  topbarUserText: { maxWidth: 72 },
  topbarUserName: { color: COLORS.navy, fontSize: 10, fontWeight: '900' },
  topbarUserRole: { color: COLORS.muted, fontSize: 8, marginTop: 1 },
  contentFrame: { flex: 1, minWidth: 0, backgroundColor: 'rgba(237,242,247,0.82)' },
  bottomStatus: { minHeight: 27, backgroundColor: 'rgba(255,255,255,0.93)', borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  bottomStatusText: { color: COLORS.subtle, fontSize: 8, flex: 1 },
  bottomStatusHint: { color: COLORS.subtle, fontSize: 8 },
});
