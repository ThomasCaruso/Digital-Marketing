import { MotionPressable } from '../../src/components/MotionPressable';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { EditorialScreen, SectionLabel, editorial } from '../../src/components/Editorial';
import { FormIcon } from '../../src/components/FormIcon';
import { previewAssets } from '../../src/data/preview';
import { formatMoney } from '../../src/domain/selectors';
import { useFormStore } from '../../src/state/store';
import { colors } from '../../src/theme/tokens';
import { family } from '../../src/theme/typography';
const palette = [{ name: 'Soft black', color: '#29231D' }, { name: 'Taupe', color: '#9A8A79' }, { name: 'Bone', color: '#E4DACE' }, { name: 'Grey', color: '#91918E' }, { name: 'Navy', color: '#29313F' }];
export default function ProfileScreen() {
  const router = useRouter();
  const state = useFormStore();
  const profile = state.profile;
  return <EditorialScreen>
    <View style={styles.hero}>
      <Image source={previewAssets.portrait} style={styles.portrait} accessibilityLabel="Demo style profile portrait" />
      <Text maxFontSizeMultiplier={1.2} style={styles.title}>Your Style</Text>
    </View>
    <Text style={styles.descriptor}>{profile.styles.join('. ') || 'Find your direction'}.</Text>
    <View style={styles.section}><View style={editorial.row}><SectionLabel>Style DNA</SectionLabel><MotionPressable accessibilityRole="button" accessibilityLabel="Edit style and personal preferences" onPress={() => router.push('/edit-profile')} style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'flex-end' }}><Text style={styles.editText}>Edit</Text></MotionPressable></View><View style={styles.pills}>{profile.styles.map(tag => <View key={tag} style={styles.pill}><Text style={styles.pillText}>{tag}</Text></View>)}</View></View>
    <View style={editorial.rule} /><SectionLabel>Color palette</SectionLabel><View style={styles.preferences}>{palette.map(item => <MotionPressable key={item.name} accessibilityRole="button" accessibilityLabel={'Favorite color: ' + item.name} accessibilityState={{ selected: profile.favoriteColors?.includes(item.name) }} onPress={() => state.updateProfile({ ...profile, favoriteColors: profile.favoriteColors?.includes(item.name) ? profile.favoriteColors.filter(c => c !== item.name) : [...(profile.favoriteColors ?? []), item.name], avoidedColors: (profile.avoidedColors ?? []).filter(c => c !== item.name) })} style={[styles.swatchTouch, profile.favoriteColors?.includes(item.name) && styles.swatchSelected]}><View style={[styles.swatch, { backgroundColor: item.color }]} /></MotionPressable>)}</View>
    <View style={editorial.rule} />
    {[{ label: 'Brands', value: profile.brands.join(' · ') || 'Open to all' }, { label: 'Avoided brands', value: profile.avoidedBrands?.join(' · ') || 'None' }, { label: 'Avoided colors', value: profile.avoidedColors?.join(' · ') || 'None' }, { label: 'Measurements', value: profile.height + ' · ' + profile.topSize + ' · ' + profile.waist + '/' + profile.inseam + ' · ' + profile.shoe }, { label: 'Look budget', value: formatMoney(profile.budgetCents) }].map(item => <MotionPressable key={item.label} accessibilityRole="button" accessibilityLabel={'Edit ' + item.label + ': ' + item.value} onPress={() => router.push('/edit-profile')} style={styles.preferenceRow}><Text style={editorial.body}>{item.label}</Text><Text numberOfLines={1} style={styles.rowValue}>{item.value}</Text><FormIcon name="chevron" size={16} color={colors.muted} /></MotionPressable>)}
    <View style={editorial.rule} /><SectionLabel>Your demo signals</SectionLabel>
    {[profile.styles.length ? 'Prioritizing ' + profile.styles.join(', ').toLowerCase() + '.' : 'No style preference selected.', 'Pieces above ' + formatMoney(profile.budgetCents) + ' move out of discovery.', profile.avoidedBrands?.length ? 'Excluding ' + profile.avoidedBrands.join(', ') + '.' : 'All fixture brands are welcome.', state.savedPieces.length + ' pieces and ' + state.saved.length + ' looks kept in Saved.'].map(line => <Text key={line} style={[editorial.secondary, { marginTop: 8 }]}>{line}</Text>)}
    <Text style={[editorial.secondary, { marginTop: 16 }]}>Local fixture rules respond to your choices. No production inference.</Text>
  </EditorialScreen>;
}
const styles = StyleSheet.create({
  hero: { position: 'relative', marginBottom: 6 },
  portrait: { width: '52%', height: 212, borderRadius: 12, alignSelf: 'flex-end', resizeMode: 'cover' },
  title: { position: 'absolute', left: 0, bottom: -14, maxWidth: '62%', fontFamily: family.serif, fontSize: 44, lineHeight: 49, color: colors.ink, letterSpacing: -0.4, zIndex: 2 },
  descriptor: { ...editorial.secondary, fontSize: 14, lineHeight: 22, marginTop: 26 },
  section: { marginTop: 24 }, pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pill: { backgroundColor: colors.paper2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 }, pillText: { fontFamily: family.sans, fontSize: 11, color: colors.ink2 },
  editText: { fontFamily: family.sansMedium, fontSize: 13, color: colors.ink },
  preferences: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 12, gap: 10 },
  swatchTouch: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' }, swatchSelected: { borderColor: colors.ink },
  swatch: { width: 34, height: 34, borderRadius: 17 }, preferenceRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 12 },
  rowValue: { ...editorial.secondary, flex: 1, textAlign: 'right' },
});
