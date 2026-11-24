
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';


import { Ionicons } from '@react-native-vector-icons/ionicons';

import {
  ActivityIndicator,
  Image,
  Modal,
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

import { fetchAgentNotificationSnapshot, markAgentNotificationAsRead } from '../api/agentService';

import LoginScreen from '../features/auth/LoginScreen';

import AgentDashboardScreen, {
  type AgentPageKey,
} from '../features/dashboard/AgentDashboardScreen';

import CompteursScreen from '../features/compteurs/CompteursScreen';

import AbonnesScreen from '../features/abonnes/AbonnesScreen';

import RelevesScreen from '../features/releves/RelevesScreen';

import MissionsScreen from '../features/missions/MissionsScreen';

import MissionDetailScreen from '../features/missions/MissionDetailScreen';

import AnomaliesScreen from '../features/anomalies/AnomaliesScreen';

import NotificationsScreen from '../features/notifications/NotificationsScreen';

import ReleveFormScreen from '../features/releves/ReleveFormScreen';

import ProfileScreen from '../features/profil/ProfileScreen';

import {
  AideScreen,
  JournalAuditScreen,
  SettingsScreen,
} from '../features/support/AgentSupportScreens';

import type {
  AgentCompteur,
  AgentMission,
} from '../types/agent';

import type {
  AgentNotification,
} from '../api/agentService';

import { COLORS } from '../theme/colors';

// ============================================================
// TYPES
// ============================================================

type ScreenState =
  | {
      type: 'page';
      page: AgentPageKey;
    }
  | {
      type: 'mission';
      missionId: number;
    }
  | {
      type: 'releve';
      mission?: AgentMission | null;
      compteur?: AgentCompteur | null;
      returnPage: AgentPageKey;
    };

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type MenuItem = {
  key: AgentPageKey;
  label: string;
  icon: IoniconName;
  group: 'main' | 'footer';
};

type NotificationText = {
  title: string;
  message: string;
};

type AgentNotificationSnapshot = {
  unreadCount: number;
  items: AgentNotification[];
};

// ============================================================
// CONFIGURATION DU MENU
// ============================================================

const MENU_ITEMS: MenuItem[] = [
  {
    key: 'dashboard',
    label: 'Tableau de bord',
    icon: 'grid-outline',
    group: 'main',
  },
  {
    key: 'missions',
    label: 'Mes contrôles',
    icon: 'clipboard-outline',
    group: 'main',
  },
  {
    key: 'compteurs',
    label: 'Compteurs',
    icon: 'flash-outline',
    group: 'main',
  },
  {
    key: 'abonnes',
    label: 'Abonnés',
    icon: 'people-outline',
    group: 'main',
  },
  {
    key: 'releves',
    label: 'Relevés',
    icon: 'document-text-outline',
    group: 'main',
  },
  {
    key: 'anomalies',
    label: 'Anomalies',
    icon: 'warning-outline',
    group: 'main',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: 'notifications-outline',
    group: 'main',
  },
  {
    key: 'audit',
    label: 'Journal d’activité',
    icon: 'time-outline',
    group: 'footer',
  },
  {
    key: 'aide',
    label: 'Centre d’aide',
    icon: 'help-circle-outline',
    group: 'footer',
  },
  {
    key: 'parametres',
    label: 'Paramètres',
    icon: 'settings-outline',
    group: 'footer',
  },
];

// ============================================================
// TITRES DES PAGES
// ============================================================

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

// ============================================================
// NOTIFICATIONS
// ============================================================

const NOTIFICATION_POLL_INTERVAL = 30_000;

function getNotificationText(
  notification: AgentNotification | null,
): NotificationText {
  if (!notification) {
    return {
      title: 'Nouvelle notification',
      message: 'Une notification vient d’arriver.',
    };
  }

  const value = notification as unknown as Record<
    string,
    unknown
  >;

  const title = [
    value.titre,
    value.title,
    value.objet,
  ].find(
    (item): item is string =>
      typeof item === 'string' && item.trim().length > 0,
  );

  const message = [
    value.message,
    value.contenu,
    value.description,
  ].find(
    (item): item is string =>
      typeof item === 'string' && item.trim().length > 0,
  );

  return {
    title: title || 'Nouvelle notification JIRAMA',
    message:
      message ||
      'Consultez votre espace Notifications pour afficher le détail.',
  };
}

// ============================================================
// ROOT NAVIGATOR
// ============================================================

export default function RootNavigator() {
  const { user, loading, offlineWarning } = useAuth();

  const { width } = useWindowDimensions();

  const isTablet = width >= 760;

  const [sidebarExpanded, setSidebarExpanded] = useState(isTablet);

  const [screen, setScreen] = useState<ScreenState>({
    type: 'page',
    page: 'dashboard',
  });

  const [refreshKey, setRefreshKey] = useState(0);

  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPopupOpen, setNotificationPopupOpen] = useState(false);
  const [notificationPreview, setNotificationPreview] = useState<AgentNotification[]>([]);

  const [notificationLoading, setNotificationLoading] =
    useState(false);

  const [backendOnline, setBackendOnline] =
    useState<boolean | null>(null);

  const [notificationAlert, setNotificationAlert] =
  useState<AgentNotification | null>(null);

  const seenNotificationIdsRef = useRef<Set<string>>(
    new Set(),
  );

  const notificationsInitializedRef = useRef(false);

  const notificationRequestRef = useRef(false);

  const mountedRef = useRef(true);

  // ==========================================================
  // MONTAGE / DÉMONTAGE
  // ==========================================================

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ==========================================================
  // RESPONSIVE MENU
  // ==========================================================

  useEffect(() => {
    setSidebarExpanded(isTablet);
  }, [isTablet]);

  // ==========================================================
  // INITIALISATION DE LA SESSION
  // ==========================================================

  useEffect(() => {
    seenNotificationIdsRef.current.clear();

    notificationsInitializedRef.current = false;

    notificationRequestRef.current = false;

    setNotificationAlert(null);
    setNotificationPopupOpen(false);
    setNotificationPreview([]);

    setUnreadCount(0);

    setBackendOnline(null);
  }, [user?.id]);

  // ==========================================================
  // PAGE ACTIVE
  // ==========================================================

  const activePage: AgentPageKey =
    screen.type === 'page'
      ? screen.page
      : screen.type === 'mission'
        ? 'missions'
        : screen.returnPage;

  // ==========================================================
  // ACTUALISATION DES NOTIFICATIONS
  // ==========================================================

  const refreshNotifications = useCallback(async () => {
    if (!user || notificationRequestRef.current) {
      return;
    }

    notificationRequestRef.current = true;

    if (mountedRef.current) {
      setNotificationLoading(true);
    }

    try {
     const snapshot = await fetchAgentNotificationSnapshot();

      if (!mountedRef.current) {
        return;
      }

      setBackendOnline(true);

      const safeItems = Array.isArray(snapshot?.items)
  ? snapshot.items
  : [];

const safeUnreadCount =
  Number.isFinite(Number(snapshot?.unreadCount))
    ? Number(snapshot.unreadCount)
    : 0;

      setUnreadCount(safeUnreadCount);
      setNotificationPreview(safeItems.slice(0, 5));

      const newlyArrived = safeItems.filter((item) => {
        const id = String(item.id ?? '');

        return (
          id.length > 0 &&
          !seenNotificationIdsRef.current.has(id)
        );
      });

      safeItems.forEach((item) => {
        const id = String(item.id ?? '');

        if (id.length > 0) {
          seenNotificationIdsRef.current.add(id);
        }
      });

      // Le premier chargement sert de référence.
      // Il ne déclenche pas de fausse alerte.

      if (
        notificationsInitializedRef.current &&
        newlyArrived.length > 0
      ) {
        const newest =
          newlyArrived.find(
            (item) => item.statut === 'EN_ATTENTE',
          ) || newlyArrived[0];

        if (newest) {
  const isPending =
    'statut' in newest &&
    newest.statut === 'EN_ATTENTE';

  if (isPending || safeUnreadCount > 0) {
    setNotificationAlert(newest);
  } else {
    setNotificationAlert(null);
  }
} else {
  setNotificationAlert(null);
}
      }

      notificationsInitializedRef.current = true;
    } catch (error) {
      if (mountedRef.current) {
        setBackendOnline(false);

        console.warn(
          'Actualisation des notifications impossible.',
          error,
        );
      }
    } finally {
      notificationRequestRef.current = false;

      if (mountedRef.current) {
        setNotificationLoading(false);
      }
    }
  }, [user]);

  // ==========================================================
  // POLLING DES NOTIFICATIONS
  // ==========================================================

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    void refreshNotifications();

    const intervalId = setInterval(() => {
      void refreshNotifications();
    }, NOTIFICATION_POLL_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [refreshNotifications, user]);

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const navigate = useCallback(
    (page: AgentPageKey) => {
      setScreen({
        type: 'page',
        page,
      });
      setNotificationPopupOpen(false);

      setRefreshKey((value) => value + 1);

      if (!isTablet) {
        setSidebarExpanded(false);
      }
    },
    [isTablet],
  );

  const openMission = useCallback(
    (missionId: number) => {
      setScreen({
        type: 'mission',
        missionId,
      });
      setNotificationPopupOpen(false);

      if (!isTablet) {
        setSidebarExpanded(false);
      }
    },
    [isTablet],
  );

  const openMissionReleve = useCallback(
    (mission: AgentMission) => {
      setScreen({
        type: 'releve',
        mission,
        returnPage: 'missions',
      });

      if (!isTablet) {
        setSidebarExpanded(false);
      }
    },
    [isTablet],
  );

  const openCounterReleve = useCallback(
    (
      compteur: AgentCompteur,
      returnPage: AgentPageKey = 'compteurs',
    ) => {
      setScreen({
        type: 'releve',
        compteur,
        returnPage,
      });

      if (!isTablet) {
        setSidebarExpanded(false);
      }
    },
    [isTablet],
  );

  const openNotificationItem = useCallback(async (item: AgentNotification) => {
    setNotificationPopupOpen(false);

    if (String(item.statut || '').toUpperCase() === 'EN_ATTENTE') {
      try {
        await markAgentNotificationAsRead(item.id);
      } catch (error) {
        console.warn('Impossible de marquer la notification comme lue.', error);
      }
    }

    const missionId = Number(item.mission_id);
    if (Number.isSafeInteger(missionId) && missionId > 0) {
      openMission(missionId);
    } else {
      navigate('notifications');
    }

    void refreshNotifications();
  }, [navigate, openMission, refreshNotifications]);

  // ==========================================================
  // SOUS-TITRE
  // ==========================================================

  const pageSubtitle = useMemo(() => {
    if (screen.type === 'mission') {
      return `Détail de la mission #${screen.missionId}`;
    }

    if (screen.type === 'releve') {
      return 'Saisie du nouvel index observé';
    }

    return 'Espace Agent · JIRAMA Antsirabe';
  }, [screen]);

  // ==========================================================
  // CHARGEMENT DE SESSION
  // ==========================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingScreen}
        edges={['top', 'bottom']}
      >
        <StatusBar barStyle="dark-content" />

        <Image
          source={require('../../assets/jirama-logo.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />

        <ActivityIndicator
          color={COLORS.blue}
          size="large"
        />

        <Text style={styles.loadingText}>
          Vérification de votre session Agent…
        </Text>
      </SafeAreaView>
    );
  }

  // ==========================================================
  // CONNEXION
  // ==========================================================

  if (!user) {
    return <LoginScreen offlineWarning={offlineWarning} />;
  }

  // ==========================================================
  // AFFICHAGE DES PAGES
  // ==========================================================

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
  const currentMission = screen.mission ?? null;
  const currentCompteur = screen.compteur ?? null;

  const handleBack = () => {
    if (currentMission) {
      setScreen({
        type: 'mission',
        missionId: currentMission.id,
      });
      return;
    }

    navigate(screen.returnPage);
  };

  const handleSaved = () => {
    setRefreshKey((value) => value + 1);

    if (currentMission) {
      setScreen({
        type: 'mission',
        missionId: currentMission.id,
      });
    } else {
      navigate(screen.returnPage);
    }

    void refreshNotifications();
  };

  return (
    <ReleveFormScreen
  key={`releve-${currentMission?.id ?? currentCompteur?.id ?? 'new'}`}
  mission={currentMission ?? undefined}
  compteur={currentCompteur ?? undefined}
  onBack={handleBack}
  onSaved={handleSaved}
/>
  );
}
    switch (screen.page) {
      case 'dashboard':
        return (
          <AgentDashboardScreen
            key={`dashboard-${refreshKey}`}
            onNavigate={navigate}
            onSelectMission={openMission}
          />
        );

      case 'compteurs':
        return (
          <CompteursScreen
            key={`compteurs-${refreshKey}`}
            onCreateReleve={(meter) =>
              openCounterReleve(meter, 'compteurs')
            }
          />
        );

      case 'abonnes':
        return (
          <AbonnesScreen
            key={`abonnes-${refreshKey}`}
          />
        );

      case 'releves':
        return (
          <RelevesScreen
            key={`releves-${refreshKey}`}
            onCreate={(meter) =>
              openCounterReleve(meter, 'releves')
            }
          />
        );

      case 'missions':
        return (
          <MissionsScreen
            key={`missions-${refreshKey}`}
            onSelect={(mission) =>
              openMission(mission.id)
            }
          />
        );

      case 'anomalies':
        return (
          <AnomaliesScreen
            key={`anomalies-${refreshKey}`}
          />
        );

      case 'notifications':
        return (
          <NotificationsScreen
            key={`notifications-${refreshKey}`}
            onOpenMission={openMission}
            onChanged={() => {
              void refreshNotifications();
            }}
          />
        );

      case 'audit':
        return (
          <JournalAuditScreen
            key={`audit-${refreshKey}`}
          />
        );

      case 'aide':
        return <AideScreen />;

      case 'parametres':
        return (
          <SettingsScreen
            key={`settings-${refreshKey}`}
          />
        );

      case 'profil':
        return <ProfileScreen />;

      default:
        return (
          <AgentDashboardScreen
            onNavigate={navigate}
            onSelectMission={openMission}
          />
        );
    }
  };

  // ==========================================================
  // DONNÉES D'AFFICHAGE
  // ==========================================================

  const sidebarOverlay = !isTablet && sidebarExpanded;

  const sidebarWidth = isTablet
    ? sidebarExpanded
      ? 224
      : 62
    : sidebarExpanded
      ? 232
      : 58;

  const firstName = user.prenom || 'Agent';

  const initials = (
    `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`
  ).toUpperCase() || 'A';

  const isNotifications =
    screen.type === 'page' &&
    screen.page === 'notifications';

  const alertText = getNotificationText(notificationAlert);

  const connectionLabel =
    backendOnline === null
      ? 'Vérification de la connexion…'
      : backendOnline
        ? 'Backend connecté'
        : 'Backend indisponible';

  const currentTitle =
    screen.type === 'releve'
      ? 'Saisie du relevé'
      : screen.type === 'mission'
        ? 'Détail de mission'
        : PAGE_TITLES[screen.page];

  // ==========================================================
  // INTERFACE PRINCIPALE
  // ==========================================================

  return (
    <View style={styles.background}>
      {isTablet && (
        <Image
          source={require('../../assets/jirama-background.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      )}

      <View style={styles.backgroundWash}>
        <SafeAreaView
          style={styles.safe}
          edges={['top', 'bottom']}
        >
          <StatusBar barStyle="light-content" />

          <View style={[styles.appShell, !isTablet && styles.appShellMobile]}>
            {/* NAVIGATION LATERALE RÉSERVÉE AUX TABLETTES ET AUX ÉCRANS LARGES */}
            {isTablet && (
            <View
              style={[
                styles.sidebar,
                { width: sidebarWidth },
                sidebarOverlay && styles.sidebarOverlay,
              ]}
            >
              <View
                style={[
                  styles.sidebarBrand,
                  !sidebarExpanded && styles.sidebarBrandCompact,
                ]}
              >
                <Image
                  source={require('../../assets/jirama-logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />

                {sidebarExpanded && (
                  <View style={styles.brandCopy}>
                    <Text style={styles.brandName}>
                      JIRAMA
                    </Text>

                    <Text style={styles.brandSubtitle}>
                      ESPACE AGENT
                    </Text>
                  </View>
                )}
              </View>

              <Pressable
                onPress={() =>
                  setSidebarExpanded((value) => !value)
                }
                style={[
                  styles.collapseButton,
                  !sidebarExpanded &&
                    styles.collapseButtonCompact,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  sidebarExpanded
                    ? 'Réduire le menu'
                    : 'Agrandir le menu'
                }
              >
                <Ionicons
                  name={
                    sidebarExpanded
                      ? 'chevron-back-outline'
                      : 'menu-outline'
                  }
                  size={21}
                  color={COLORS.blue}
                />

                {sidebarExpanded && (
                  <Text style={styles.collapseText}>
                    Réduire le menu
                  </Text>
                )}
              </Pressable>

              <ScrollView
                style={styles.sidebarScroll}
                contentContainerStyle={styles.sidebarItems}
                showsVerticalScrollIndicator={false}
              >
                <Text
                  style={[
                    styles.menuSectionLabel,
                    !sidebarExpanded && styles.hiddenLabel,
                  ]}
                >
                  MENU PRINCIPAL
                </Text>

                {MENU_ITEMS.filter(
                  (item) => item.group === 'main' && item.key !== 'notifications',
                ).map((item) => (
                  <SidebarItem
                    key={item.key}
                    item={item}
                    active={activePage === item.key}
                    expanded={sidebarExpanded}
                    onPress={() => navigate(item.key)}
                  />
                ))}

                <View style={styles.sidebarDivider} />

                <Text
                  style={[
                    styles.menuSectionLabel,
                    !sidebarExpanded && styles.hiddenLabel,
                  ]}
                >
                  ASSISTANCE
                </Text>

                {MENU_ITEMS.filter(
                  (item) => item.group === 'footer',
                ).map((item) => (
                  <SidebarItem
                    key={item.key}
                    item={item}
                    active={activePage === item.key}
                    expanded={sidebarExpanded}
                    onPress={() => navigate(item.key)}
                  />
                ))}
              </ScrollView>

              {/* PROFIL AGENT */}

              <Pressable
                onPress={() => navigate('profil')}
                style={[
                  styles.profileMenu,
                  activePage === 'profil' &&
                    styles.menuItemActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Ouvrir mon profil"
              >
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>
                    {initials}
                  </Text>
                </View>

                {sidebarExpanded && (
                  <View style={styles.profileText}>
                    <Text
                      numberOfLines={1}
                      style={styles.profileName}
                    >
                      {firstName} {user.nom}
                    </Text>

                    <Text style={styles.profileRole}>
                      AGENT
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
            )}

            {/* COLONNE PRINCIPALE */}

            <View style={[styles.mainColumn, !isTablet && styles.mainColumnMobile]}>
              {/* EN-TÊTE RESPONSIVE : NAVIGATION TABLETTE / MARQUE MOBILE */}

              {isTablet ? (
                <View style={styles.topbar}>
                  <Pressable
                    onPress={() => setSidebarExpanded((value) => !value)}
                    style={styles.menuToggle}
                    accessibilityRole="button"
                    accessibilityLabel={sidebarExpanded ? 'Réduire le menu' : 'Agrandir le menu'}
                  >
                    <Ionicons name={sidebarExpanded ? 'chevron-back-outline' : 'menu-outline'} size={24} color={COLORS.white} />
                  </Pressable>

                  <View style={styles.topbarTitleBlock}>
                    <Text numberOfLines={1} style={styles.topbarTitle}>{currentTitle}</Text>
                    <Text numberOfLines={1} style={styles.topbarSubtitle}>{pageSubtitle}</Text>
                  </View>

                  <View style={styles.topbarActions}>
                    <Pressable
                      onPress={() => {
                        setNotificationPopupOpen(true);
                        void refreshNotifications();
                      }}
                      style={[styles.notificationButton, isNotifications && styles.notificationButtonActive]}
                      accessibilityRole="button"
                      accessibilityLabel={`Ouvrir les notifications, ${unreadCount} non lues`}
                    >
                      <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={24} color={COLORS.white} />
                      {unreadCount > 0 && (
                        <View style={styles.notificationCount}>
                          <Text style={styles.notificationCountText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
                        </View>
                      )}
                    </Pressable>

                    <Pressable onPress={() => navigate('profil')} style={styles.topbarUser} accessibilityRole="button" accessibilityLabel="Ouvrir mon profil">
                      <View style={styles.topbarAvatar}><Text style={styles.topbarAvatarText}>{initials}</Text></View>
                      <View style={styles.topbarUserText}>
                        <Text numberOfLines={1} style={styles.topbarUserName}>{firstName}</Text>
                        <Text style={styles.topbarUserRole}>Agent</Text>
                      </View>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.mobileBrandBar}>
                  <View style={styles.mobileBrandBlock}>
                    <View style={styles.mobileLogoFrame}>
                      <Image source={require('../../assets/jirama-logo.png')} style={styles.mobileLogo} resizeMode="contain" />
                    </View>
                    <View style={styles.mobileBrandCopy}>
                      <Text style={styles.mobileBrandName}>JIRAMA</Text>
                      <View style={styles.mobileAgentPill}><Text style={styles.mobileAgentPillText}>AGENT</Text></View>
                    </View>
                  </View>

                  <View style={styles.mobileHeaderActions}>
                    <Pressable
                      onPress={() => {
                        setNotificationPopupOpen(true);
                        void refreshNotifications();
                      }}
                      style={styles.mobileNotificationButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Notifications, ${unreadCount} non lues`}
                    >
                      <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={25} color={COLORS.white} />
                      {unreadCount > 0 && (
                        <View style={styles.notificationCount}>
                          <Text style={styles.notificationCountText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
                        </View>
                      )}
                    </Pressable>
                    <Pressable onPress={() => navigate('profil')} style={styles.mobileAvatar} accessibilityRole="button" accessibilityLabel="Ouvrir mon profil">
                      <Text style={styles.mobileAvatarText}>{initials}</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* ALERTE NOTIFICATION */}

              {isTablet && notificationAlert && !isNotifications && (
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
                    <View style={styles.notificationAlertIcon}>
                      <Ionicons
                        name="notifications"
                        size={21}
                        color={COLORS.blue}
                      />
                    </View>

                    <View
                      style={styles.notificationAlertTextBlock}
                    >
                      <Text
                        numberOfLines={1}
                        style={styles.notificationAlertTitle}
                      >
                        {alertText.title}
                      </Text>

                      <Text
                        numberOfLines={2}
                        style={styles.notificationAlertMessage}
                      >
                        {alertText.message}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => setNotificationAlert(null)}
                    style={styles.dismissAlertButton}
                    accessibilityRole="button"
                    accessibilityLabel="Fermer l’alerte"
                  >
                    <Ionicons
                      name="close-outline"
                      size={22}
                      color={COLORS.muted}
                    />
                  </Pressable>
                </View>
              )}

              {/* CONTENU DE LA PAGE */}

              <View style={styles.contentFrame}>
                {renderPage()}
              </View>

              {/* ETAT DE CONNEXION */}

              {isTablet && <View style={styles.bottomStatus}>
                <View
                  style={[
                    styles.onlineDot,
                    backendOnline === false &&
                      styles.onlineDotOffline,
                    backendOnline === null &&
                      styles.onlineDotPending,
                  ]}
                />

                <Text
                  numberOfLines={1}
                  style={styles.bottomStatusText}
                >
                  {notificationLoading
                    ? 'Actualisation des notifications…'
                    : connectionLabel}
                </Text>

                {width >= 440 && (
                  <Text style={styles.bottomStatusHint}>
                    Espace Agent sécurisé
                  </Text>
                )}
              </View>}

              {/* FOOTER JIRAMA */}

              {isTablet && <View style={styles.footer}>
                <Text
                  numberOfLines={1}
                  style={styles.footerBrand}
                >
                  JIRAMA · Jiro sy Rano Malagasy
                </Text>

                <Text
                  numberOfLines={1}
                  style={styles.footerText}
                >
                  Assistance clientèle : 547
                </Text>

                {width >= 390 && (
                  <Text
                    numberOfLines={1}
                    style={styles.footerTagline}
                  >
                    Au service de tous pour un développement durable.
                  </Text>
                )}
              </View>}

              {!isTablet && (
                <MobileBottomNavigation
                  activeKey={screen.type === 'mission' ? 'missions' : screen.type === 'releve' ? 'releves' : screen.page}
                  onNavigate={navigate}
                />
              )}
            </View>

            {/* FOND SOMBRE DU MENU MOBILE */}

            {sidebarOverlay && (
              <Pressable
                style={styles.sidebarScrim}
                onPress={() => setSidebarExpanded(false)}
                accessibilityRole="button"
                accessibilityLabel="Fermer le menu latéral"
              />
            )}
          </View>

          <Modal
            visible={notificationPopupOpen}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => setNotificationPopupOpen(false)}
          >
            <View style={styles.notificationModalRoot}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setNotificationPopupOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Fermer les notifications"
              />
              <View style={[styles.notificationPopover, !isTablet && styles.notificationPopoverMobile]}>
                <View style={styles.notificationPopoverHeader}>
                  <View style={styles.notificationPopoverHeading}>
                    <Text style={styles.notificationPopoverTitle}>Notifications</Text>
                    <Text style={styles.notificationPopoverSubtitle}>{unreadCount} non lue(s)</Text>
                  </View>
                  <Pressable onPress={() => setNotificationPopupOpen(false)} style={styles.notificationPopoverClose} accessibilityRole="button" accessibilityLabel="Fermer">
                    <Ionicons name="close" size={21} color={COLORS.muted} />
                  </Pressable>
                </View>

                {notificationLoading && notificationPreview.length === 0 ? (
                  <View style={styles.notificationPopoverEmpty}>
                    <ActivityIndicator color={COLORS.blue} />
                    <Text style={styles.notificationPopoverEmptyText}>Chargement…</Text>
                  </View>
                ) : notificationPreview.length === 0 ? (
                  <View style={styles.notificationPopoverEmpty}>
                    <Ionicons name="notifications-off-outline" size={28} color={COLORS.subtle} />
                    <Text style={styles.notificationPopoverEmptyText}>Aucune notification récente.</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.notificationPreviewList} keyboardShouldPersistTaps="handled">
                    {notificationPreview.slice(0, 5).map((item) => {
                      const unread = String(item.statut || '').toUpperCase() === 'EN_ATTENTE';
                      const label = String((item as any).sujet || (item as any).type || 'Notification');
                      const message = String(item.message || 'Ouvrir pour consulter le détail.');
                      const dateValue = item.created_at || item.date_envoi;
                      return (
                        <Pressable
                          key={String(item.id)}
                          onPress={() => void openNotificationItem(item)}
                          style={({ pressed }) => [styles.notificationPreviewItem, unread && styles.notificationPreviewUnread, pressed && styles.notificationPreviewPressed]}
                          accessibilityRole="button"
                        >
                          <View style={[styles.notificationPreviewDot, unread && styles.notificationPreviewDotUnread]} />
                          <View style={styles.notificationPreviewCopy}>
                            <Text numberOfLines={1} style={styles.notificationPreviewTitle}>{label}</Text>
                            <Text numberOfLines={2} style={styles.notificationPreviewMessage}>{message}</Text>
                            <Text style={styles.notificationPreviewDate}>{formatNotificationDate(dateValue)}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={17} color={COLORS.subtle} />
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}

                <Pressable
                  onPress={() => {
                    setNotificationPopupOpen(false);
                    navigate('notifications');
                  }}
                  style={styles.notificationViewAll}
                  accessibilityRole="button"
                >
                  <Text style={styles.notificationViewAllText}>Voir toutes les notifications</Text>
                  <Ionicons name="arrow-forward" size={17} color={COLORS.white} />
                </Pressable>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </View>
    </View>
  );
}

function formatNotificationDate(value: unknown): string {
  if (!value) return 'Date non renseignée';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function MobileBottomNavigation({
  activeKey,
  onNavigate,
}: {
  activeKey: AgentPageKey;
  onNavigate: (page: AgentPageKey) => void;
}) {
  const tabs: Array<{ key: AgentPageKey; label: string; icon: IoniconName; activeIcon: IoniconName }> = [
    { key: 'dashboard', label: 'Accueil', icon: 'home-outline', activeIcon: 'home' },
    { key: 'missions', label: 'Missions', icon: 'briefcase-outline', activeIcon: 'briefcase' },
    { key: 'releves', label: 'Relevés', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
    { key: 'profil', label: 'Profil', icon: 'person-outline', activeIcon: 'person' },
  ];

  return (
    <View style={styles.mobileBottomNav}>
      {tabs.map((tab) => {
        const active = activeKey === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onNavigate(tab.key)}
            style={styles.mobileTab}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
          >
            <Ionicons name={active ? tab.activeIcon : tab.icon} size={23} color={active ? COLORS.blue : COLORS.subtle} />
            <Text style={[styles.mobileTabLabel, active && styles.mobileTabLabelActive]}>{tab.label}</Text>
            {active && <View style={styles.mobileTabIndicator} />}
          </Pressable>
        );
      })}
    </View>
  );
}

// ============================================================
// COMPOSANT MENU ITEM
// ============================================================

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
      <Ionicons
        name={item.icon}
        size={22}
        color={active ? COLORS.blue : COLORS.muted}
        style={styles.menuIcon}
      />

      {expanded && (
        <Text
          numberOfLines={1}
          style={[
            styles.menuLabel,
            active && styles.menuLabelActive,
          ]}
        >
          {item.label}
        </Text>
      )}

      {active && expanded && (
        <View style={styles.activeMarker} />
      )}
    </Pressable>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  loadingLogo: {
    width: 74,
    height: 74,
    marginBottom: 8,
  },

  loadingText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },

  background: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

backgroundImage: {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: '100%',
  height: '100%',
  opacity: 0.13,
},

  backgroundWash: {
    flex: 1,
    backgroundColor: 'rgba(243,247,250,0.88)',
  },

  safe: {
    flex: 1,
  },

  appShell: {
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
    backgroundColor: 'rgba(237,242,247,0.10)',
  },

  appShellMobile: {
    flexDirection: 'column',
    backgroundColor: COLORS.background,
  },

  mainColumn: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'transparent',
  },

  mainColumnMobile: {
    backgroundColor: COLORS.background,
  },

  mobileBrandBar: {
    minHeight: 82,
    paddingHorizontal: 17,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: COLORS.navy,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  mobileBrandBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  mobileLogoFrame: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.white, padding: 3, alignItems: 'center', justifyContent: 'center' },
  mobileLogo: { width: 48, height: 48 },
  mobileBrandCopy: { gap: 3 },
  mobileBrandName: { color: COLORS.white, fontSize: 22, lineHeight: 25, fontWeight: '900', letterSpacing: 1 },
  mobileAgentPill: { alignSelf: 'flex-start', backgroundColor: COLORS.yellow, paddingHorizontal: 13, paddingVertical: 3, borderRadius: 14 },
  mobileAgentPillText: { color: COLORS.navy, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  mobileHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mobileNotificationButton: { width: 45, height: 45, borderRadius: 23, alignItems: 'center', justifyContent: 'center', position: 'relative', backgroundColor: 'rgba(255,255,255,0.12)' },
  mobileAvatar: { width: 43, height: 43, borderRadius: 22, borderWidth: 2, borderColor: COLORS.white, backgroundColor: '#DCEBFA', alignItems: 'center', justifyContent: 'center' },
  mobileAvatarText: { color: COLORS.navy, fontSize: 13, fontWeight: '900' },

  mobileBottomNav: { minHeight: 66, paddingBottom: 2, paddingTop: 5, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-around', elevation: 8 },
  mobileTab: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative' },
  mobileTabLabel: { color: COLORS.subtle, fontSize: 10, fontWeight: '700' },
  mobileTabLabelActive: { color: COLORS.blue, fontWeight: '900' },
  mobileTabIndicator: { position: 'absolute', bottom: 0, width: '58%', height: 3, borderRadius: 3, backgroundColor: COLORS.blue },

  notificationModalRoot: { flex: 1, backgroundColor: 'rgba(5,22,40,0.45)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 62, paddingHorizontal: 12 },
  notificationPopover: { width: 370, maxWidth: '100%', maxHeight: '78%', backgroundColor: COLORS.white, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: COLORS.border, elevation: 18, shadowColor: '#001A31', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  notificationPopoverMobile: { width: '100%', maxHeight: '72%' },
  notificationPopoverHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  notificationPopoverHeading: { gap: 3 },
  notificationPopoverTitle: { color: COLORS.navy, fontSize: 18, fontWeight: '900' },
  notificationPopoverSubtitle: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  notificationPopoverClose: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  notificationPreviewList: { maxHeight: 390, marginTop: 4 },
  notificationPopoverEmpty: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 10 },
  notificationPopoverEmptyText: { color: COLORS.subtle, fontSize: 12, fontWeight: '700' },
  notificationPreviewItem: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 7, borderBottomWidth: 1, borderBottomColor: '#EDF1F6', borderRadius: 10 },
  notificationPreviewUnread: { backgroundColor: '#F0F7FD' },
  notificationPreviewPressed: { opacity: 0.72 },
  notificationPreviewDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.borderStrong },
  notificationPreviewDotUnread: { backgroundColor: COLORS.red },
  notificationPreviewCopy: { flex: 1, gap: 3 },
  notificationPreviewTitle: { color: COLORS.navy, fontSize: 12, fontWeight: '900' },
  notificationPreviewMessage: { color: COLORS.muted, fontSize: 10, lineHeight: 15 },
  notificationPreviewDate: { color: COLORS.subtle, fontSize: 9 },
  notificationViewAll: { minHeight: 44, backgroundColor: COLORS.blue, borderRadius: 12, marginTop: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notificationViewAllText: { color: COLORS.white, fontSize: 12, fontWeight: '900' },

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

  menuToggle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  topbarTitleBlock: {
    flex: 1,
    minWidth: 0,
  },

  topbarTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
  },

  topbarSubtitle: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 9,
    marginTop: 4,
  },

  topbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  notificationButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  notificationButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },

  notificationCount: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: COLORS.white,
  },

  notificationCountText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '900',
  },

  topbarUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  topbarAvatar: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: COLORS.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },

  topbarAvatarText: {
    color: COLORS.navy,
    fontSize: 10,
    fontWeight: '900',
  },

  topbarUserText: {
    maxWidth: 72,
  },

  topbarUserName: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
  },

  topbarUserRole: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 8,
    marginTop: 1,
  },

  notificationAlert: {
    minHeight: 62,
    marginHorizontal: 9,
    marginTop: 8,
    marginBottom: 2,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 7,
    borderRadius: 13,
    backgroundColor: '#E4F5FC',
    borderWidth: 1,
    borderColor: '#B8E4F4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  notificationAlertContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  notificationAlertIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C9ECF9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationAlertTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  notificationAlertTitle: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: '900',
  },

  notificationAlertMessage: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 2,
  },

  dismissAlertButton: {
    width: 34,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  contentFrame: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'rgba(243,247,250,0.91)',
  },

  bottomStatus: {
    minHeight: 23,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2BA96B',
  },

  onlineDotOffline: {
    backgroundColor: '#E25252',
  },

  onlineDotPending: {
    backgroundColor: '#E6AB32',
  },

  bottomStatusText: {
    color: COLORS.subtle,
    fontSize: 8,
    flex: 1,
  },

  bottomStatusHint: {
    color: COLORS.subtle,
    fontSize: 8,
  },

  footer: {
    minHeight: 43,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#E5F2F9',
    borderTopWidth: 1,
    borderTopColor: '#D1E5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerBrand: {
    color: COLORS.navy,
    fontSize: 9,
    fontWeight: '900',
  },

  footerText: {
    color: COLORS.blue,
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
  },

  footerTagline: {
    color: COLORS.muted,
    fontSize: 7,
    fontStyle: 'italic',
    marginTop: 2,
  },

  sidebar: {
    backgroundColor: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingTop: 7,
    paddingBottom: 7,
    zIndex: 5,
  },

  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 30,
    elevation: 12,
    shadowColor: '#061B2D',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: {
      width: 3,
      height: 0,
    },
  },

  sidebarScrim: {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  backgroundColor: 'rgba(4,20,34,0.40)',
  zIndex: 20,
  elevation: 10,
},

  sidebarBrand: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  sidebarBrandCompact: {
    justifyContent: 'center',
    paddingHorizontal: 5,
  },

  logo: {
    width: 37,
    height: 37,
  },

  brandCopy: {
    flex: 1,
    minWidth: 0,
  },

  brandName: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  brandSubtitle: {
    color: COLORS.blue,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 2,
  },

  collapseButton: {
    height: 40,
    marginHorizontal: 9,
    marginTop: 9,
    marginBottom: 7,
    borderRadius: 10,
    backgroundColor: COLORS.blueLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  collapseButtonCompact: {
    marginHorizontal: 7,
  },

  collapseText: {
    color: COLORS.blue,
    fontSize: 9,
    fontWeight: '900',
  },

  sidebarScroll: {
    flex: 1,
  },

  sidebarItems: {
    paddingHorizontal: 7,
    paddingBottom: 10,
  },

  menuSectionLabel: {
    color: COLORS.subtle,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 7,
  },

  hiddenLabel: {
    height: 7,
    paddingTop: 0,
    paddingBottom: 0,
    opacity: 0,
  },

  menuItem: {
    minHeight: 43,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    marginBottom: 4,
    gap: 9,
    position: 'relative',
  },

  menuItemCompact: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },

  menuItemActive: {
    backgroundColor: COLORS.blueLight,
  },

  menuItemPressed: {
    opacity: 0.72,
  },

  menuIcon: {
    width: 27,
    textAlign: 'center',
  },

  menuLabel: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '800',
    flex: 1,
  },

  menuLabelActive: {
    color: COLORS.blue,
    fontWeight: '900',
  },

  activeMarker: {
    position: 'absolute',
    left: 0,
    top: 9,
    bottom: 9,
    width: 3,
    borderRadius: 3,
    backgroundColor: COLORS.blue,
  },

  sidebarDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 6,
    marginTop: 8,
    marginBottom: 3,
  },

  profileMenu: {
    minHeight: 52,
    marginHorizontal: 7,
    paddingHorizontal: 7,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  profileAvatar: {
    width: 33,
    height: 33,
    borderRadius: 17,
    backgroundColor: COLORS.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileAvatarText: {
    color: COLORS.blue,
    fontSize: 10,
    fontWeight: '900',
  },

  profileText: {
    flex: 1,
    minWidth: 0,
  },

  profileName: {
    color: COLORS.navy,
    fontSize: 9,
    fontWeight: '900',
  },

  profileRole: {
    color: COLORS.subtle,
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
  },
});
