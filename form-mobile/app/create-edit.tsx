import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { EditorialScreen, SectionLabel, editorial } from '../src/components/Editorial';
import { DetailHeader, TextAction } from '../src/components/DetailHeader';
import { getLooksProvider } from '../src/providers';
import { useFormStore } from '../src/state/store';
import { colors } from '../src/theme/tokens';
export default function CreateEditScreen() {
  const router = useRouter();
  const profile = useFormStore(s => s.profile);
  const addSession = useFormStore(s => s.addSession);
  const [occasion, setOccasion] = useState('');
  const [dressCode, setDressCode] = useState('');
  const [budget, setBudget] = useState(String(profile.budgetCents / 100));
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fields = [
    { label: 'Occasion / context', value: occasion, change: setOccasion, placeholder: 'Dinner in Manhattan' },
    { label: 'Dress code', value: dressCode, change: setDressCode, placeholder: 'Smart casual' },
    { label: 'Budget ($)', value: budget, change: setBudget, placeholder: '350', numeric: true },
    { label: 'Location · optional', value: location, change: setLocation, placeholder: 'New York' },
    { label: 'Notes · optional', value: notes, change: setNotes, placeholder: 'Drinks after; understated.' },
  ];
  async function submit() {
    const amount = Number(budget);
    if (!occasion.trim() || !dressCode.trim() || !Number.isFinite(amount) || amount <= 0) { setError('Add an occasion, dress code and a positive budget.'); return; }
    setError(''); setBusy(true);
    try {
      const session = await getLooksProvider().buildLooks({ occasion: occasion.trim(), dressCode: dressCode.trim(), budgetCents: Math.round(amount * 100), location: location.trim() || undefined, notes: notes.trim() || undefined }, profile);
      addSession(session); router.replace('/edits');
    } catch { setError('Your edit could not be created. Please try again.'); } finally { setBusy(false); }
  }
  return <KeyboardAvoidingView style={editorial.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><EditorialScreen><DetailHeader title="A specific need" /><Text style={editorial.heading}>Create an edit</Text><Text style={[editorial.secondary, { marginTop: 10, marginBottom: 24 }]}>A few details for a complete look.</Text>
    {fields.map(field => <View key={field.label} style={styles.field}><SectionLabel>{field.label}</SectionLabel><TextInput accessibilityLabel={field.label} value={field.value} onChangeText={field.change} placeholder={field.placeholder} placeholderTextColor={colors.muted} keyboardType={field.numeric ? 'decimal-pad' : 'default'} style={styles.input} maxLength={field.label.startsWith('Notes') ? 500 : 140} multiline={field.label.startsWith('Notes')} /></View>)}
    {!!error && <Text accessibilityRole="alert" style={editorial.body}>{error}</Text>}<TextAction dark disabled={busy} label={busy ? 'Creating edit…' : 'Create edit →'} onPress={() => { void submit(); }} />
    <Text style={[editorial.secondary, { marginTop: 14 }]}>Local demo looks, selected within your request and profile budgets. Notes and location are kept with your edit; fixture styling uses dress code, budget and preferences.</Text>
  </EditorialScreen></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ field: { marginBottom: 20 }, input: { ...editorial.body, minHeight: 52, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line2 } });
