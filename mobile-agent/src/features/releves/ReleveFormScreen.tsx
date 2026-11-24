
import React, { useState } from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  createAgentReleve,
  localDateString,
} from '../../api/agentService';

import type {
  AgentMission,
  AgentCompteur,
} from '../../types/agent';

import { COLORS } from '../../theme/colors';

// ======================================================
// TYPES
// ======================================================

type PreviousIndexState =
  | { kind: 'available'; value: number }
  | { kind: 'none' }
  | { kind: 'missing' }
  | { kind: 'invalid' };

type ReleveFormScreenProps = {
  mission?: AgentMission | null;
  compteur?: AgentCompteur | null;
  onBack: () => void;
  onSaved: () => void;
};

// ======================================================
// GESTION DE L'ANCIEN INDEX
// ======================================================

function getPreviousIndexState(
  mission: AgentMission | null | undefined
): PreviousIndexState {
  // Aucune mission disponible
  if (!mission) {
    return { kind: 'missing' };
  }

  // Vérifier l'existence du champ dernier_index
  const hasField = Object.prototype.hasOwnProperty.call(
    mission,
    'dernier_index'
  );

  if (!hasField || mission.dernier_index === undefined) {
    return { kind: 'missing' };
  }

  // Ancien index explicitement absent
  if (mission.dernier_index === null) {
    return { kind: 'none' };
  }

  // Conversion de la valeur en nombre
  const raw = String(mission.dernier_index)
    .trim()
    .replace(',', '.');

  if (!raw) {
    return { kind: 'invalid' };
  }

  const value = Number(raw);

  // Vérification de la valeur
  if (!Number.isFinite(value) || value < 0) {
    return { kind: 'invalid' };
  }

  return {
    kind: 'available',
    value,
  };
}

// ======================================================
// FORMATAGE
// ======================================================

function formatIndex(value: number): string {
  return value.toLocaleString('fr-FR');
}

// ======================================================
// COMPOSANT PRINCIPAL
// ======================================================

