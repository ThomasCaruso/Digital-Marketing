import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EditorialScreen, SectionLabel, editorial } from '../src/components/Editorial';
import { DetailHeader, TextAction } from '../src/components/DetailHeader';
import { showToast } from '../src/components/Toast';
import { catalogProducts } from '../src/data/catalog';
import { STYLE_OPTIONS } from '../src/data/looks';
import { useFormStore } from '../src/state/store';
import { colors } from '../src/theme/tokens';
const split = (value: string) => [...new Set(value.split(',').map(v => v.trim()).filter(Boolean))];
export default function EditProfileScreen() {
  const router = useRouter();
  const profile = useFormStore(s => s.profile);
  const updateProfile = useFormStore(s => s.updateProfile);
  const [styles, setStyles] = useState(profile.styles);
  const [values, setValues] = useState({
    favoriteColors: (profile.favoriteColors ?? []).join(', '), avoidedColors: (profile.avoidedColors ?? []).join(', '),
    brands: profile.brands.join(', '), avoidedBrands: (profile.avoidedBrands ?? []).join(', '),
    height: profile.height, topSize: profile.topSize, waist: profile.waist, inseam: profile.inseam, shoe: profile.shoe, budget: String(profile.budgetCents / 100),
  });
  const supportedStyles = STYLE_OPTIONS.filter(option => catalogProducts.some(product => product.styleTags?.includes(option.name)) || styles.includes(option.name));
  const [error, setError] = useState('');
  const fields: { key: keyof typeof values; label: string; numeric?: boolean }[] = [
    { key: 'favoriteColors', label: 'Favorite colors · comma separated' }, { key: 'avoidedColors', label: 'Avoided colors · comma separated' },
    { key: 'brands', label: 'Preferred brands · comma separated' }, { key: 'avoidedBrands', label: 'Avoided brands · comma separated' },
    { key: 'height', label: 'Height' }, { key: 'topSize', label: 'Top size' }, { key: 'waist', label: 'Waist (in)' },
    { key: 'inseam', label: 'Inseam (in)' }, { key: 'shoe', label: 'Shoe size (US)' }, { key: 'budget', label: 'Typical look budget ($)', numeric: true },
  ];
  function save() {
    const budget = Number(values.budget);
    if (!Number.isFinite(budget) || budget <= 0 || !values.height.trim() || !values.topSize.trim() || !values.waist.trim() || !values.inseam.trim() || !values.shoe.trim()) { setError('Add your measurements and a positive look budget.'); return; }
    const avoidedBrands = split(values.avoidedBrands), avoidedColors = split(values.avoidedColors);
    updateProfile({ ...profile, styles, favoriteColors: split(values.favoriteColors).filter(c => !avoidedColors.some(a => a.toLowerCase() === c.toLowerCase())), avoidedColors, brands: split(values.brands).filter(c => !avoidedBrands.some(a => a.toLowerCase() === c.toLowerCase())), avoidedBrands, height: values.height.trim(), topSize: values.topSize.trim(), waist: values.waist.trim(), inseam: values.inseam.trim(), shoe: values.shoe.trim(), budgetCents: Math.round(budget * 100) });
    showToast('Preferences saved · selection updated'); router.back();
  }
  return <KeyboardAvoidingView style={editorial.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><EditorialScreen><DetailHeader title="Personal preferences" /><Text style={editorial.heading}>Make it yours</Text>
    <View style={{ marginVertical: 24 }}><SectionLabel>Style preferences</SectionLabel><View style={form.pills}>{supportedStyles.map(option => <Pressable key={option.name} accessibilityRole="checkbox" accessibilityState={{ checked: styles.includes(option.name) }} onPress={() => setStyles(styles.includes(option.name) ? styles.filter(s => s !== option.name) : [...styles, option.name])} style={[form.pill, styles.includes(option.name) && { backgroundColor: colors.ink }]}><Text style={[editorial.secondary, styles.includes(option.name) && { color: colors.paper }]}>{option.name}{!catalogProducts.some(p => p.styleTags?.includes(option.name)) ? ' · not modeled in demo' : ''}</Text></Pressable>)}</View></View>
    {fields.map(field => <View key={field.key} style={{ marginBottom: 20 }}><SectionLabel>{field.label}</SectionLabel><TextInput accessibilityLabel={field.label} value={values[field.key]} onChangeText={value => setValues({ ...values, [field.key]: value })} style={form.input} keyboardType={field.numeric ? 'decimal-pad' : 'default'} maxLength={180} /></View>)}
    {!!error && <Text accessibilityRole="alert" style={editorial.body}>{error}</Text>}<TextAction dark label="Save preferences" onPress={save} />
    <Text style={[editorial.secondary, { marginTop: 16 }]}>Style and favorite colors rank fixture pieces. Avoided brands and colors exclude them. The budget caps pieces and complete generated looks; measurements populate demo size suggestions.</Text>
  </EditorialScreen></KeyboardAvoidingView>;
}
const form = StyleSheet.create({ pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }, pill: { minHeight: 48, borderRadius: 24, paddingHorizontal: 16, justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line2 }, input: { ...editorial.body, minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line2, paddingVertical: 12 } });

