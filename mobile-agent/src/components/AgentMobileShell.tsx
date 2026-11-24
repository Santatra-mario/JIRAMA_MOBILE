import React, { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';

export type AgentNavItem = {
  key: string;
  label: string;
  emoji: string;
  badge?: number;
};

export type AgentConnectionState = 'connected' | 'offline' | 'checking' | 'unknown';

type AgentMobileShellProps = {
  title: string;
  subtitle?: string;
  activeKey: string;
  items: AgentNavItem[];
  onNavigate: (key: string) => void;
  children: ReactNode;
  userName?: string;
  notificationCount?: number;
  /** ID rÃ©el de la derniÃ¨re notification, fourni par le service existant si disponible. */
  latestNotificationId?: string | number | null;
  onNotificationsPress?: () => void;
  connectionState?: AgentConnectionState;
};

const CONNECTION_LABEL: Record<AgentConnectionState, string> = {
  connected: 'Serveur connectÃ©',
  offline: 'Hors connexion',
  checking: 'VÃ©rification de la connexionâ€¦',
  unknown: 'Ã‰tat du serveur non vÃ©rifiÃ©',
};

/**
 * Coque responsive partagÃ©e de l'espace Agent.
 * Ce composant ne crÃ©e aucune route et n'appelle aucune API mÃ©tier.
 * La navigation, le compteur de notifications et l'Ã©tat rÃ©seau proviennent du parent.
 */
export default function AgentMobileShell({
  title,
  subtitle = 'JIRAMA ANTSIRABE Â· ESPACE AGENT',
  activeKey,
  items,
  onNavigate,
  children,
  userName = 'Agent',
  notificationCount = 0,
  latestNotificationId = null,
  onNotificationsPress,
  connectionState = 'unknown',
}: AgentMobileShellProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const previousCount = useRef(notificationCount);
  const previousNotificationId = useRef(latestNotificationId);

  useEffect(() => {
    const countIncreased = notificationCount > previousCount.current;
    const hasNewNotificationId =
      latestNotificationId !== null &&
      latestNotificationId !== undefined &&
      previousNotificationId.current !== null &&
      previousNotificationId.current !== undefined &&
      latestNotificationId !== previousNotificationId.current;

    // Ne dÃ©clenche pas d'alerte au premier chargement ni lorsque le compteur diminue.
    if (countIncreased || hasNewNotificationId) {
      setAlertVisible(true);
    }

    previousCount.current = notificationCount;
    previousNotificationId.current = latestNotificationId;
  }, [notificationCount, latestNotificationId]);

  useEffect(() => {
    if (isTablet) setMenuOpen(false);
  }, [isTablet]);

  const navigate = (key: string) => {
    if (key === 'notifications') setAlertVisible(false);
    onNavigate(key);
    setMenuOpen(false);
  };

  const safeUserName = userName.trim() || 'Agent';
  const connectionColor =
    connectionState === 'connected'
      ? COLORS.success
      : connectionState === 'offline'
        ? COLORS.danger
        : COLORS.warning;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.root}>
        {isTablet ? (
          <Sidebar items={items} activeKey={activeKey} expanded onNavigate={navigate} />
        ) : (
          <View style={styles.mobileRail}>
            <Pressable
              onPress={() => setMenuOpen(true)}
              style={styles.railMenuButton}
              accessibilityRole="button"
              accessibilityLabel="Ouvrir le menu Agent"
            >
              <Text style={styles.railMenuEmoji}>â˜°</Text>
            </Pressable>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.railItems}
            >
              {items.map((item) => (
                <RailItem
                  key={item.key}
                  item={item}
                  active={activeKey === item.key}
                  onPress={() => navigate(item.key)}
                />
              ))}
            </ScrollView>
            <View style={styles.railBottomMark}>
              <Text style={styles.railBottomText}>JR</Text>
            </View>
          </View>
        )}

        <View style={styles.main}>
          <View style={styles.topBar}>
            {!isTablet ? (
              <Pressable
                onPress={() => setMenuOpen(true)}
                style={styles.mobileMenuButton}
                accessibilityRole="button"
                accessibilityLabel="Afficher toutes les rubriques"
              >
                <Text style={styles.mobileMenuText}>â˜°</Text>
              </Pressable>
            ) : null}
            <View style={styles.titleBlock}>
              <Text numberOfLines={1} style={styles.pageTitle}>{title}</Text>
              <Text numberOfLines={1} style={styles.pageSubtitle}>{subtitle}</Text>
            </View>
            <View style={styles.topActions}>
              <Pressable
                onPress={onNotificationsPress}
                style={styles.notificationButton}
                accessibilityRole="button"
                accessibilityLabel={`Notifications, ${notificationCount} non lues`}
              >
                <Text style={styles.notificationEmoji}>ðŸ””</Text>
                {notificationCount > 0 ? (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{safeUserName[0].toUpperCase()}</Text>
              </View>
            </View>
          </View>

          <View style={styles.connectionStrip}>
            <View style={[styles.connectionDot, { backgroundColor: connectionColor }]} />
            <Text style={styles.connectionText}>{CONNECTION_LABEL[connectionState]}</Text>
          </View>

          {alertVisible && notificationCount > 0 ? (
            <View style={styles.alertBanner} accessibilityRole="alert">
              <Text style={styles.alertEmoji}>ðŸ””</Text>
              <View style={styles.alertTextBlock}>
                <Text style={styles.alertTitle}>Nouvelle notification</Text>
                <Text style={styles.alertText}>
                  {notificationCount} notification(s) non lue(s).
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setAlertVisible(false);
                  onNotificationsPress?.();
                }}
                style={styles.alertAction}
                accessibilityRole="button"
              >
                <Text style={styles.alertActionText}>Voir</Text>
              </Pressable>
              <Pressable
                onPress={() => setAlertVisible(false)}
                style={styles.alertClose}
                accessibilityRole="button"
                accessibilityLabel="Fermer l'alerte"
              >
                <Text style={styles.alertCloseText}>Ã—</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.pageContent}>{children}</View>
          <View style={styles.footer}>
            <Text style={styles.footerBrand}>JIRAMA Â· Jiro sy Rano Malagasy</Text>
            <Text style={styles.footerLine}>Assistance : 547 Â· service-client@jirama.mg</Text>
            <Text style={styles.footerSmall}>Au service de tous pour un dÃ©veloppement durable.</Text>
          </View>
        </View>

        {!isTablet && menuOpen ? (
          <View style={styles.overlayLayer}>
            <Pressable
              style={styles.overlayBackdrop}
              onPress={() => setMenuOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Fermer le menu"
            />
            <View style={styles.overlaySidebar}>
              <View style={styles.overlayHeader}>
                <View>
                  <Text style={styles.overlayBrand}>JIRAMA</Text>
                  <Text style={styles.overlayCaption}>ESPACE AGENT Â· ANTSIRABE</Text>
                </View>
                <Pressable onPress={() => setMenuOpen(false)} style={styles.overlayClose}>
                  <Text style={styles.overlayCloseText}>Ã—</Text>
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.overlayItems}>
                {items.map((item) => (
                  <SidebarItem
                    key={item.key}
                    item={item}
                    active={activeKey === item.key}
                    expanded
                    onPress={() => navigate(item.key)}
                  />
                ))}
              </ScrollView>
              <Text style={styles.sidebarFooterText}>Jiro sy Rano Malagasy</Text>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function RailItem({ item, active, onPress }: { item: AgentNavItem; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.railItem, active && styles.railItemActive]}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
    >
      <Text style={styles.railEmoji}>{item.emoji}</Text>
      {typeof item.badge === 'number' && item.badge > 0 ? (
        <View style={styles.railBadge}>
          <Text style={styles.railBadgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function Sidebar({
  items,
  activeKey,
  expanded,
  onNavigate,
}: {
  items: AgentNavItem[];
  activeKey: string;
  expanded: boolean;
  onNavigate: (key: string) => void;
}) {
  return (
    <View style={[styles.sidebar, expanded && styles.sidebarExpanded]}>
      <View style={styles.sidebarBrandBlock}>
        <View style={styles.logoSquare}><Text style={styles.logoLetters}>JR</Text></View>
        <View>
          <Text style={styles.sidebarBrand}>JIRAMA</Text>
          <Text style={styles.sidebarSub}>ESPACE AGENT</Text>
        </View>
      </View>
      <Text style={styles.menuCaption}>NAVIGATION</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarItems}>
        {items.map((item) => (
          <SidebarItem
            key={item.key}
            item={item}
            active={activeKey === item.key}
            expanded={expanded}
            onPress={() => onNavigate(item.key)}
          />
        ))}
      </ScrollView>
      <Text style={styles.sidebarFooterText}>Jiro sy Rano Malagasy</Text>
    </View>
  );
}

function SidebarItem({
  item,
  active,
  expanded,
  onPress,
}: {
  item: AgentNavItem;
  active: boolean;
  expanded: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.sidebarItem, active && styles.sidebarItemActive]}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
    >
      <Text style={styles.sidebarEmoji}>{item.emoji}</Text>
      {expanded ? (
        <Text numberOfLines={1} style={[styles.sidebarLabel, active && styles.sidebarLabelActive]}>
          {item.label}
        </Text>
      ) : null}
      {expanded && item.badge && item.badge > 0 ? (
        <View style={styles.sidebarBadge}>
          <Text style={styles.sidebarBadgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  root: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.background },
  main: { flex: 1, minWidth: 0, backgroundColor: COLORS.background },
  sidebar: { width: 72, backgroundColor: COLORS.navy, paddingTop: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: '#153B58' },
  sidebarExpanded: { width: 224, paddingHorizontal: 12 },
  sidebarBrandBlock: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 5, marginBottom: 22 },
  logoSquare: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  logoLetters: { color: COLORS.navy, fontWeight: '900', fontSize: 14 },
  sidebarBrand: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.7 },
  sidebarSub: { color: '#A9D5E8', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  menuCaption: { color: '#8EB6CA', fontSize: 9, fontWeight: '900', letterSpacing: 1.1, paddingHorizontal: 7, marginBottom: 9 },
  sidebarItems: { gap: 6, paddingBottom: 14 },
  sidebarItem: { minHeight: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9, gap: 11, borderWidth: 1, borderColor: 'transparent' },
  sidebarItemActive: { backgroundColor: '#164866', borderColor: '#2C7596' },
  sidebarEmoji: { fontSize: 19, width: 26, textAlign: 'center' },
  sidebarLabel: { flex: 1, color: '#DFEAF0', fontSize: 12, fontWeight: '700' },
  sidebarLabelActive: { color: '#FFFFFF', fontWeight: '900' },
  sidebarBadge: { minWidth: 19, height: 19, paddingHorizontal: 5, borderRadius: 10, backgroundColor: '#E9A23B', alignItems: 'center', justifyContent: 'center' },
  sidebarBadgeText: { color: '#172B3A', fontSize: 10, fontWeight: '900' },
  sidebarFooterText: { color: '#A9C5D3', fontSize: 9, textAlign: 'center', paddingVertical: 12 },
  mobileRail: { width: 58, backgroundColor: COLORS.navy, paddingTop: 8, paddingHorizontal: 5, alignItems: 'center' },
  railMenuButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#164866', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  railMenuEmoji: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' },
  railItems: { alignItems: 'center', gap: 7, paddingBottom: 10 },
  railItem: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  railItemActive: { backgroundColor: '#164866', borderColor: '#2C7596' },
  railEmoji: { fontSize: 20 },
  railBadge: { position: 'absolute', top: 1, right: 0, minWidth: 15, height: 15, borderRadius: 8, paddingHorizontal: 3, backgroundColor: '#E9A23B', alignItems: 'center', justifyContent: 'center' },
  railBadgeText: { color: '#172B3A', fontSize: 8, fontWeight: '900' },
  railBottomMark: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 'auto', marginBottom: 8 },
  railBottomText: { color: COLORS.navy, fontSize: 10, fontWeight: '900' },
  topBar: { minHeight: 64, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: COLORS.surface, borderBottomColor: COLORS.border, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileMenuButton: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: COLORS.blueLight },
  mobileMenuText: { color: COLORS.navy, fontSize: 19, fontWeight: '900' },
  titleBlock: { flex: 1, minWidth: 0 },
  pageTitle: { color: COLORS.navy, fontSize: 16, fontWeight: '900' },
  pageSubtitle: { color: COLORS.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.35, marginTop: 3 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notificationButton: { width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.blueLight, alignItems: 'center', justifyContent: 'center' },
  notificationEmoji: { fontSize: 18 },
  notificationBadge: { position: 'absolute', right: -3, top: -4, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.surface },
  notificationBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.blueLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.blue, fontSize: 14, fontWeight: '900' },
  connectionStrip: { height: 25, backgroundColor: COLORS.surfaceAlt, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 6 },
  connectionDot: { width: 7, height: 7, borderRadius: 4 },
  connectionText: { color: COLORS.muted, fontSize: 9, fontWeight: '700' },
  alertBanner: { marginHorizontal: 9, marginTop: 8, minHeight: 56, backgroundColor: COLORS.warningBg, borderColor: '#EACB8C', borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 7 },
  alertEmoji: { fontSize: 19 },
  alertTextBlock: { flex: 1 },
  alertTitle: { color: COLORS.warning, fontSize: 11, fontWeight: '900' },
  alertText: { color: COLORS.text, fontSize: 9, marginTop: 2 },
  alertAction: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F4D99F' },
  alertActionText: { color: '#68430E', fontSize: 10, fontWeight: '900' },
  alertClose: { width: 23, height: 28, alignItems: 'center', justifyContent: 'center' },
  alertCloseText: { color: COLORS.warning, fontSize: 22, lineHeight: 24 },
  pageContent: { flex: 1, minHeight: 0, minWidth: 0, backgroundColor: COLORS.background },
  footer: { minHeight: 48, paddingHorizontal: 7, paddingVertical: 6, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  footerBrand: { color: COLORS.navy, fontWeight: '900', fontSize: 9 },
  footerLine: { color: COLORS.muted, fontSize: 8, textAlign: 'center', marginTop: 2 },
  footerSmall: { color: '#8293A0', fontSize: 7, marginTop: 2, textAlign: 'center' },
  overlayLayer: { ...StyleSheet.absoluteFill, zIndex: 50, flexDirection: 'row' },
  overlayBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5, 24, 39, 0.48)' },
  overlaySidebar: { width: 250, height: '100%', backgroundColor: COLORS.navy, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, elevation: 12 },
  overlayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  overlayBrand: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  overlayClose: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#164866', alignItems: 'center', justifyContent: 'center' },
  overlayCloseText: { color: '#FFFFFF', fontSize: 23, lineHeight: 25 },
  overlayCaption: { color: '#A9D5E8', fontSize: 9, fontWeight: '800', letterSpacing: 0.9, marginTop: 3, marginBottom: 10 },
  overlayItems: { gap: 6, paddingBottom: 12 },
});

