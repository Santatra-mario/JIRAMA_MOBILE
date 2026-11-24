import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS } from '../theme/colors';

export function PageContainer({ children, refreshing, onRefresh }: React.PropsWithChildren<{ refreshing?: boolean; onRefresh?: () => void }>) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={COLORS.blue} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function PageHeading({ eyebrow, title, subtitle, right }: { eyebrow?: string; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.headingRow}>
      <View style={styles.headingText}>
        {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>}
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled, compact }: { label: string; onPress: () => void; disabled?: boolean; compact?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.primaryButton, compact && styles.primaryCompact, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.secondaryButton, disabled && styles.disabled, pressed && styles.pressed]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SearchField({ value, onChangeText, placeholder = 'Rechercher…' }: { value: string; onChangeText: (value: string) => void; placeholder?: string }) {
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={COLORS.subtle} autoCapitalize="none" autoCorrect={false} style={styles.search} />;
}

export function FilterRow({ items, value, onChange }: { items: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
      {items.map((item) => (
        <Pressable key={item.value} onPress={() => onChange(item.value)} style={[styles.filterChip, value === item.value && styles.filterChipActive]}>
          <Text style={[styles.filterText, value === item.value && styles.filterTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function Panel({ children, title, right }: React.PropsWithChildren<{ title?: string; right?: React.ReactNode }>) {
  return (
    <View style={styles.panel}>
      {(title || right) && <View style={styles.panelHeader}>{title ? <Text style={styles.panelTitle}>{title}</Text> : <View />}{right}</View>}
      {children}
    </View>
  );
}

export function MetricCard({ label, value, tone = 'blue', note }: { label: string; value: string | number; tone?: 'blue' | 'orange' | 'green' | 'red'; note?: string }) {
  const color = tone === 'green' ? COLORS.success : tone === 'red' ? COLORS.danger : tone === 'orange' ? COLORS.orange : COLORS.blue;
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricAccent, { backgroundColor: color }]} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {!!note && <Text style={styles.metricNote}>{note}</Text>}
    </View>
  );
}

export function DataCard({ title, subtitle, badge, children, onPress, action }: React.PropsWithChildren<{ title: string; subtitle?: string; badge?: string; onPress?: () => void; action?: React.ReactNode }>) {
  const content = (
    <View style={styles.dataCard}>
      <View style={styles.dataCardTop}>
        <View style={styles.dataCardTitleWrap}>
          <Text style={styles.dataCardTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.dataCardSubtitle}>{subtitle}</Text>}
        </View>
        {!!badge && <StatusBadge value={badge} />}
      </View>
      {!!children && <View style={styles.dataCardBody}>{children}</View>}
      {!!action && <View style={styles.dataCardAction}>{action}</View>}
    </View>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => pressed ? styles.pressed : undefined}>{content}</Pressable> : content;
}

export function FieldRow({ label, value }: { label: string; value: unknown }) {
  const text = value === null || value === undefined || value === '' ? '—' : String(value);
  return <View style={styles.fieldRow}><Text style={styles.fieldLabel}>{label}</Text><Text style={styles.fieldValue}>{text}</Text></View>;
}

export function StatusBadge({ value }: { value: string }) {
  const code = String(value || '').toUpperCase();
  const isOk = ['ACTIF', 'TERMINEE', 'RESOLUE', 'VERIFIEE', 'ENVOYE', 'SUCCES'].includes(code);
  const isBad = ['CRITIQUE', 'A_REPROGRAMMER', 'ERREUR', 'REFUSE', 'INACTIF'].includes(code);
  const isWarn = ['NOUVELLE', 'EN_COURS', 'PLANIFIEE', 'A_VERIFIER', 'EN_ATTENTE', 'ATTENTION', 'SUSPECTE', 'A_CONTROLER'].includes(code);
  const color = isOk ? COLORS.success : isBad ? COLORS.danger : isWarn ? COLORS.warning : COLORS.blue;
  const bg = isOk ? COLORS.successBg : isBad ? COLORS.dangerBg : isWarn ? COLORS.warningBg : COLORS.blueLight;
  return <View style={[styles.badge, { backgroundColor: bg }]}><Text style={[styles.badgeText, { color }]}>{String(value || '—').replace(/_/g, ' ')}</Text></View>;
}

export function LoadingBlock({ label = 'Chargement des données…' }: { label?: string }) {
  return <View style={styles.stateBox}><ActivityIndicator color={COLORS.blue} size="large" /><Text style={styles.stateText}>{label}</Text></View>;
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <View style={styles.errorBox}><Text style={styles.errorTitle}>Données indisponibles</Text><Text style={styles.errorText}>{message}</Text>{!!onRetry && <SecondaryButton label="Réessayer" onPress={onRetry} />}</View>;
}

export function EmptyBlock({ title, message }: { title: string; message: string }) {
  return <View style={styles.emptyBox}><Text style={styles.emptyIcon}>⌕</Text><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{message}</Text></View>;
}

export function FormField({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline, secureTextEntry }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad'; multiline?: boolean; secureTextEntry?: boolean }) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={COLORS.subtle} keyboardType={keyboardType} multiline={multiline} secureTextEntry={secureTextEntry} autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'} style={[styles.formInput, multiline && styles.multiline]} />
    </View>
  );
}

export const UI_STYLES = styles;

const styles = StyleSheet.create({
  scroll: { flex: 1 }, content: { padding: 16, paddingBottom: 34, gap: 14 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 2 }, headingText: { flex: 1 }, eyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, color: COLORS.blue, marginBottom: 5 }, title: { fontSize: 23, lineHeight: 29, fontWeight: '900', color: COLORS.navy }, subtitle: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 5 },
  primaryButton: { minHeight: 45, paddingHorizontal: 15, borderRadius: 9, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center' }, primaryCompact: { minHeight: 38, paddingHorizontal: 11 }, primaryButtonText: { color: COLORS.white, fontWeight: '900', fontSize: 12 }, secondaryButton: { minHeight: 42, paddingHorizontal: 13, borderWidth: 1, borderColor: COLORS.borderStrong, borderRadius: 9, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' }, secondaryButtonText: { color: COLORS.blue, fontWeight: '800', fontSize: 12 }, disabled: { opacity: 0.5 }, pressed: { opacity: 0.78 },
  search: { minHeight: 46, backgroundColor: COLORS.field, borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, paddingHorizontal: 13, color: COLORS.text, fontSize: 13 }, filterRow: { gap: 7, paddingVertical: 2 }, filterChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }, filterChipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy }, filterText: { fontSize: 10, color: COLORS.muted, fontWeight: '800' }, filterTextActive: { color: COLORS.white },
  panel: { backgroundColor: 'rgba(248,250,252,0.95)', borderRadius: 12, borderColor: COLORS.border, borderWidth: 1, padding: 14 }, panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }, panelTitle: { color: COLORS.navy, fontSize: 14, fontWeight: '900' }, metricCard: { width: '48%', minHeight: 103, padding: 13, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, overflow: 'hidden' }, metricAccent: { width: 30, height: 3, borderRadius: 3, marginBottom: 8 }, metricLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '700' }, metricValue: { fontSize: 25, fontWeight: '900', marginTop: 4 }, metricNote: { color: COLORS.subtle, fontSize: 9, marginTop: 3 },
  dataCard: { padding: 13, borderRadius: 11, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginBottom: 10 }, dataCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }, dataCardTitleWrap: { flex: 1 }, dataCardTitle: { color: COLORS.navy, fontSize: 14, fontWeight: '900' }, dataCardSubtitle: { color: COLORS.muted, fontSize: 10, marginTop: 4, lineHeight: 15 }, dataCardBody: { marginTop: 10, gap: 7 }, dataCardAction: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 10, paddingTop: 10 }, fieldRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 3 }, fieldLabel: { color: COLORS.subtle, fontSize: 10, flex: 1 }, fieldValue: { color: COLORS.text, fontSize: 10, fontWeight: '800', textAlign: 'right', flex: 1.3 }, badge: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 20, alignSelf: 'flex-start' }, badgeText: { fontSize: 9, fontWeight: '900' },
  stateBox: { alignItems: 'center', justifyContent: 'center', padding: 36, gap: 12 }, stateText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' }, errorBox: { backgroundColor: COLORS.dangerBg, borderWidth: 1, borderColor: '#FECACA', padding: 14, borderRadius: 11, gap: 8 }, errorTitle: { color: COLORS.danger, fontWeight: '900', fontSize: 13 }, errorText: { color: COLORS.text, fontSize: 11, lineHeight: 17 }, emptyBox: { alignItems: 'center', padding: 26, backgroundColor: 'rgba(248,250,252,0.88)', borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.borderStrong, borderRadius: 12 }, emptyIcon: { color: COLORS.subtle, fontSize: 28 }, emptyTitle: { color: COLORS.navy, fontWeight: '900', fontSize: 13, marginTop: 7 }, emptyText: { color: COLORS.muted, fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 4 },
  formField: { gap: 6, marginBottom: 12 }, formLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }, formInput: { minHeight: 44, borderWidth: 1, borderColor: COLORS.borderStrong, borderRadius: 9, backgroundColor: COLORS.field, paddingHorizontal: 11, color: COLORS.text, fontSize: 13 }, multiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 },
});
