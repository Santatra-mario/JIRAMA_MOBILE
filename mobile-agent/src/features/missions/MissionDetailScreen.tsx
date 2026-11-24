import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  fetchAgentMission,
  reportUnsuccessfulVisit,
  startAgentMission,
} from '../../api/agentService';

import {
  ErrorState,
  LoadingState,
} from '../../components/ScreenState';

import type { AgentMission } from '../../types/agent';

import { COLORS } from '../../theme/colors';

const VISIT_RESULTS = [
  ['ABONNE_ABSENT', 'Abonné absent'],
  ['COMPTEUR_INACCESSIBLE', 'Compteur inaccessible'],
  ['INDEX_ILLISIBLE', 'Index illisible'],
  ['COMPTEUR_A_INTERVENIR', 'Compteur à faire intervenir'],
  ['AUTRE', 'Autre situation'],
] as const;

type PreviousIndexState =
  | { kind: 'available'; value: number }
  | { kind: 'none' }
  | { kind: 'missing' }
  | { kind: 'invalid' };

function getPreviousIndexState(
  mission: AgentMission
): PreviousIndexState {
  const hasField = Object.prototype.hasOwnProperty.call(
    mission,
    'dernier_index'
  );

  if (!hasField || mission.dernier_index === undefined) {
    return { kind: 'missing' };
  }

  if (mission.dernier_index === null) {
    return { kind: 'none' };
  }

  const raw = String(mission.dernier_index).trim();

  if (!raw) {
    return { kind: 'invalid' };
  }

  const value = Number(raw);

  if (!Number.isFinite(value) || value < 0) {
    return { kind: 'invalid' };
  }

  return {
    kind: 'available',
    value,
  };
}

function formatIndex(value: number): string {
  return value.toLocaleString('fr-FR');
}

