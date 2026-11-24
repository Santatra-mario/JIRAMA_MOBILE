import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useAuth } from './AuthContext';
import { COLORS } from '../theme/colors';

type LoginScreenProps = {
  offlineWarning?: string | null;
};

export default function LoginScreen({ offlineWarning }: LoginScreenProps) {
  const { signIn } = useAuth();
  const { width, height } = useWindowDimensions();
  const isWide = width >= 700;
  const compactHeight = height < 700;
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const submit = async () => {
    setError('');
    if (!identifiant.trim() || !motDePasse) {
      setError('Veuillez renseigner votre identifiant et votre mot de passe.');
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      // Authentification existante : aucune nouvelle API ni aucun compte fictif.
      await signIn(identifiant.trim(), motDePasse);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Connexion impossible. VÃ©rifiez vos identifiants et rÃ©essayez.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            isWide && styles.scrollWide,
            compactHeight && styles.scrollCompact,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.leftPanel, isWide && styles.leftPanelWide]}>
            <View style={styles.decorCircleOne} />
            <View style={styles.decorCircleTwo} />
            <View style={styles.brandRow}>
              <View style={styles.logoFrame}>
                <Image
                  source={require('../../../assets/jirama-logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.brandTextBlock}>
                <Text style={styles.brand}>JIRAMA</Text>
                <Text style={styles.brandSub}>JIRO SY RANO MALAGASY</Text>
              </View>
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>ESPACE PROFESSIONNEL Â· ANTSIRABE</Text>
              <Text style={[styles.heroTitle, compactHeight && styles.heroTitleCompact]}>
                Le suivi terrain, simplement.
              </Text>
              <Text style={styles.heroText}>
                Consultez les missions affectÃ©es, vÃ©rifiez les compteurs et transmettez les relevÃ©s depuis votre espace Agent.
              </Text>
            </View>

            <View style={styles.heroPills}>
              <View style={styles.heroPill}><Text style={styles.heroPillEmoji}>ðŸ“Ÿ</Text><Text style={styles.heroPillText}>RelevÃ©s</Text></View>
              <View style={styles.heroPill}><Text style={styles.heroPillEmoji}>ðŸŽ¯</Text><Text style={styles.heroPillText}>Missions</Text></View>
              <View style={styles.heroPill}><Text style={styles.heroPillEmoji}>ðŸ”Ž</Text><Text style={styles.heroPillText}>ContrÃ´les</Text></View>
            </View>

            <View style={styles.accessLine}>
              <View style={styles.accessDot} />
              <Text style={styles.accessText}>AccÃ¨s rÃ©servÃ© aux Agents autorisÃ©s</Text>
            </View>
          </View>

          <Animated.View
            style={[
              styles.formPanel,
              isWide && styles.formPanelWide,
              {
                opacity: entrance,
                transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
              },
            ]}
          >
            <View style={styles.formHeadingRow}>
              <View>
                <Text style={styles.formEyebrow}>BIENVENUE</Text>
                <Text style={styles.formTitle}>Connexion Agent</Text>
                <Text style={styles.formSubtitle}>Utilisez vos identifiants habituels.</Text>
              </View>
              <View style={styles.lockIcon}><Text style={styles.lockEmoji}>ðŸ”</Text></View>
            </View>

            {!!offlineWarning && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>âš ï¸ Serveur momentanÃ©ment inaccessible</Text>
                <Text style={styles.warningText}>{offlineWarning}</Text>
              </View>
            )}

            <Text style={styles.label}>Identifiant ou adresse e-mail</Text>
            <TextInput
              value={identifiant}
              onChangeText={(value) => { setIdentifiant(value); setError(''); }}
              placeholder="Votre identifiant Agent"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              editable={!loading}
              style={styles.input}
              accessibilityLabel="Identifiant Agent"
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
                accessibilityLabel="Mot de passe"
              />
              <Pressable
                onPress={() => setShowPassword((visible) => !visible)}
                style={styles.showButton}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                <Text style={styles.showText}>{showPassword ? 'Masquer' : 'Afficher'}</Text>
              </Pressable>
            </View>

            {!!error && (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorTitle}>Connexion impossible</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              onPress={submit}
              disabled={loading}
              style={({ pressed }) => [
                styles.submit,
                pressed && !loading && styles.submitPressed,
                loading && styles.submitDisabled,
              ]}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>Se connecter  â†’</Text>
              )}
            </Pressable>

            <View style={styles.securityRow}>
              <Text style={styles.securityEmoji}>ðŸ›¡ï¸</Text>
              <Text style={styles.securityText}>Connexion sÃ©curisÃ©e Â· Session Agent</Text>
            </View>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerBrand}>JIRAMA Â· Jiro sy Rano Malagasy</Text>
            <Text style={styles.footerText}>Assistance clientÃ¨le : 547 Â· service-client@jirama.mg</Text>
            <Text style={styles.footerText}>149, rue Rainandriamampandry Â· Antananarivo Â· Madagascar</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.navy },
  scroll: { flexGrow: 1, paddingBottom: 18 },
  scrollWide: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'center', paddingHorizontal: 30, paddingTop: 24 },
  scrollCompact: { paddingBottom: 12 },
  leftPanel: { minHeight: 255, paddingHorizontal: 22, paddingTop: 27, paddingBottom: 20, backgroundColor: COLORS.navy, overflow: 'hidden' },
  leftPanelWide: { width: '46%', minHeight: 520, maxWidth: 560, borderTopLeftRadius: 22, borderBottomLeftRadius: 22, justifyContent: 'space-between', paddingHorizontal: 30, paddingVertical: 32 },
  decorCircleOne: { position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderColor: 'rgba(189,234,240,0.13)', right: -110, top: -115 },
  decorCircleTwo: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 1, borderColor: 'rgba(189,234,240,0.10)', right: -58, bottom: -95 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoFrame: { width: 54, height: 54, borderRadius: 15, backgroundColor: '#FFFFFF', padding: 6, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 42, height: 42 },
  brandTextBlock: { justifyContent: 'center' },
  brand: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', letterSpacing: 1.2 },
  brandSub: { color: '#BBD8E8', fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginTop: 2 },
  heroCopy: { marginTop: 25, maxWidth: 460 },
  eyebrow: { color: '#83D9E7', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { color: '#FFFFFF', fontSize: 29, lineHeight: 35, fontWeight: '900', marginTop: 9 },
  heroTitleCompact: { fontSize: 25, lineHeight: 30 },
  heroText: { color: '#D1E1EA', fontSize: 13, lineHeight: 20, marginTop: 9 },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 18 },
  heroPill: { minHeight: 31, paddingHorizontal: 10, borderRadius: 18, borderWidth: 1, borderColor: '#315A73', backgroundColor: '#123D5E', flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroPillEmoji: { fontSize: 12 },
  heroPillText: { color: '#E4F2F7', fontSize: 10, fontWeight: '800' },
  accessLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22 },
  accessDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#40D6A5' },
  accessText: { color: '#D2E9F1', fontSize: 10, fontWeight: '700' },
  formPanel: { backgroundColor: COLORS.surface, marginHorizontal: 14, marginTop: 14, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 22, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#001C32', shadowOpacity: 0.13, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  formPanelWide: { width: '46%', maxWidth: 560, minHeight: 520, marginHorizontal: 0, marginTop: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, justifyContent: 'center', paddingHorizontal: 32 },
  formHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  formEyebrow: { color: COLORS.blue, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  formTitle: { color: COLORS.text, fontSize: 24, fontWeight: '900', marginTop: 3 },
  formSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 5 },
  lockIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: COLORS.blueLight, alignItems: 'center', justifyContent: 'center' },
  lockEmoji: { fontSize: 21 },
  warningBox: { backgroundColor: COLORS.warningBg, borderColor: '#F0D7A5', borderWidth: 1, borderRadius: 12, padding: 11, marginBottom: 16 },
  warningTitle: { color: COLORS.warning, fontWeight: '900', fontSize: 11 },
  warningText: { color: COLORS.text, fontSize: 11, lineHeight: 17, marginTop: 4 },
  label: { color: COLORS.text, fontSize: 12, fontWeight: '800', marginBottom: 7 },
  input: { minHeight: 50, borderRadius: 11, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt, paddingHorizontal: 13, color: COLORS.text, fontSize: 14 },
  passwordLabel: { marginTop: 16 },
  passwordWrap: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderRadius: 11, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt },
  passwordInput: { flex: 1, paddingHorizontal: 13, paddingVertical: 11, color: COLORS.text, fontSize: 14 },
  showButton: { paddingHorizontal: 12, paddingVertical: 12 },
  showText: { color: COLORS.blue, fontSize: 11, fontWeight: '900' },
  errorBox: { backgroundColor: COLORS.dangerBg, borderColor: '#F1BFC5', borderWidth: 1, borderRadius: 11, padding: 11, marginTop: 14 },
  errorTitle: { color: COLORS.danger, fontWeight: '900', fontSize: 11 },
  errorText: { color: '#81333A', fontSize: 11, lineHeight: 17, marginTop: 4 },
  submit: { minHeight: 52, marginTop: 20, borderRadius: 12, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.navy, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  submitPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  submitDisabled: { opacity: 0.62 },
  submitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 15 },
  securityEmoji: { fontSize: 12 },
  securityText: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  footer: { alignItems: 'center', paddingHorizontal: 12, paddingTop: 17, paddingBottom: 8 },
  footerBrand: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  footerText: { color: '#C4D8E4', fontSize: 8, textAlign: 'center', marginTop: 4 },
});

