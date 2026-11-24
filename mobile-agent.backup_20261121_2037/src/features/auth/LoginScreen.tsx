import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { COLORS } from '../../theme/colors';

export default function LoginScreen({ offlineWarning }: { offlineWarning?: string | null }) {
  const { signIn } = useAuth();
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!identifiant.trim() || !motDePasse) {
      setError('Veuillez renseigner votre identifiant et votre mot de passe.');
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      await signIn(identifiant, motDePasse);
    } catch (err: any) {
      setError(err?.message || 'Connexion impossible. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.brandRow}>
              <View style={styles.logoFrame}>
                <Image source={require('../../../assets/jirama-logo.png')} style={styles.logo} resizeMode="contain" />
              </View>
              <View>
                <Text style={styles.brand}>JIRAMA</Text>
                <Text style={styles.brandSub}>ANTSIRABE · ESPACE AGENT</Text>
              </View>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>ESPACE PROFESSIONNEL</Text>
              <Text style={styles.heroTitle}>Votre terrain, vos missions.</Text>
              <Text style={styles.heroText}>Connectez-vous pour consulter vos contrôles et saisir les nouveaux index des compteurs.</Text>
            </View>
            <View style={styles.heroFooter}>
              <View style={styles.liveDot} />
              <Text style={styles.heroFooterText}>Accès réservé aux Agents autorisés</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Connexion</Text>
            <Text style={styles.formSubtitle}>Utilisez les mêmes identifiants que votre espace JIRAMA.</Text>
            {!!offlineWarning && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Connexion au serveur requise</Text>
                <Text style={styles.warningText}>{offlineWarning}</Text>
              </View>
            )}

            <Text style={styles.label}>Identifiant ou adresse e-mail</Text>
            <TextInput
              value={identifiant}
              onChangeText={(value) => { setIdentifiant(value); setError(''); }}
              placeholder="Ex. agent01 ou agent@jirama.mg"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              editable={!loading}
              style={styles.input}
            />

            <Text style={[styles.label, styles.passwordLabel]}>Mot de passe</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                value={motDePasse}
                onChangeText={(value) => { setMotDePasse(value); setError(''); }}
                placeholder="Votre mot de passe"
                placeholderTextColor={COLORS.muted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
                editable={!loading}
                style={styles.passwordInput}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} style={styles.showButton}>
                <Text style={styles.showText}>{showPassword ? 'Masquer' : 'Afficher'}</Text>
              </Pressable>
            </View>

            {!!error && (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorTitle}>Connexion impossible</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable onPress={submit} disabled={loading} style={({ pressed }) => [styles.submit, pressed && !loading && styles.submitPressed, loading && styles.submitDisabled]}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Se connecter</Text>}
            </Pressable>
            <Text style={styles.securityText}>Connexion sécurisée · Authentification JIRAMA</Text>
            <Text style={styles.version}>Application mobile Agent · Version 1.0.0</Text>
          </View>
          <Text style={styles.footer}>JIRAMA Antsirabe · Module mobile de relève et de contrôle</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.navy },
  scroll: { flexGrow: 1, paddingBottom: 20 },
  hero: { backgroundColor: COLORS.navy, paddingHorizontal: 24, paddingTop: 44, paddingBottom: 28, minHeight: 270, justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoFrame: { width: 56, height: 56, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 7, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 44, height: 44 },
  brand: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', letterSpacing: 1.3 },
  brandSub: { color: '#BBD8E8', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroCopy: { marginTop: 30 },
  eyebrow: { color: '#83D9E7', fontSize: 10, fontWeight: '900', letterSpacing: 1.7 },
  heroTitle: { color: '#FFFFFF', fontSize: 29, lineHeight: 35, fontWeight: '900', marginTop: 9 },
  heroText: { color: '#D1E1EA', fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 360 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 22, gap: 9 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#40D6A5' },
  heroFooterText: { color: '#D2E9F1', fontSize: 11, fontWeight: '700' },
  formCard: { backgroundColor: COLORS.surface, marginHorizontal: 16, marginTop: -2, borderRadius: 22, padding: 22, shadowColor: '#001C32', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  formTitle: { color: COLORS.text, fontSize: 25, fontWeight: '900' },
  formSubtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 22 },
  label: { color: COLORS.text, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt, paddingHorizontal: 14, color: COLORS.text, fontSize: 15 },
  passwordLabel: { marginTop: 18 },
  passwordWrap: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 15 },
  showButton: { paddingHorizontal: 13, paddingVertical: 12 },
  showText: { color: COLORS.blue, fontSize: 12, fontWeight: '900' },
  warningBox: { backgroundColor: COLORS.warningBg, borderColor: '#F0D7A5', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  warningTitle: { color: COLORS.warning, fontWeight: '900', fontSize: 12 },
  warningText: { color: COLORS.text, fontSize: 12, lineHeight: 18, marginTop: 4 },
  errorBox: { backgroundColor: COLORS.dangerBg, borderColor: '#F1BFC5', borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 16 },
  errorTitle: { color: COLORS.danger, fontWeight: '900', fontSize: 12 },
  errorText: { color: '#81333A', fontSize: 12, lineHeight: 18, marginTop: 4 },
  submit: { minHeight: 54, marginTop: 22, borderRadius: 13, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center' },
  submitPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  submitDisabled: { opacity: 0.65 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  securityText: { textAlign: 'center', color: COLORS.muted, fontSize: 11, marginTop: 15 },
  version: { textAlign: 'center', color: '#8495A1', fontSize: 10, marginTop: 8 },
  footer: { color: '#C4D8E4', fontSize: 10, textAlign: 'center', marginTop: 18, paddingHorizontal: 18 },
});
