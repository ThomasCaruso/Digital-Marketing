import { Directory, File, Paths } from 'expo-file-system';
import { useFormStore } from '../state/store';
import type { UserGarment } from '../domain/types';

/**
 * Local garment photo storage — the single seam between the app and wherever
 * uploaded garment bytes live. This build keeps photos in app-owned document
 * storage on the device: picked or captured images are COPIED out of the
 * picker's temporary cache into a durable folder, so URIs stay valid across
 * launches. Only the URI and metadata ever reach AsyncStorage — never base64
 * blobs, never a network. Replacing this with Supabase Storage later means
 * reimplementing this file (upload + a remote/local URI strategy) and leaving
 * every caller untouched.
 */

const GARMENTS_DIR = 'garments';

function garmentsDirectory(): Directory {
  const dir = new Directory(Paths.document, GARMENTS_DIR);
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

function extensionFor(uri: string, mimeType?: string | null, fileName?: string | null): string {
  const fromName = fileName && fileName.includes('.') ? '.' + fileName.split('.').pop()!.toLowerCase() : '';
  if (/^\.(jpe?g|png|webp|heic|gif)$/.test(fromName)) return fromName === '.jpeg' ? '.jpg' : fromName;
  const fromUri = uri.includes('.') ? '.' + uri.split('?')[0]!.split('.').pop()!.toLowerCase() : '';
  if (/^\.(jpe?g|png|webp|heic|gif)$/.test(fromUri)) return fromUri === '.jpeg' ? '.jpg' : fromUri;
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '.jpg';
}

export interface ImportedGarmentPhoto {
  /** Durable file URI inside app document storage. */
  localUri: string;
}

/**
 * Copy a picker result (cache file or content:// URI) into durable,
 * app-owned storage. The caller owns the picker asset afterwards; the
 * returned URI is what gets persisted on the garment metadata.
 */
export async function importGarmentPhoto(tempUri: string, mimeType?: string | null, fileName?: string | null): Promise<ImportedGarmentPhoto> {
  const dir = garmentsDirectory();
  const destination = new File(dir, Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + extensionFor(tempUri, mimeType, fileName));
  await new File(tempUri).copy(destination, { overwrite: true });
  return { localUri: destination.uri };
}

/** Delete one copied photo. Tolerant: a missing file is already the goal. */
export async function deleteGarmentPhoto(localUri: string): Promise<void> {
  try {
    const file = new File(localUri);
    if (file.exists) await file.delete();
  } catch (error) {
    console.warn('FORM: could not delete garment photo', error);
  }
}

/**
 * Full removal used by every "remove piece" control: drop the persisted
 * metadata through the store AND delete the copied file, so no orphan bytes
 * stay behind on the device.
 */
export async function removeGarmentWithFile(garment: UserGarment): Promise<void> {
  useFormStore.getState().removeUserGarment(garment.id);
  await deleteGarmentPhoto(garment.localUri);
}
