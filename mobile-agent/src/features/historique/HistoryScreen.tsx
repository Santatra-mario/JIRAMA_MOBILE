import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchAgentReleves } from '../../api/agentService';

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ScreenState';

import type { AgentReleve } from '../../types/agent';

import { COLORS } from '../../theme/colors';

function formatNumber(
  value: number | string | null | undefined
): string {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return 'Non disponible';
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 'Valeur à vérifier';
  }

  return number.toLocaleString('fr-FR');
}

function isInitialReading(row: AgentReleve): boolean {
  return String(row.type_releve || '').toUpperCase() === 'INITIAL';
}

function getConsumptionLabel(row: AgentReleve): string {
  if (isInitialReading(row)) {
    return 'Non calculable — premier relevé';
  }

  if (
    row.consommation === null ||
    row.consommation === undefined
  ) {
    return 'Non disponible — à vérifier';
  }

  return `${formatNumber(row.consommation)} ${row.unite || ''}`.trim();
}

function getReadingTypeLabel(row: AgentReleve): string {
  if (isInitialReading(row)) {
    return 'PREMIER RELEVÉ · INDEX INITIAL';
  }

  if (
    String(row.type_releve || '').toUpperCase() === 'PERIODIQUE'
  ) {
    return 'RELEVÉ PÉRIODIQUE';
  }

  return 'RELEVÉ';
}

export default function HistoryScreen() {
  const [rows, setRows] = useState<AgentReleve[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');

    try {
      setRows(await fetchAgentReleves());
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Historique indisponible."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <LoadingState label="Chargement de votre historique..." />
    );
  }

  if (error && !rows.length) {
    return (
      <ErrorState
        message={error}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
        />
      }
    >
      <Text style={styles.title}>
        Historique des relevés
      </Text>

      <Text style={styles.subtitle}>
        Consultation des opérations autorisées pour votre
        compte Agent.
      </Text>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="Aucun relevé"
          message="Aucun relevé n'est disponible pour vos missions."
        />
      ) : (
        rows.map((row) => {
          const initial = isInitialReading(row);

          return (
            <View key={row.id} style={styles.card}>
              <Text style={styles.date}>
                {String(row.date_releve || '').slice(0, 10)}
              </Text>

              <Text style={styles.meter}>
                {row.numero_compteur ||
                  `Compteur #${row.compteur_id}`}
              </Text>

              <Text style={styles.details}>
                {row.numero_abonne || 'Abonné'} ·{' '}
                {row.type_compteur || ''}
              </Text>

              <View
                style={[
                  styles.typeBadge,
                  initial && styles.initialBadge,
                ]}
              >
                <Text
                  style={[
                    styles.type,
                    initial && styles.initialType,
                  ]}
                >
                  {getReadingTypeLabel(row)}
                </Text>
              </View>

              <View style={styles.readingRow}>
                <View style={styles.readingColumn}>
                  <Text style={styles.label}>
                    ANCIEN INDEX
                  </Text>

                  <Text style={styles.value}>
                    {initial
                      ? 'Non disponible'
                      : formatNumber(row.ancien_index)}
                  </Text>
                </View>

                <View style={styles.readingColumn}>
                  <Text style={styles.label}>
                    NOUVEL INDEX
                  </Text>

                  <Text style={styles.value}>
                    {formatNumber(row.nouvel_index)}{' '}
                    {row.unite || ''}
                  </Text>
                </View>
              </View>

              <View style={styles.consumptionBlock}>
                <Text style={styles.label}>
                  CONSOMMATION
                </Text>

                <Text
                  style={[
                    styles.consumption,
                    initial && styles.initialConsumption,
                  ]}
                >
                  {getConsumptionLabel(row)}
                </Text>
              </View>

              {initial && (
                <Text style={styles.initialNote}>
                  Cet index constitue la référence initiale
                  pour les prochains relevés de ce compteur.
                </Text>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    padding: 16,
    paddingBottom: 30,
  },

  title: {
    color: COLORS.text,
    fontSize: 23,
    fontWeight: '900',
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
    marginBottom: 15,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },

  date: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
  },

  meter: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 7,
  },

  details: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },

  typeBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: COLORS.blueLight,
    marginTop: 12,
  },

  initialBadge: {
    backgroundColor: COLORS.successBg,
  },

  type: {
    color: COLORS.blue,
    fontSize: 9,
    fontWeight: '900',
  },

  initialType: {
    color: COLORS.success,
  },

  readingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },

  readingColumn: {
    flex: 1,
  },

  label: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
  },

  value: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 5,
  },

  consumptionBlock: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 14,
    paddingTop: 12,
  },

  consumption: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 5,
  },

  initialConsumption: {
    color: COLORS.muted,
    fontSize: 12,
  },

  initialNote: {
    color: COLORS.success,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 10,
  },

  error: {
    color: COLORS.danger,
    fontSize: 12,
    marginBottom: 10,
  },
});