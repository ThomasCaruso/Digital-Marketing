import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { EditorialScreen, SectionLabel, editorial } from '../src/components/Editorial';
import { DetailHeader, TextAction } from '../src/components/DetailHeader';
import { MotionPressable } from '../src/components/MotionPressable';
import { showToast } from '../src/components/Toast';
import { INTAKE_SLOTS, newGarmentId, slotLabel } from '../src/domain/garments';
import type { GarmentSlot, UserGarment } from '../src/domain/types';
import { useFormStore } from '../src/state/store';
import { deleteGarmentPhoto, importGarmentPhoto, removeGarmentWithFile } from '../src/storage/garmentFiles';
import { colors } from '../src/theme/tokens';
import { family } from '../src/theme/typography';

/**
 * Add a piece — intake for garments the user photographs themselves.
 * Guidance → camera or library → a minimal confirmation. The picked image is
 * copied into app-owned document storage immediately; only the durable local
 * URI is persisted. Nothing leaves the device in this build.
 * `editId` reopens the same form for an existing upload (metadata only).
 */
export default function AddPieceScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const addUserGarment = useFormStore(s => s.addUserGarment);
  const updateUserGarment = useFormStore(s => s.updateUserGarment);
  const existing = useFormStore(state => state.userGarments.find(g => g.id === editId));
  const editing = !!editId && !!existing;
  const [draft, setDraft] = useState<{ localUri: string; aspect?: number } | null>(editing && existing ? { localUri: existing.localUri, aspect: existing.aspect } : null);
  const [slot, setSlot] = useState<GarmentSlot | null>(existing?.slot ?? null);
  const [name, setName] = useState(existing?.name ?? '');
  const [color, setColor] = useState(existing?.color ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // An abandoned draft must not leave orphan bytes in document storage.
  const draftRef = useRef(draft);
  const keptRef = useRef(editing);
  useEffect(() => { draftRef.current = draft; }, [draft]);
  useEffect(() => () => { if (draftRef.current && !keptRef.current) void deleteGarmentPhoto(draftRef.current.localUri); }, []);

  function cancelDraft() {
    if (draft && !editing) void deleteGarmentPhoto(draft.localUri);
    setDraft(null); setSlot(null); setError('');
  }

  async function intake(assetUri: string, mimeType?: string | null, fileName?: string | null, aspect?: number) {
    setBusy(true); setError('');
    try {
      const kept = await importGarmentPhoto(assetUri, mimeType, fileName);
      setDraft({ localUri: kept.localUri, aspect });
    } catch {
      setError('This photo could not be kept on this device. Please try another.');
    } finally { setBusy(false); }
  }

  async function pickFromLibrary() {
    if (busy) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Photo library access is off for FORM. Enable it in Settings to add a piece.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset?.uri) await intake(asset.uri, asset.mimeType, asset.fileName, asset.width && asset.height ? asset.width / asset.height : undefined);
  }

  async function pickFromCamera() {
    if (busy) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { setError('Camera access is off for FORM. Enable it in Settings, or choose from your photo library.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset?.uri) await intake(asset.uri, asset.mimeType, asset.fileName, asset.width && asset.height ? asset.width / asset.height : undefined);
  }

  function save() {
    if (!slot || !draft) return;
    keptRef.current = true;
    if (editing && existing) {
      updateUserGarment(existing.id, { slot, name: name.trim() || undefined, color: color.trim() || undefined });
      showToast('Piece updated');
    } else {
      const garment: UserGarment = { id: newGarmentId(), source: 'user_upload', localUri: draft.localUri, slot, name: name.trim() || undefined, color: color.trim() || undefined, aspect: draft.aspect, createdAt: Date.now() };
      addUserGarment(garment);
      showToast('Piece saved · stays on this device');
    }
    if (router.canGoBack()) router.back(); else router.replace('/(tabs)/tryon');
  }

  function remove() {
    if (!existing) return;
    void removeGarmentWithFile(existing);
    showToast('Piece removed');
    if (router.canGoBack()) router.back(); else router.replace('/(tabs)/saved');
  }

  return <KeyboardAvoidingView style={editorial.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <EditorialScreen>
      <DetailHeader title={editing ? 'Your uploads' : 'Add a piece'} />
      {!draft ? <View>
        <Text style={editorial.heading}>Add a piece</Text>
        <Text style={[editorial.body, { marginTop: 12 }]}>Use a clear photo of the clothing by itself. Front-facing works best.</Text>
        <Text style={[editorial.secondary, { marginTop: 6 }]}>A simple background helps produce a better preview.</Text>
        <View style={{ marginTop: 28, gap: 14 }}>
          <TextAction dark disabled={busy} label={busy ? 'Keeping photo…' : 'Take a photo'} onPress={() => { void pickFromCamera(); }} />
          <TextAction disabled={busy} label="Choose from library" onPress={() => { void pickFromLibrary(); }} />
        </View>
        {!!error && <Text accessibilityRole="alert" style={[editorial.body, styles.error]}>{error}</Text>}
        <Text style={[editorial.secondary, styles.privacy]}>Your photo stays on this device in this demo.</Text>
      </View> : <View>
        <SectionLabel>ADD A PIECE</SectionLabel>
        <Image source={{ uri: draft.localUri }} resizeMode="cover" style={[styles.photo, draft.aspect && draft.aspect > 0 ? { aspectRatio: draft.aspect } : null]} accessibilityLabel={name || 'Your new piece'} />
        <Text style={styles.question}>What is it?</Text>
        <View style={styles.slots}>{INTAKE_SLOTS.map(value => (
          <MotionPressable key={value} accessibilityRole="radio" accessibilityState={{ selected: slot === value }} accessibilityLabel={slotLabel(value)} onPress={() => setSlot(value)} style={[styles.slot, slot === value && styles.slotActive]}>
            <Text style={[styles.slotText, slot === value && styles.slotTextActive]}>{slotLabel(value)}</Text>
          </MotionPressable>
        ))}</View>
        <View style={styles.field}><SectionLabel>Name · optional</SectionLabel>
          <TextInput accessibilityLabel="Piece name, optional" value={name} onChangeText={setName} placeholder="Blue oxford" placeholderTextColor={colors.muted} maxLength={60} style={styles.input} /></View>
        <View style={styles.field}><SectionLabel>Color · optional</SectionLabel>
          <TextInput accessibilityLabel="Piece color, optional" value={color} onChangeText={setColor} placeholder="Soft blue" placeholderTextColor={colors.muted} maxLength={40} style={styles.input} /></View>
        {!!error && <Text accessibilityRole="alert" style={[editorial.body, styles.error]}>{error}</Text>}
        <TextAction dark disabled={!slot || busy} label="Save piece →" onPress={save} />
        {!editing && <MotionPressable accessibilityRole="button" accessibilityLabel="Choose a different photo" onPress={cancelDraft} style={styles.secondaryAction}><Text style={editorial.secondary}>Choose a different photo</Text></MotionPressable>}
        {editing && <MotionPressable accessibilityRole="button" accessibilityLabel={'Remove ' + (existing?.name ?? 'this piece') + ' and delete its photo'} onPress={remove} style={styles.secondaryAction}><Text style={[editorial.secondary, { color: colors.ink }]}>Remove piece</Text></MotionPressable>}
        <Text style={[editorial.secondary, styles.privacy]}>Your photo stays on this device in this demo.</Text>
      </View>}
    </EditorialScreen>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 5, maxHeight: 380, borderRadius: 16, backgroundColor: colors.paper2, marginTop: 14 },
  question: { fontFamily: family.serif, fontSize: 26, lineHeight: 32, color: colors.ink, marginTop: 22, marginBottom: 12 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  slot: { minHeight: 48, paddingHorizontal: 18, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line2, backgroundColor: colors.card, justifyContent: 'center' },
  slotActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  slotText: { fontFamily: family.sansMedium, fontSize: 13, color: colors.ink },
  slotTextActive: { color: colors.paper },
  field: { marginBottom: 18 },
  input: { ...editorial.body, minHeight: 52, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line2 },
  error: { marginTop: 14, color: colors.ink },
  secondaryAction: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  privacy: { marginTop: 18, textAlign: 'center' },
});
