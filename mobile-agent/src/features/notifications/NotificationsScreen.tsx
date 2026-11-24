
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  archiveAgentNotification,
  deleteAgentNotification,
  fetchAgentNotifications,
  markAgentNotificationAsRead,
  markAllAgentNotificationsAsRead,
} from '../../api/agentService';

import {
  DataCard,
  EmptyBlock,
  ErrorBlock,
  FieldRow,
  FilterRow,
  LoadingBlock,
  PageContainer,
  PageHeading,
  PrimaryButton,
  SecondaryButton,
} from '../../components/AgentUI';

import type { AgentNotification } from '../../types/agent';

import { COLORS } from '../../theme/colors';

type NotificationFilter = 'TOUTES' | 'NON_LUES' | 'LUES';

type NotificationId = number | string;

/**
 * Récupère les notifications quelle que soit
 * la structure habituelle de la réponse API.
 */
function extractNotifications(response: any): AgentNotification[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.notifications)) {
    return response.notifications;
  }

  return [];
}

function isUnread(item: AgentNotification): boolean {
  return String(item?.statut || '').toUpperCase() === 'EN_ATTENTE';
}

function formatDate(value: unknown): string {
  if (!value) {
    return 'Date non renseignée';
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('fr-FR');
}

export default function NotificationsScreen({
  onOpenMission,
  onChanged,
}: {
  onOpenMission: (missionId: number) => void;
  onChanged?: () => void;
}) {
  const [items, setItems] = useState<AgentNotification[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [busyId, setBusyId] = useState<NotificationId | null>(null);

  const [error, setError] = useState('');

  const [search, setSearch] = useState('');

  const [filter, setFilter] = useState<NotificationFilter>('TOUTES');

  /**
   * Chargement des notifications.
   * La réponse API est toujours convertie en tableau.
   */
  const load = useCallback(async (refresh = false) => {
    setError('');

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetchAgentNotifications();

      const notifications = extractNotifications(response);

      setItems(notifications);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Impossible de charger les notifications.';

      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Nombre de notifications non lues.
   */
  const unread = useMemo(() => {
    return items.filter(isUnread).length;
  }, [items]);

  /**
   * Recherche et filtrage.
   */
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const searchableText = [
        item.sujet,
        item.type,
        item.message,
        item.numero_compteur,
        item.numero_abonne,
        item.type_anomalie,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(' ')
        .toLowerCase();

      const matchText =
        !query || searchableText.includes(query);

      const status = String(item.statut || '').toUpperCase();

      const matchStatus =
        filter === 'TOUTES' ||
        (filter === 'NON_LUES' && status === 'EN_ATTENTE') ||
        (filter === 'LUES' && status !== 'EN_ATTENTE');

      return matchText && matchStatus;
    });
  }, [items, search, filter]);

  /**
   * Marquer une notification comme lue.
   */
  const readOne = async (item: AgentNotification) => {
    if (busyId !== null || !isUnread(item)) {
      return;
    }

    setBusyId(item.id);
    setError('');

    try {
      await markAgentNotificationAsRead(item.id);

      setItems((current) =>
        current.map((notification) =>
          notification.id === item.id
            ? { ...notification, statut: 'ENVOYE' }
            : notification
        )
      );

      onChanged?.();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de marquer la notification comme lue.'
      );
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Marquer toutes les notifications comme lues.
   */
  const readAll = async () => {
    if (unread === 0 || busyId !== null) {
      return;
    }

    setBusyId('__ALL__');
    setError('');

    try {
      await markAllAgentNotificationsAsRead();

      setItems((current) =>
        current.map((notification) => ({
          ...notification,
          statut: 'ENVOYE',
        }))
      );

      onChanged?.();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de marquer toutes les notifications comme lues.'
      );
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Archiver une notification.
   */
  const archiveOne = (item: AgentNotification) => {
    if (busyId !== null) {
      return;
    }

    Alert.alert(
      'Archiver la notification',
      'Cette notification sera déplacée dans les archives.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Archiver',
          onPress: () => {
            void (async () => {
              setBusyId(item.id);
              setError('');

              try {
                await archiveAgentNotification(item.id);

                setItems((current) =>
                  current.filter(
                    (notification) => notification.id !== item.id
                  )
                );

                onChanged?.();
              } catch (err: unknown) {
                setError(
                  err instanceof Error
                    ? err.message
                    : 'Impossible d’archiver la notification.'
                );
              } finally {
                setBusyId(null);
              }
            })();
          },
        },
      ]
    );
  };

  /**
   * Supprimer une notification.
   */
  const deleteOne = (item: AgentNotification) => {
    if (busyId !== null) {
      return;
    }

    Alert.alert(
      'Supprimer la notification',
      'Cette suppression sera appliquée sur le serveur. Cette action peut être irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusyId(item.id);
              setError('');

              try {
                await deleteAgentNotification(item.id);

                setItems((current) =>
                  current.filter(
                    (notification) => notification.id !== item.id
                  )
                );

                onChanged?.();
              } catch (err: unknown) {
                setError(
                  err instanceof Error
                    ? err.message
                    : 'Impossible de supprimer la notification.'
                );
              } finally {
                setBusyId(null);
              }
            })();
          },
        },
      ]
    );
  };

  /**
   * Ouvrir la mission associée à une notification.
   */
  const openMission = (item: AgentNotification) => {
    const missionId = Number(item.mission_id);

    if (!Number.isSafeInteger(missionId) || missionId <= 0) {
      Alert.alert(
        'Mission indisponible',
        'L’identifiant de la mission est invalide.'
      );
      return;
    }

    if (isUnread(item)) {
      void readOne(item);
    }

    onOpenMission(missionId);
  };

  /**
   * Écran de chargement initial.
   */
  if (loading && items.length === 0) {
    return <LoadingBlock label="Chargement des notifications…" />;
  }

  return (
    <PageContainer
      refreshing={refreshing}
      onRefresh={() => void load(true)}
    >
      <PageHeading
        eyebrow="Consignes et alertes"
        title="Notifications"
        subtitle="Notifications adressées à votre compte Agent."
        right={
          <Text style={styles.count}>
            {unread} non lue(s)
          </Text>
        }
      />

      {!!error && (
        <ErrorBlock
          message={error}
          onRetry={() => void load(true)}
        />
      )}

      <PrimaryButton
        label={
          busyId === '__ALL__'
            ? 'Traitement…'
            : 'Marquer toutes comme lues'
        }
        onPress={() => void readAll()}
        disabled={unread === 0 || busyId !== null}
      />

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Rechercher une notification…"
        placeholderTextColor={COLORS.subtle}
        style={styles.search}
      />

      <FilterRow
        value={filter}
        onChange={(value) =>
          setFilter(value as NotificationFilter)
        }
        items={[
          { value: 'TOUTES', label: 'Toutes' },
          { value: 'NON_LUES', label: 'Non lues' },
          { value: 'LUES', label: 'Lues' },
        ]}
      />

      {visible.length === 0 ? (
        <EmptyBlock
          title="Aucune notification"
          message="Aucune notification ne correspond à votre recherche ou à ce filtre."
        />
      ) : (
        visible.map((item) => (
          <DataCard
            key={String(item.id)}
            title={item.sujet || item.type || 'Notification'}
            subtitle={formatDate(item.created_at || item.date_envoi)}
            badge={item.statut}
          >
            <Text style={styles.message}>
              {item.message || 'Aucun message.'}
            </Text>

            {!!item.numero_compteur && (
              <FieldRow
                label="Compteur"
                value={String(item.numero_compteur)}
              />
            )}

            {!!item.numero_abonne && (
              <FieldRow
                label="Abonné"
                value={String(item.numero_abonne)}
              />
            )}

            {!!item.niveau && (
              <FieldRow
                label="Niveau"
                value={String(item.niveau)}
              />
            )}

            <View style={styles.actions}>
              {isUnread(item) && (
                <Pressable
                  disabled={busyId !== null}
                  onPress={() => void readOne(item)}
                  style={styles.action}
                >
                  <Text style={styles.actionText}>
                    {busyId === item.id
                      ? 'Traitement…'
                      : 'Marquer comme lue'}
                  </Text>
                </Pressable>
              )}

              {!!item.mission_id && (
                <Pressable
                  disabled={busyId !== null}
                  onPress={() => openMission(item)}
                  style={styles.action}
                >
                  <Text style={styles.actionText}>
                    Ouvrir la mission →
                  </Text>
                </Pressable>
              )}

              <Pressable
                disabled={busyId !== null}
                onPress={() => archiveOne(item)}
                style={styles.action}
              >
                <Text style={styles.actionText}>
                  Archiver
                </Text>
              </Pressable>

              <Pressable
                disabled={busyId !== null}
                onPress={() => deleteOne(item)}
                style={[styles.action, styles.deleteAction]}
              >
                <Text style={[styles.actionText, styles.deleteText]}>
                  Supprimer
                </Text>
              </Pressable>
            </View>
          </DataCard>
        ))
      )}

      {!!visible.length && (
        <View style={styles.footer}>
          <SecondaryButton
            label="Actualiser les notifications"
            onPress={() => void load(true)}
          />
        </View>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  count: {
    color: COLORS.blue,
    fontWeight: '900',
    fontSize: 10,
  },

  search: {
    minHeight: 45,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.field,
    borderRadius: 9,
    paddingHorizontal: 12,
    color: COLORS.text,
    fontSize: 12,
  },

  message: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 18,
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 5,
  },

  action: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.blueLight,
    borderRadius: 8,
  },

  actionText: {
    color: COLORS.blue,
    fontWeight: '900',
    fontSize: 10,
  },

  deleteAction: {
    backgroundColor: COLORS.dangerBg,
  },

  deleteText: {
    color: COLORS.danger,
  },

  footer: {
    marginTop: 4,
  },
});
