
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { fetchAgentAbonnes } from '../../api/agentService';

import {
  DataCard,
  EmptyBlock,
  ErrorBlock,
  FieldRow,
  FilterRow,
  LoadingBlock,
  PageContainer,
  PageHeading,
  SecondaryButton,
} from '../../components/AgentUI';

import type { AgentAbonne } from '../../types/agent';
import { COLORS } from '../../theme/colors';

/**
 * Récupère les abonnés même si l'API renvoie :
 * - un tableau directement ;
 * - { data: [...] } ;
 * - { abonnés: [...] } ou { abonnes: [...] } ;
 * - { data: { abonnés: [...] } } ;
 * - { results: [...] }, { items: [...] }, etc.
 */
function extractAbonnes(response: unknown, depth = 0): AgentAbonne[] {
  if (depth > 5 || response == null) {
    return [];
  }

  if (Array.isArray(response)) {
    return response.filter(
      (item): item is AgentAbonne =>
        item !== null && typeof item === 'object',
    );
  }

  if (typeof response !== 'object') {
    return [];
  }

  const obj = response as Record<string, unknown>;

  const possibleKeys = [
    'data',
    'abonnes',
    'abonnés',
    'items',
    'results',
    'rows',
    'clients',
    'records',
  ];

  for (const key of possibleKeys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      const result = extractAbonnes(obj[key], depth + 1);

      if (result.length > 0 || Array.isArray(obj[key])) {
        return result;
      }
    }
  }

  return [];
}