export default function ReleveFormScreen({
  mission,
  compteur,
  onBack,
  onSaved,
}: ReleveFormScreenProps) {

  // ----------------------------------------------------
  // ÉTATS
  // ----------------------------------------------------

  const [newIndex, setNewIndex] = useState('');
  const [observation, setObservation] = useState('');

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successNote, setSuccessNote] = useState('');

  // ----------------------------------------------------
  // IDENTIFIANTS ET INFORMATIONS
  // ----------------------------------------------------

  const missionId = Number(mission?.id);

  const compteurId = Number(
    mission?.compteur_id ?? compteur?.id
  );

  const hasValidMission =
    Number.isInteger(missionId) && missionId > 0;

  const hasValidCompteur =
    Number.isInteger(compteurId) && compteurId > 0;

  // ----------------------------------------------------
  // ANCIEN INDEX
  // ----------------------------------------------------

  const previous = getPreviousIndexState(mission);

  const canSubmit =
    hasValidMission &&
    hasValidCompteur &&
    (
      previous.kind === 'none' ||
      previous.kind === 'available'
    );

  // ----------------------------------------------------
  // TYPE DE COMPTEUR
  // ----------------------------------------------------

  const unit =
    mission?.type_compteur === 'EAU'
      ? 'm³'
      : mission?.type_compteur === 'ELECTRICITE'
        ? 'kWh'
        : '';

  // ----------------------------------------------------
  // AFFICHAGE ANCIEN INDEX
  // ----------------------------------------------------

  const previousValue =
    previous.kind === 'available'
      ? `${formatIndex(previous.value)} ${unit}`.trim()
      : previous.kind === 'none'
        ? 'Ancien index indisponible'
        : previous.kind === 'missing'
          ? 'Information non fournie par le serveur'
          : 'Index de référence incohérent';

  // ====================================================
  // ENREGISTREMENT DU RELEVÉ
  // ====================================================

  const submit = async () => {

    if (saving) {
      return;
    }

    setError('');
    setSuccess('');
    setSuccessNote('');

    // Vérifier la mission
    if (!hasValidMission) {
      setError(
        "Aucune mission valide n'est associée à ce relevé. Ouvrez le formulaire depuis une mission."
      );
      return;
    }

    // Vérifier le compteur
    if (!hasValidCompteur) {
      setError(
        "Identifiant du compteur indisponible. Vérifiez les informations de la mission."
      );
      return;
    }

    // Vérifier l'ancien index
    if (previous.kind === 'missing') {
      setError(
        "Le serveur n'a pas transmis le champ de l'ancien index. Actualisez la mission avant de transmettre le relevé."
      );
      return;
    }

    if (previous.kind === 'invalid') {
      setError(
        "L'ancien index est incohérent. Contactez le Responsable avant d'effectuer cette saisie."
      );
      return;
    }

    // Vérifier le nouvel index
    if (!newIndex.trim()) {
      setError(
        'Saisissez le nouvel index physiquement observé.'
      );
      return;
    }

    const normalized = newIndex.trim().replace(',', '.');

    if (!/^\d+(\.\d+)?$/.test(normalized)) {
      setError(
        "Le nouvel index doit contenir une valeur numérique valide."
      );
      return;
    }

    const value = Number(normalized);

    if (!Number.isFinite(value) || value < 0) {
      setError(
        'Le nouvel index doit être un nombre positif ou égal à zéro.'
      );
      return;
    }

    // Comparer avec l'ancien index lorsqu'il existe
    if (
      previous.kind === 'available' &&
      value < previous.value
    ) {
      setError(
        "Le nouvel index est inférieur au dernier index de référence. Vérifiez le compteur ou signalez une anomalie au Responsable."
      );
      return;
    }

    // --------------------------------------------------
    // APPEL BACKEND
    // --------------------------------------------------

    setSaving(true);

    try {

      const response = await createAgentReleve({
        mission_id: missionId,
        compteur_id: compteurId,
        nouvel_index: value,
        date_visite_reelle: localDateString(),
        observation: observation.trim() || null,
      });

      // Vérifier la confirmation du serveur
      if (
        response?.status !== 'success' ||
        !response?.releve_id
      ) {
        throw new Error(
          response?.message ||
          "Le serveur n'a pas confirmé l'enregistrement du relevé."
        );
      }

      // ------------------------------------------------
      // PREMIER RELEVÉ
      // ------------------------------------------------

      if (
        String(response.type_releve || '').toUpperCase() ===
        'INITIAL'
      ) {

        setSuccess(
          'Premier relevé enregistré avec succès.'
        );

        setSuccessNote(
          "L'index initial est conservé comme référence pour les prochains relevés. Aucune ancienne valeur n'a été inventée et la consommation de cette première période n'a pas été calculée."
        );

      } else {

        // ----------------------------------------------
        // RELEVÉ PÉRIODIQUE
        // ----------------------------------------------

        setSuccess(
          'Relevé périodique enregistré avec succès.'
        );

        setSuccessNote(
          response.message ||
          'Le Backend a confirmé la création du relevé.'
        );
      }

    } catch (err: unknown) {

      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de transmettre le relevé.'
      );

    } finally {

      setSaving(false);

    }
  };

  // ====================================================
  // INTERFACE
  // ====================================================

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >

        {/* RETOUR */}

        <Pressable
          onPress={onBack}
          style={styles.back}
        >
          <Text style={styles.backText}>
            ← Retour à la mission
          </Text>
        </Pressable>

        {/* TITRE */}

        <Text style={styles.title}>
          Saisie du nouvel index
        </Text>

        <Text style={styles.subtitle}>
          Renseignez uniquement la valeur réellement observée
          sur le compteur.
        </Text>

        {/* INFORMATIONS COMPTEUR */}

        <View style={styles.meterCard}>

          <Text style={styles.label}>
            COMPTEUR
          </Text>

          <Text style={styles.meterNumber}>
            {mission?.numero_compteur || '—'}
          </Text>

          <Text style={styles.meterType}>
            {mission?.type_compteur || 'Type non précisé'}
            {unit ? ` · ${unit}` : ''}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.label}>
            ANCIEN INDEX DE RÉFÉRENCE · LECTURE SEULE
          </Text>

          <Text style={styles.previous}>
            {previousValue}
          </Text>

          <Text style={styles.previousDate}>
            Date : {mission?.dernier_releve || 'Non disponible'}
          </Text>

        </View>

        {/* PREMIER RELEVÉ */}

        {previous.kind === 'none' && (

          <View style={styles.initialNotice}>

            <Text style={styles.initialTitle}>
              PREMIER RELEVÉ — ANCIEN INDEX INDISPONIBLE
            </Text>

            <Text style={styles.initialText}>
              Aucun relevé antérieur n'est enregistré dans
              l'historique accessible pour ce compteur.
            </Text>

            <Text style={styles.initialText}>
              Saisissez uniquement la valeur physique affichée
              sur le compteur. Ne remplacez jamais l'ancien
              index absent par zéro.
            </Text>

            <Text style={styles.initialText}>
              Le serveur enregistrera ce relevé comme index
              initial si aucune lecture antérieure n'existe
              pour ce compteur.
            </Text>

            <Text style={styles.initialText}>
              La consommation de cette première période sera
              non calculable. Cet index servira de référence
              lors du prochain relevé du même compteur.
            </Text>

          </View>
        )}

        {/* ANCIEN INDEX MANQUANT */}

        {previous.kind === 'missing' && (

          <View style={styles.warningNotice}>

            <Text style={styles.warningText}>
              Le champ de l'ancien index n'a pas été transmis
              par le serveur. Actualisez la mission avant toute
              saisie.
            </Text>

          </View>
        )}

        {/* ANCIEN INDEX INVALIDE */}

        {previous.kind === 'invalid' && (

          <View style={styles.warningNotice}>

            <Text style={styles.warningText}>
              L'ancien index reçu est incohérent. Le relevé
              ne peut pas être transmis avant vérification.
            </Text>

          </View>
        )}

        {/* FORMULAIRE */}

        <View style={styles.formCard}>

          <Text style={styles.label}>
            NOUVEL INDEX OBSERVÉ *
          </Text>

          <TextInput
            value={newIndex}
            onChangeText={(value) => {
              setNewIndex(
                value.replace(/[^0-9.,]/g, '')
              );

              setError('');
              setSuccess('');
              setSuccessNote('');
            }}
            keyboardType="decimal-pad"
            placeholder="Ex. 1250"
            placeholderTextColor={COLORS.muted}
            style={styles.indexInput}
            editable={!saving && !success}
          />

          <Text style={styles.hint}>
            Utilisez le clavier numérique et recopiez la valeur
            réellement affichée au compteur.
          </Text>

          <Text
            style={[
              styles.label,
              { marginTop: 18 },
            ]}
          >
            OBSERVATION (FACULTATIVE)
          </Text>

          <TextInput
            value={observation}
            onChangeText={setObservation}
            placeholder="Ex. compteur accessible, cadran lisible..."
            placeholderTextColor={COLORS.muted}
            multiline
            style={styles.observation}
            editable={!saving && !success}
          />

          <Text style={styles.hint}>
            L'ancien index et la consommation ne sont pas
            envoyés par le Mobile. Le Backend utilise les
            données enregistrées dans PostgreSQL.
          </Text>

        </View>

        {/* ERREUR */}

        {!!error && (

          <View style={styles.errorBox}>

            <Text style={styles.errorText}>
              {error}
            </Text>

          </View>
        )}

        {/* SUCCÈS */}

        {!!success && (

          <View style={styles.successBox}>

            <Text style={styles.successText}>
              {success}
            </Text>

            <Text style={styles.successHint}>
              {successNote}
            </Text>

          </View>
        )}

        {/* BOUTON ENREGISTRER */}

        {!success ? (

          <Pressable
            disabled={saving || !canSubmit}
            onPress={() => void submit()}
            style={[
              styles.submit,
              (saving || !canSubmit) &&
                styles.disabledButton,
            ]}
          >

            {saving ? (

              <ActivityIndicator color="#FFFFFF" />

            ) : (

              <Text style={styles.submitText}>
                Enregistrer le relevé
              </Text>

            )}

          </Pressable>

        ) : (

          <Pressable
            onPress={onSaved}
            style={styles.submit}
          >

            <Text style={styles.submitText}>
              Terminer et revenir aux missions
            </Text>

          </Pressable>

        )}

      </ScrollView>

    </KeyboardAvoidingView>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({

  flex: {
    flex: 1,
  },

  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    padding: 16,
    paddingBottom: 35,
  },

  back: {
    paddingVertical: 8,
  },

  backText: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: '900',
  },

  title: {
    color: COLORS.text,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 7,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    marginBottom: 15,
  },

  meterCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 17,
    padding: 17,
  },

  label: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  meterNumber: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 6,
  },

  meterType: {
    color: '#C9E3ED',
    fontSize: 11,
    marginTop: 3,
  },

  divider: {
    height: 1,
    backgroundColor: '#31566F',
    marginVertical: 15,
  },

  previous: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 7,
  },

  previousDate: {
    color: '#C9E3ED',
    fontSize: 10,
    marginTop: 5,
  },

  initialNotice: {
    backgroundColor: '#EAF4FB',
    borderWidth: 1,
    borderColor: '#B9DDEB',
    borderRadius: 14,
    padding: 14,
    marginTop: 13,
  },

  initialTitle: {
    color: COLORS.blue,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 7,
  },

  initialText: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  warningNotice: {
    backgroundColor: COLORS.warningBg,
    borderRadius: 12,
    padding: 12,
    marginTop: 13,
  },

  warningText: {
    color: COLORS.warning,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '700',
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginTop: 13,
  },

  indexInput: {
    height: 70,
    borderWidth: 2,
    borderColor: COLORS.blue,
    borderRadius: 12,
    marginTop: 9,
    paddingHorizontal: 16,
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.navy,
    textAlign: 'center',
    backgroundColor: '#F8FCFE',
  },

  hint: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 7,
  },

  observation: {
    minHeight: 85,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 11,
    color: COLORS.text,
    textAlignVertical: 'top',
    marginTop: 8,
  },

  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.dangerBg,
  },

  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  successBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.successBg,
  },

  successText: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: '900',
  },

  successHint: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },

  submit: {
    backgroundColor: COLORS.blue,
    minHeight: 53,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    paddingHorizontal: 12,
  },

  submitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },

  disabledButton: {
    opacity: 0.45,
  },

});
