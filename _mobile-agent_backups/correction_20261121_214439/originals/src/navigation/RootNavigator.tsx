import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthContext';
import { fetchAgentNotificationSnapshot } from '../api/agentService';
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
import type { AgentCompteur, AgentMission, AgentNotification } from '../types/agent';
import { COLORS } from '../theme/colors';

type ScreenState =
  | { type: 'page'; page: AgentPageKey }
  | { type: 'mission'; missionId: number }
  | { type: 'releve'; mission?: AgentMission | null; compteur?: AgentCompteur | null; returnPage: AgentPageKey };

type MenuItem = {
  key: AgentPageKey;
  label: string;
  symbol: string;
  group: 'main' | 'footer';
};

const MENU_ITEMS: MenuItem[] = [
  { key: 'dashboard', label: 'Tableau de bord', symbol: '🏠', group: 'main' },
  { key: 'missions', label: 'Mes contrôles', symbol: '🎯', group: 'main' },
  { key: 'compteurs', label: 'Compteurs', symbol: '⚡', group: 'main' },
  { key: 'abonnes', label: 'Abonnés', symbol: '👥', group: 'main' },
  { key: 'releves', label: 'Relevés', symbol: '📟', group: 'main' },
  { key: 'anomalies', label: 'Anomalies', symbol: '⚠️', group: 'main' },
  { key: 'notifications', label: 'Notifications', symbol: '🔔', group: 'main' },
  { key: 'audit', label: 'Journal d’activité', symbol: '🕘', group: 'footer' },
  { key: 'aide', label: 'Centre d’aide', symbol: '❔', group: 'footer' },
  { key: 'parametres', label: 'Paramètres', symbol: '⚙️', group: 'footer' },
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

const NOTIFICATION_POLL_INTERVAL = 30_000;

type NotificationText = { title: string; message: string };

function getNotificationText(notification: AgentNotification | null): NotificationText {
  if (!notification) return { title: 'Nouvelle notification', message: 'Une notification vient d’arriver.' };

  // Les champs peuvent varier selon le type de notification retourné par le Backend.
  // On lit uniquement des chaînes disponibles, sans inventer de contenu métier.
  const value = notification as unknown as Record<string, unknown>;
  const title = [value.titre, value.title, value.objet]
    .find((item): item is string => typeof item === 'string' && item.trim().length > 0);
  const message = [value.message, value.contenu, value.description]
    .find((item): item is string => typeof item === 'string' && item.trim().length > 0);

  return {
    title: title || 'Nouvelle notification JIRAMA',
    message: message || 'Consultez votre espace Notifications pour afficher le détail.',
  };
}

export default function RootNavigator() {
  const { user, loading, offlineWarning } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 760;

  const [sidebarExpanded, setSidebarExpanded] = useState(isTablet);
  const [screen, setScreen] = useState<ScreenState>({ type: 'page', page: 'dashboard' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [notificationAlert, setNotificationAlert] = useState<AgentNotification | null>(null);

  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const notificationsInitializedRef = useRef(false);

  useEffect(() => {
    setSidebarExpanded(isTablet);
  }, [isTablet]);

  useEffect(() => {
    // Une nouvelle session Agent doit établir sa propre référence de notifications.
    seenNotificationIdsRef.current.clear();
    notificationsInitializedRef.current = false;
    setNotificationAlert(null);
    setUnreadCount(0);
    setBackendOnline(null);
  }, [user?.id]);

  const activePage: AgentPageKey = screen.type === 'page'
    ? screen.page
    : screen.type === 'mission'
      ? 'missions'
      : screen.returnPage;

  const refreshNotifications = useCallback(async () => {
    if (!user) return;

    setNotificationLoading(true);
    try {
      const snapshot = await fetchAgentNotificationSnapshot();
      setBackendOnline(true);
      setUnreadCount(snapshot.unreadCount);

      const newlyArrived = snapshot.items.filter((item) => {
        const id = String(item.id);
        return id.length > 0 && !seenNotificationIdsRef.current.has(id);
      });

      snapshot.items.forEach((item) => {
        seenNotificationIdsRef.current.add(String(item.id));
      });

      // Le premier chargement sert de référence et ne déclenche pas de fausse alerte.
      if (notificationsInitializedRef.current && newlyArrived.length > 0) {
        const newest = newlyArrived[0];
        if (newest.statut === 'EN_ATTENTE' || snapshot.unreadCount > 0) {
          setNotificationAlert(newest);
        }
      }
      notificationsInitializedRef.current = true;
    } catch {
      setBackendOnline(false);
      // Une panne du compteur ne doit pas bloquer les autres pages Agent.
    } finally {
      setNotificationLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    void refreshNotifications();
    const intervalId = setInterval(() => {
      void refreshNotifications();
    }, NOTIFICATION_POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [refreshNotifications, user]);

  const navigate = useCallback((page: AgentPageKey) => {
    setScreen({ type: 'page', page });
    setRefreshKey((value) => value + 1);
    if (!isTablet) setSidebarExpanded(false);
  }, [isTablet]);

  const openMission = useCallback((missionId: number) => {
    setScreen({ type: 'mission', missionId });
    if (!isTablet) setSidebarExpanded(false);
  }, [isTablet]);

  const openMissionReleve = useCallback((mission: AgentMission) => {
    setScreen({ type: 'releve', mission, returnPage: 'missions' });
    if (!isTablet) setSidebarExpanded(false);
  }, [isTablet]);

  const openCounterReleve = useCallback((compteur: AgentCompteur, returnPage: AgentPageKey = 'compteurs') => {
    setScreen({ type: 'releve', compteur, returnPage });
    if (!isTablet) setSidebarExpanded(false);
  }, [isTablet]);

  const pageSubtitle = useMemo(() => {
    if (screen.type === 'mission') return `Détail de la mission #${screen.missionId}`;
    if (screen.type === 'releve') return 'Saisie du nouvel index observé';
    return 'Espace Agent · JIRAMA Antsirabe';
  }, [screen]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" />
        <Image source={require('../../assets/jirama-logo.png')} style={styles.loadingLogo} resizeMode="contain" />
        <ActivityIndicator color={COLORS.blue} size="large" />
        <Text style={styles.loadingText}>Vérification de votre session Agent…</Text>
      </SafeAreaView>
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

  const sidebarOverlay = !isTablet && sidebarExpanded;
  const sidebarWidth = isTablet ? 224 : sidebarExpanded ? 232 : 58;
  const firstName = user.prenom || 'Agent';
  const initials = `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() || 'A';
  const isNotifications = screen.type === 'page' && screen.page === 'notifications';
  const alertText = getNotificationText(notificationAlert);
  const connectionLabel = backendOnline === null
    ? 'Vérification…'
    : backendOnline
      ? 'Backend connecté'
      : 'Backend indisponible';

  return (
    <View style={styles.background}>
      <Image
        source={require('../../assets/jirama-background.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.backgroundWash}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <StatusBar barStyle="dark-content" />
          <View style={styles.appShell}>
            {/* Le menu est le premier élément de la ligne : il reste donc réellement à gauche. */}
            <View style={[styles.sidebar, { width: sidebarWidth }, sidebarOverlay && styles.sidebarOverlay]}>
              <View style={[styles.sidebarBrand, !sidebarExpanded && styles.sidebarBrandCompact]}>
                <Image source={require('../../assets/jirama-logo.png')} style={styles.logo} resizeMode="contain" />
                {sidebarExpanded && (
                  <View style={styles.brandCopy}>
                    <Text style={styles.brandName}>JIRAMA</Text>
                    <Text style={styles.brandSubtitle}>ESPACE AGENT</Text>
                  </View>
                )}
              </View>

              <Pressable
                onPress={() => setSidebarExpanded((value) => !value)}
                style={[styles.collapseButton, !sidebarExpanded && styles.collapseButtonCompact]}
                accessibilityRole="button"
                accessibilityLabel={sidebarExpanded ? 'Réduire le menu' : 'Agrandir le menu'}
              >
                <Text style={styles.collapseGlyph}>{sidebarExpanded ? '‹' : '☰'}</Text>
                {sidebarExpanded && <Text style={styles.collapseText}>Réduire le menu</Text>}
              </Pressable>

              <ScrollView style={styles.sidebarScroll} contentContainerStyle={styles.sidebarItems} showsVerticalScrollIndicator={false}>
                <Text style={[styles.menuSectionLabel, !sidebarExpanded && styles.hiddenLabel]}>MENU PRINCIPAL</Text>
                {MENU_ITEMS.filter((item) => item.group === 'main').map((item) => (
                  <SidebarItem
                    key={item.key}
                    item={item}
                    active={activePage === item.key}
                    expanded={sidebarExpanded}
                    onPress={() => navigate(item.key)}
                  />
                ))}
                <View style={styles.sidebarDivider} />
                <Text style={[styles.menuSectionLabel, !sidebarExpanded && styles.hiddenLabel]}>ASSISTANCE</Text>
                {MENU_ITEMS.filter((item) => item.group === 'footer').map((item) => (
                  <SidebarItem
                    key={item.key}
                    item={item}
                    active={activePage === item.key}
                    expanded={sidebarExpanded}
                    onPress={() => navigate(item.key)}
                  />
                ))}
              </ScrollView>

              <Pressable onPress={() => navigate('profil')} style={[styles.profileMenu, activePage === 'profil' && styles.menuItemActive]}>
                <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{initials}</Text></View>
                {sidebarExpanded && (
                  <View style={styles.profileText}>
                    <Text numberOfLines={1} style={styles.profileName}>{firstName} {user.nom}</Text>
                    <Text style={styles.profileRole}>AGENT</Text>
                  </View>
                )}
              </Pressable>
            </View>

            <View style={styles.mainColumn}>
              <View style={styles.topbar}>
                <Pressable
                  onPress={() => setSidebarExpanded((value) => !value)}
                  style={styles.menuToggle}
                  accessibilityRole="button"
                  accessibilityLabel={sidebarExpanded ? 'Fermer le menu' : 'Ouvrir le menu'}
                >
                  <Text style={styles.menuToggleText}>☰</Text>
                </Pressable>

                <View style={styles.topbarTitleBlock}>
                  <Text numberOfLines={1} style={styles.topbarTitle}>
                    {screen.type === 'releve' ? 'Saisie du relevé' : screen.type === 'mission' ? 'Détail de mission' : PAGE_TITLES[screen.page]}
                  </Text>
                  <View style={styles.connectionLine}>
                    <View style={[styles.connectionDot, backendOnline === false ? styles.connectionDotOffline : backendOnline === null ? styles.connectionDotPending : null]} />
                    <Text numberOfLines={1} style={styles.topbarSubtitle}>{connectionLabel}</Text>
                  </View>
                </View>

                <View style={styles.topbarActions}>
                  <Pressable
                    onPress={() => {
                      setNotificationAlert(null);
                      navigate('notifications');
                      void refreshNotifications();
                    }}
                    style={[styles.notificationButton, isNotifications && styles.notificationButtonActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Ouvrir les notifications, ${unreadCount} non lues`}
                  >
                    <Text style={styles.notificationGlyph}>🔔</Text>
                    {unreadCount > 0 && (
                      <View style={styles.notificationCount}>
                        <Text style={styles.notificationCountText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                      </View>
                    )}
                  </Pressable>

                  <Pressable onPress={() => navigate('profil')} style={styles.topbarUser} accessibilityRole="button" accessibilityLabel="Ouvrir mon profil">
                    <View style={styles.topbarAvatar}><Text style={styles.topbarAvatarText}>{initials}</Text></View>
                    {width >= 410 && (
                      <View style={styles.topbarUserText}>
                        <Text numberOfLines={1} style={styles.topbarUserName}>{firstName}</Text>
                        <Text style={styles.topbarUserRole}>Agent</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>

              {notificationAlert && !isNotifications && (
                <View style={styles.notificationAlert}>
                  <Pressable
                    style={styles.notificationAlertContent}
                    onPress={() => {
                      setNotificationAlert(null);
                      navigate('notifications');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Consulter la nouvelle notification"
                  >
                    <View style={styles.notificationAlertIcon}><Text style={styles.notificationAlertEmoji}>🔔</Text></View>
                    <View style={styles.notificationAlertTextBlock}>
                      <Text numberOfLines={1} style={styles.notificationAlertTitle}>{alertText.title}</Text>
                      <Text numberOfLines={2} style={styles.notificationAlertMessage}>{alertText.message}</Text>
                    </View>
                  </Pressable>
                  <Pressable onPress={() => setNotificationAlert(null)} style={styles.dismissAlertButton} accessibilityRole="button" accessibilityLabel="Fermer l’alerte">
                    <Text style={styles.dismissAlertText}>×</Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.contentFrame}>
                {renderPage()}
              </View>

              <View style={styles.bottomStatus}>
                <View style={[styles.onlineDot, backendOnline === false && styles.onlineDotOffline, backendOnline === null && styles.onlineDotPending]} />
                <Text numberOfLines={1} style={styles.bottomStatusText}>
                  {notificationLoading ? 'Actualisation des notifications…' : connectionLabel}
                </Text>
                {width >= 440 && <Text style={styles.bottomStatusHint}>Espace Agent sécurisé</Text>}
              </View>

              <View style={styles.footer}>
                <Text numberOfLines={1} style={styles.footerBrand}>JIRAMA · Jiro sy Rano Malagasy</Text>
                <Text numberOfLines={1} style={styles.footerText}>Assistance clientèle : 547</Text>
                {width >= 390 && <Text numberOfLines={1} style={styles.footerTagline}>Au service de tous pour un développement durable.</Text>}
              </View>
            </View>

            {/* Le voile est derrière le tiroir et ne s'affiche qu'en mode téléphone. */}
            {sidebarOverlay && (
              <Pressable
                style={styles.sidebarScrim}
                onPress={() => setSidebarExpanded(false)}
                accessibilityRole="button"
                accessibilityLabel="Fermer le menu latéral"
              />
            )}
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

function SidebarItem({
  item,
  active,
  expanded,
  onPress,
}: {
  item: MenuItem;
  active: boolean;
  expanded: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        active && styles.menuItemActive,
        pressed && styles.menuItemPressed,
        !expanded && styles.menuItemCompact,
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.menuGlyph, active && styles.menuGlyphActive]}>{item.symbol}</Text>
      {expanded && <Text numberOfLines={1} style={[styles.menuLabel, active && styles.menuLabelActive]}>{item.label}</Text>}
      {active && expanded && <View style={styles.activeMarker} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingLogo: { width: 74, height: 74, marginBottom: 8 },
  loadingText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  background: { flex: 1, backgroundColor: COLORS.background },
  backgroundImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.13 },
  backgroundWash: { flex: 1, backgroundColor: 'rgba(243,247,250,0.88)' },
  safe: { flex: 1 },
  appShell: { flex: 1, flexDirection: 'row', minWidth: 0, backgroundColor: 'rgba(237,242,247,0.10)' },
  mainColumn: { flex: 1, minWidth: 0, backgroundColor: 'transparent' },
  topbar: {
    minHeight: 66,
    backgroundColor: COLORS.navy,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.16)',
  },
  menuToggle: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  menuToggleText: { color: COLORS.white, fontSize: 23, fontWeight: '800', lineHeight: 27 },
  topbarTitleBlock: { flex: 1, minWidth: 0 },
  topbarTitle: { color: COLORS.white, fontSize: 14, fontWeight: '900' },
  connectionLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  topbarSubtitle: { color: 'rgba(255,255,255,0.82)', fontSize: 9, flexShrink: 1 },
  connectionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#38C979' },
  connectionDotOffline: { backgroundColor: '#F15B5B' },
  connectionDotPending: { backgroundColor: '#F4C451' },
  topbarActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notificationButton: { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notificationButtonActive: { backgroundColor: 'rgba(255,255,255,0.24)' },
  notificationGlyph: { fontSize: 19 },
  notificationCount: { position: 'absolute', right: -4, top: -4, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1, borderColor: COLORS.white },
  notificationCountText: { color: COLORS.white, fontSize: 8, fontWeight: '900' },
  topbarUser: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topbarAvatar: { width: 35, height: 35, borderRadius: 18, backgroundColor: COLORS.blueLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)' },
  topbarAvatarText: { color: COLORS.navy, fontSize: 10, fontWeight: '900' },
  topbarUserText: { maxWidth: 72 },
  topbarUserName: { color: COLORS.white, fontSize: 10, fontWeight: '900' },
  topbarUserRole: { color: 'rgba(255,255,255,0.72)', fontSize: 8, marginTop: 1 },
  notificationAlert: { minHeight: 62, marginHorizontal: 9, marginTop: 8, marginBottom: 2, paddingLeft: 10, paddingRight: 6, paddingVertical: 7, borderRadius: 13, backgroundColor: '#E4F5FC', borderWidth: 1, borderColor: '#B8E4F4', flexDirection: 'row', alignItems: 'center', gap: 7 },
  notificationAlertContent: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9 },
  notificationAlertIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#C9ECF9', alignItems: 'center', justifyContent: 'center' },
  notificationAlertEmoji: { fontSize: 17 },
  notificationAlertTextBlock: { flex: 1, minWidth: 0 },
  notificationAlertTitle: { color: COLORS.navy, fontSize: 11, fontWeight: '900' },
  notificationAlertMessage: { color: COLORS.muted, fontSize: 9, marginTop: 2 },
  dismissAlertButton: { width: 30, height: 34, alignItems: 'center', justifyContent: 'center' },
  dismissAlertText: { color: COLORS.muted, fontSize: 23, fontWeight: '500' },
  contentFrame: { flex: 1, minWidth: 0, backgroundColor: 'rgba(243,247,250,0.91)' },
  bottomStatus: { minHeight: 23, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2BA96B' },
  onlineDotOffline: { backgroundColor: '#E25252' },
  onlineDotPending: { backgroundColor: '#E6AB32' },
  bottomStatusText: { color: COLORS.subtle, fontSize: 8, flex: 1 },
  bottomStatusHint: { color: COLORS.subtle, fontSize: 8 },
  footer: { minHeight: 43, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#E5F2F9', borderTopWidth: 1, borderTopColor: '#D1E5F0', alignItems: 'center', justifyContent: 'center' },
  footerBrand: { color: COLORS.navy, fontSize: 9, fontWeight: '900' },
  footerText: { color: COLORS.blue, fontSize: 8, fontWeight: '800', marginTop: 2 },
  footerTagline: { color: COLORS.muted, fontSize: 7, fontStyle: 'italic', marginTop: 2 },
  sidebar: { backgroundColor: '#FFFFFF', borderRightWidth: 1, borderRightColor: COLORS.border, paddingTop: 7, paddingBottom: 7, zIndex: 5 },
  sidebarOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 30, elevation: 12, shadowColor: '#061B2D', shadowOpacity: 0.20, shadowRadius: 12, shadowOffset: { width: 3, height: 0 } },
  sidebarScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,20,34,0.40)', zIndex: 20 },
  sidebarBrand: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sidebarBrandCompact: { justifyContent: 'center', paddingHorizontal: 5 },
  logo: { width: 37, height: 37 },
  brandCopy: { flex: 1, minWidth: 0 },
  brandName: { color: COLORS.navy, fontSize: 14, fontWeight: '900', letterSpacing: 0.7 },
  brandSubtitle: { color: COLORS.blue, fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginTop: 2 },
  collapseButton: { height: 40, marginHorizontal: 9, marginTop: 9, marginBottom: 7, borderRadius: 10, backgroundColor: COLORS.blueLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  collapseButtonCompact: { marginHorizontal: 7 },
  collapseGlyph: { color: COLORS.blue, fontSize: 18, fontWeight: '900' },
  collapseText: { color: COLORS.blue, fontSize: 9, fontWeight: '900' },
  sidebarScroll: { flex: 1 },
  sidebarItems: { paddingHorizontal: 7, paddingBottom: 10 },
  menuSectionLabel: { color: COLORS.subtle, fontSize: 8, fontWeight: '900', letterSpacing: 0.8, paddingHorizontal: 8, paddingTop: 12, paddingBottom: 7 },
  hiddenLabel: { height: 7, paddingTop: 0, paddingBottom: 0, opacity: 0 },
  menuItem: { minHeight: 43, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, marginBottom: 4, gap: 9, position: 'relative' },
  menuItemCompact: { justifyContent: 'center', paddingHorizontal: 0 },
  menuItemActive: { backgroundColor: COLORS.blueLight },
  menuItemPressed: { opacity: 0.72 },
  menuGlyph: { width: 27, textAlign: 'center', color: COLORS.muted, fontSize: 18 },
  menuGlyphActive: { color: COLORS.blue },
  menuLabel: { color: COLORS.text, fontSize: 10, fontWeight: '800', flex: 1 },
  menuLabelActive: { color: COLORS.blue, fontWeight: '900' },
  activeMarker: { position: 'absolute', left: 0, top: 9, bottom: 9, width: 3, borderRadius: 3, backgroundColor: COLORS.blue },
  sidebarDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 6, marginTop: 8, marginBottom: 3 },
  profileMenu: { minHeight: 52, marginHorizontal: 7, paddingHorizontal: 7, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  profileAvatar: { width: 33, height: 33, borderRadius: 17, backgroundColor: COLORS.blueLight, justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { color: COLORS.blue, fontSize: 10, fontWeight: '900' },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { color: COLORS.navy, fontSize: 9, fontWeight: '900' },
  profileRole: { color: COLORS.subtle, fontSize: 8, fontWeight: '800', marginTop: 2 },
});