export default function MissionDetailScreen({
  missionId,
  onBack,
  onRead,
  onUpdated,
}: {
  missionId: number;
  onBack: () => void;
  onRead: (mission: AgentMission) => void;
  onUpdated: () => void;
}) {
  const [mission, setMission] = useState<AgentMission | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [saving, setSaving] = useState(false);
  const [reporting, setReporting] = useState(false);

  const [result, setResult] = useState<string>('ABONNE_ABSENT');
  const [reason, setReason] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchAgentMission(missionId);
      setMission(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Mission indisponible.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [missionId]);

  const start = async () => {
    if (!mission) return;

    setSaving(true);
    setError('');

    try {
      await startAgentMission(mission.id);
      await load();
      onUpdated();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de démarrer la mission.'
      );
    } finally {
      setSaving(false);
    }
  };

  const sendReport = async () => {
    if (!mission || reason.trim().length < 3) {
      setError(
        'Décrivez brièvement la situation (3 caractères minimum).'
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      await reportUnsuccessfulVisit(
        mission.id,
        result,
        reason.trim()
      );

      setReporting(false);
      setReason('');

      await load();
      onUpdated();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de transmettre le résultat de visite.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LoadingState label="Chargement du détail de mission..." />
    );
  }

  if (error && !mission) {
    return (
      <ErrorState message={error} onRetry={() => void load()} />
    );
  }

  if (!mission) {
    return (
      <ErrorState
        message="Mission introuvable."
        onRetry={() => void load()}
      />
    );
  }

  const customer =
    [mission.abonne_prenom, mission.abonne_nom]
      .filter(Boolean)
      .join(' ') || 'Abonné';

  const status = String(mission.statut || '').toUpperCase();

  const open = ['PLANIFIEE', 'EN_COURS'].includes(status);

  const previous = getPreviousIndexState(mission);

  const canRead =
    previous.kind === 'none' ||
    previous.kind === 'available';

  const unit =
    mission.type_compteur === 'EAU'
      ? 'm³'
      : mission.type_compteur === 'ELECTRICITE'
        ? 'kWh'
        : '';

  const previousValue =
    previous.kind === 'available'
      ? `${formatIndex(previous.value)} ${unit}`.trim()
      : previous.kind === 'none'
        ? 'Ancien index indisponible'
        : previous.kind === 'missing'
          ? 'Information non fournie par le serveur'
          : 'Index de référence incohérent';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>
          ← Retour aux missions
        </Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          MISSION #{mission.id}
        </Text>

        <Text style={styles.title}>{customer}</Text>

        <Text style={styles.sub}>
          Abonné {mission.numero_abonne || '—'}
        </Text>
      </View>

      <Info
        label="Adresse"
        value={mission.adresse || 'Non renseignée'}
      />

      <Info
        label="Quartier / Commune"
        value={
          [mission.quartier, mission.commune]
            .filter(Boolean)
            .join(' · ') || 'Non renseigné'
        }
      />

      <Info
        label="Compteur"
        value={`${mission.numero_compteur || '—'} · ${
          mission.type_compteur || 'Type non précisé'
        }`}
      />

      <Info
        label="Date prévue"
        value={mission.date_prevue || 'Non renseignée'}
      />

      <Info
        label="Statut"
        value={status.replaceAll('_', ' ')}
      />

      <View style={styles.readingCard}>
        <Text style={styles.readingLabel}>
          DERNIER INDEX DE RÉFÉRENCE
        </Text>

        <Text style={styles.readingValue}>
          {previousValue}
        </Text>

        <Text style={styles.readingDate}>
          Date du relevé précédent :{' '}
          {mission.dernier_releve || 'Non disponible'}
        </Text>

        {previous.kind === 'none' && (
          <View style={styles.initialNotice}>
            <Text style={styles.initialTitle}>
              PREMIER RELEVÉ POSSIBLE
            </Text>

            <Text style={styles.initialText}>
              Aucun relevé antérieur n'est enregistré pour ce
              compteur dans l'historique accessible au système.
              Cela ne signifie pas nécessairement que l'abonné
              ou le compteur est neuf.
            </Text>

            <Text style={styles.initialText}>
              Lors de la descente, saisissez uniquement l'index
              physique réellement affiché sur le compteur.
            </Text>
          </View>
        )}

        {previous.kind === 'missing' && (
          <View style={styles.warningNotice}>
            <Text style={styles.warningText}>
              Le serveur n'a pas transmis le champ de l'ancien
              index. Actualisez la mission avant toute saisie.
            </Text>
          </View>
        )}

        {previous.kind === 'invalid' && (
          <View style={styles.warningNotice}>
            <Text style={styles.warningText}>
              L'ancien index est incohérent. Contactez le
              Responsable avant de saisir un nouvel index.
            </Text>
          </View>
        )}

        {previous.kind === 'available' && (
          <Text style={styles.readingHint}>
            Valeur fournie par le serveur · Lecture seule.
          </Text>
        )}
      </View>

      {!!mission.observations && (
        <Info
          label="Consignes du Responsable"
          value={mission.observations}
        />
      )}

      {!!error && (
        <Text style={styles.error}>{error}</Text>
      )}

      {open ? (
        <>
          {status !== 'EN_COURS' && (
            <ActionButton
              title="Démarrer le contrôle"
              onPress={start}
              loading={saving}
            />
          )}

          <ActionButton
            title="Saisir le nouvel index"
            onPress={() => onRead(mission)}
            disabled={!canRead}
          />

          <Pressable
            style={styles.outlineButton}
            onPress={() => setReporting((value) => !value)}
          >
            <Text style={styles.outlineText}>
              {reporting
                ? 'Fermer le formulaire'
                : 'Signaler une visite sans relevé'}
            </Text>
          </Pressable>

          {reporting && (
            <View style={styles.reportCard}>
              <Text style={styles.reportTitle}>
                Résultat de la visite
              </Text>

              {VISIT_RESULTS.map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setResult(value)}
                  style={styles.choice}
                >
                  <View
                    style={[
                      styles.radio,
                      result === value && styles.radioActive,
                    ]}
                  />

                  <Text style={styles.choiceText}>
                    {label}
                  </Text>
                </Pressable>
              ))}

              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Décrivez la situation constatée..."
                placeholderTextColor={COLORS.muted}
                multiline
                style={styles.textarea}
              />

              <ActionButton
                title="Transmettre au Responsable"
                onPress={sendReport}
                loading={saving}
              />
            </View>
          )}
        </>
      ) : (
        <View style={styles.closed}>
          <Text style={styles.closedText}>
            Cette mission n'est pas actuellement ouverte à la saisie.
          </Text>
        </View>
      )}

      {!canRead && open && (
        <Text style={styles.blockedHint}>
          La saisie est désactivée tant que l'ancien index
          n'est pas correctement renseigné par le serveur.
        </Text>
      )}
    </ScrollView>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ActionButton({
  title,
  onPress,
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={loading || disabled}
      onPress={onPress}
      style={[
        styles.primary,
        (loading || disabled) && styles.disabledButton,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.primaryText}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    padding: 16,
    paddingBottom: 35,
  },

  back: {
    paddingVertical: 9,
  },

  backText: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: '900',
  },

  header: {
    backgroundColor: COLORS.navy,
    borderRadius: 18,
    padding: 19,
    marginBottom: 12,
  },

  eyebrow: {
    color: '#9DDDE9',
    fontSize: 10,
    fontWeight: '900',
  },

  title: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 8,
  },

  sub: {
    color: '#D6E5ED',
    marginTop: 5,
    fontSize: 12,
  },

  info: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    borderRadius: 12,
    marginBottom: 8,
  },

  infoLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
  },

  infoValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 5,
  },

  readingCard: {
    backgroundColor: COLORS.blueLight,
    borderColor: '#B9DDEB',
    borderWidth: 1,
    borderRadius: 15,
    padding: 16,
    marginVertical: 8,
  },

  readingLabel: {
    color: COLORS.blue,
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0.8,
  },

  readingValue: {
    color: COLORS.navy,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 9,
  },

  readingDate: {
    color: COLORS.text,
    fontSize: 11,
    marginTop: 4,
  },

  readingHint: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 7,
  },

  initialNotice: {
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    padding: 12,
    marginTop: 13,
  },

  initialTitle: {
    color: COLORS.blue,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 6,
  },

  initialText: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  warningNotice: {
    backgroundColor: COLORS.warningBg,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },

  warningText: {
    color: COLORS.warning,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '700',
  },

  primary: {
    minHeight: 50,
    backgroundColor: COLORS.blue,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
  },

  primaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  disabledButton: {
    opacity: 0.45,
  },

  outlineButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  outlineText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },

  reportCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 14,
    marginTop: 12,
  },

  reportTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 8,
  },

  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    gap: 10,
  },

  radio: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.muted,
  },

  radioActive: {
    borderWidth: 5,
    borderColor: COLORS.blue,
  },

  choiceText: {
    color: COLORS.text,
    fontSize: 12,
  },

  textarea: {
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 80,
    padding: 11,
    textAlignVertical: 'top',
    color: COLORS.text,
    marginTop: 8,
  },

  error: {
    color: COLORS.danger,
    fontSize: 12,
    marginVertical: 8,
  },

  closed: {
    padding: 14,
    backgroundColor: COLORS.warningBg,
    borderRadius: 12,
    marginTop: 12,
  },

  closedText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '700',
  },

  blockedHint: {
    color: COLORS.danger,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 10,
  },
});