function formatDate(value: unknown): string {
  if (!value) {
    return 'Aucun relevé';
  }

  const dateValue = String(value);
  const date = new Date(`${dateValue.slice(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? dateValue
    : date.toLocaleDateString('fr-FR');
}

export default function AbonnesScreen() {
  const [items, setItems] = useState<AgentAbonne[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('TOUS');
  const [withMeters, setWithMeters] = useState('TOUS');

  const [expandedId, setExpandedId] = useState<number | null>(null);

  /**
   * Chargement sécurisé des abonnés.
   */
  const load = useCallback(async (refresh = false) => {
    setError('');

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response: unknown = await fetchAgentAbonnes();

      const abonnes = extractAbonnes(response);

      setItems(abonnes);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Impossible de charger les abonnés.';

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
   * Recherche et filtrage sécurisés.
   */
  const visible = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];

    const q = search.trim().toLocaleLowerCase('fr-FR');

    return safeItems.filter((item) => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const haystack = [
        item.numero_abonne,
        item.nom,
        item.prenom,
        item.adresse,
        item.telephone,
      ]
        .map((value) => String(value ?? ''))
        .join(' ')
        .toLocaleLowerCase('fr-FR');

      const countValue = Number(item.nombre_compteurs ?? 0);
      const count = Number.isFinite(countValue) ? countValue : 0;

      const itemStatus = String(item.statut ?? '')
        .trim()
        .toUpperCase();

      const matchesSearch = !q || haystack.includes(q);

      const matchesStatus =
        status === 'TOUS' || itemStatus === status;

      const matchesMeters =
        withMeters === 'TOUS' ||
        (withMeters === 'AVEC' && count > 0) ||
        (withMeters === 'SANS' && count === 0);

      return matchesSearch && matchesStatus && matchesMeters;
    });
  }, [items, search, status, withMeters]);

  /**
   * Copie du numéro de téléphone.
   */
  const copyPhone = async (item: AgentAbonne) => {
    const phone = String(item.telephone ?? '').trim();

    if (!phone) {
      Alert.alert(
        'Téléphone absent',
        'Aucun numéro de téléphone n’est enregistré pour cet abonné.',
      );
      return;
    }

    try {
      // Installer si nécessaire :
      // npx expo install expo-clipboard

      // @ts-ignore — module Expo Clipboard
      const Clipboard = await import('expo-clipboard');

      await Clipboard.setStringAsync(phone);

      Alert.alert(
        'Numéro copié',
        `${phone} · ${item.prenom || ''} ${item.nom || ''}`.trim(),
      );
    } catch {
      Alert.alert(
        'Copie indisponible',
        `Numéro de téléphone : ${phone}`,
      );
    }
  };

  /**
   * État de chargement initial.
   */
  if (loading && items.length === 0) {
    return <LoadingBlock label="Chargement des abonnés…" />;
  }

  return (
    <PageContainer
      refreshing={refreshing}
      onRefresh={() => void load(true)}
    >
      <PageHeading
        eyebrow="Fichier clientèle"
        title="Abonnés"
        subtitle="Consultation des abonnés, installations et informations de suivi disponibles pour l’Agent."
        right={
          <Text style={styles.total}>
            {visible.length} / {items.length}
          </Text>
        }
      />

      {!!error && (
        <ErrorBlock
          message={error}
          onRetry={() => void load(true)}
        />
      )}

      {/* Recherche */}
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Numéro, nom, adresse, téléphone…"
        placeholderTextColor={COLORS.subtle}
        style={styles.search}
      />

      {/* Filtre par statut */}
      <FilterRow
        value={status}
        onChange={setStatus}
        items={[
          { value: 'TOUS', label: 'Tous statuts' },
          { value: 'ACTIF', label: 'Actifs' },
          { value: 'INACTIF', label: 'Inactifs' },
        ]}
      />

      {/* Filtre par compteurs */}
      <FilterRow
        value={withMeters}
        onChange={setWithMeters}
        items={[
          { value: 'TOUS', label: 'Tous' },
          { value: 'AVEC', label: 'Avec compteur' },
          { value: 'SANS', label: 'Sans compteur' },
        ]}
      />

      {/* Liste des abonnés */}
      {visible.length === 0 ? (
        <EmptyBlock
          title="Aucun abonné"
          message="Aucun abonné ne correspond aux critères sélectionnés."
        />
      ) : (
        visible.map((item) => (
          <DataCard
            key={item.id}
            title={
              `${item.prenom || ''} ${item.nom || ''}`.trim() ||
              'Nom non renseigné'
            }
            subtitle={`N° abonné ${item.numero_abonne || '—'}`}
            badge={item.statut}
            onPress={() =>
              setExpandedId(
                expandedId === item.id ? null : item.id,
              )
            }
            action={
              <SecondaryButton
                label="Copier le téléphone"
                onPress={() => void copyPhone(item)}
                disabled={!item.telephone}
              />
            }
          >
            <FieldRow
              label="Adresse"
              value={item.adresse}
            />

            <FieldRow
              label="Téléphone"
              value={item.telephone}
            />

            <FieldRow
              label="Compteurs associés"
              value={item.nombre_compteurs ?? 0}
            />

            <FieldRow
              label="Dernier relevé"
              value={formatDate(item.dernier_releve)}
            />

            {expandedId === item.id && (
              <View style={styles.expanded}>
                <FieldRow
                  label="Identifiant interne"
                  value={item.id}
                />

                <Text style={styles.note}>
                  Les informations sont consultatives.
                  Les modifications contractuelles ne sont pas
                  proposées dans l’espace Agent Mobile.
                </Text>
              </View>
            )}

            <Text style={styles.expandHint}>
              {expandedId === item.id
                ? 'Toucher pour réduire'
                : 'Toucher pour afficher les informations détaillées'}
            </Text>
          </DataCard>
        ))
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  total: {
    color: COLORS.blue,
    fontWeight: '900',
    fontSize: 11,
  },

  search: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.field,
    borderRadius: 9,
    paddingHorizontal: 12,
    color: COLORS.text,
    fontSize: 12,
  },

  expanded: {
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 8,
    marginTop: 5,
  },

  note: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 6,
  },

  expandHint: {
    color: COLORS.blue,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 4,
  },
});
