import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {
  pick,
  keepLocalCopy,
  types,
} from '@react-native-documents/picker';
import { format } from 'date-fns';
import { meterRepository } from '../../database/meterRepository';
import { readingRepository } from '../../database/readingRepository';
import type { Meter, Reading } from '../../types/domain';
import {
  BACKUP_SCHEMA_VERSION,
  backupSchema,
  type BackupSnapshot,
} from './backupSchema';

const BACKUP_PREFIX = 'meter-tracker-pk';
const APP_LABEL = 'MeterTrackerPK';

const timestamp = () => format(new Date(), "yyyy-MM-dd'T'HHmm");

const cacheDir = () => RNFS.CachesDirectoryPath;

/**
 * Builds an in-memory snapshot of every meter + reading.
 */
export async function buildSnapshot(): Promise<BackupSnapshot> {
  const [meters, readings] = await Promise.all([
    meterRepository.listAll(),
    readingRepository.listAll(),
  ]);
  return {
    app: APP_LABEL,
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    meters,
    readings,
  };
}

/**
 * Writes a JSON backup of all data to a temporary cache file and opens the
 * platform share sheet. Resolves to `true` if the user shared/saved, or
 * `false` if they dismissed.
 */
export async function exportJsonBackup(): Promise<boolean> {
  const snapshot = await buildSnapshot();
  const json = JSON.stringify(snapshot, null, 2);
  const fileName = `${BACKUP_PREFIX}-backup-${timestamp()}.json`;
  const path = `${cacheDir()}/${fileName}`;
  await RNFS.writeFile(path, json, 'utf8');

  try {
    await Share.open({
      url: Platform.OS === 'android' ? `file://${path}` : path,
      filename: fileName,
      type: 'application/json',
      title: 'Save backup',
      failOnCancel: true,
    });
    return true;
  } catch (e) {
    // Share library throws when the user dismisses; we don't surface that
    // as an error.
    if (
      typeof e === 'object' &&
      e !== null &&
      'message' in e &&
      typeof (e as { message: unknown }).message === 'string' &&
      ((e as { message: string }).message.includes('User did not share') ||
        (e as { message: string }).message.includes('cancel'))
    ) {
      return false;
    }
    throw e;
  }
}

interface ImportResult {
  meters: number;
  readings: number;
}

/**
 * Prompts the user to pick a `.json` backup file, validates its contents,
 * wipes the local database, and bulk-inserts everything.
 */
export async function importJsonBackup(): Promise<ImportResult | null> {
  const [picked] = await pick({ type: [types.json], allowMultiSelection: false });
  if (!picked) {
    return null;
  }

  // On Android the picker can return content:// URIs which RNFS can't read
  // directly. `keepLocalCopy` stages a readable copy in the cache dir.
  const [copy] = await keepLocalCopy({
    files: [
      {
        uri: picked.uri,
        fileName: picked.name ?? `${BACKUP_PREFIX}-import.json`,
      },
    ],
    destination: 'cachesDirectory',
  });
  if (copy.status !== 'success') {
    throw new Error(
      `Failed to load backup file (${copy.status}: ${'copyError' in copy ? copy.copyError ?? '' : ''})`,
    );
  }

  const localPath = copy.localUri.replace(/^file:\/\//, '');
  const raw = await RNFS.readFile(localPath, 'utf8');
  const parsed = JSON.parse(raw);
  const snapshot = backupSchema.parse(parsed);

  if (snapshot.version > BACKUP_SCHEMA_VERSION) {
    throw new Error(
      `Backup was created with a newer version (v${snapshot.version}). Update the app and try again.`,
    );
  }

  // Reset local data, then bulk-insert. Zod has already validated the
  // strings are valid DISCOs / ReadingTypes; the casts here just give
  // TypeScript the literal-union view of those values.
  await meterRepository.clearAll();
  await meterRepository.bulkInsert(snapshot.meters as Meter[]);
  await readingRepository.bulkInsert(snapshot.readings as Reading[]);

  return {
    meters: snapshot.meters.length,
    readings: snapshot.readings.length,
  };
}

const escapeCsv = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

/**
 * Builds a CSV with one row per reading, joined to its meter, and shares it.
 */
export async function exportReadingsCsv(): Promise<boolean> {
  const [meters, readings] = await Promise.all([
    meterRepository.listAll(),
    readingRepository.listAll(),
  ]);
  const meterById = new Map(meters.map(m => [m.id, m]));

  const header = [
    'meter_name',
    'consumer_number',
    'disco',
    'reading_date',
    'reading_value',
    'reading_type',
    'ocr_detected_value',
    'notes',
    'image_path',
    'created_at',
  ];

  const lines = [header.join(',')];
  for (const r of readings) {
    const m = meterById.get(r.meterId);
    lines.push(
      [
        escapeCsv(m?.meterName),
        escapeCsv(m?.consumerNumber),
        escapeCsv(m?.disco),
        escapeCsv(r.readingDate),
        escapeCsv(r.readingValue),
        escapeCsv(r.readingType),
        escapeCsv(r.ocrDetectedValue),
        escapeCsv(r.notes),
        escapeCsv(r.imagePath),
        escapeCsv(r.createdAt),
      ].join(','),
    );
  }

  const fileName = `${BACKUP_PREFIX}-readings-${timestamp()}.csv`;
  const path = `${cacheDir()}/${fileName}`;
  await RNFS.writeFile(path, lines.join('\n'), 'utf8');

  try {
    await Share.open({
      url: Platform.OS === 'android' ? `file://${path}` : path,
      filename: fileName,
      type: 'text/csv',
      title: 'Save readings as CSV',
      failOnCancel: true,
    });
    return true;
  } catch (e) {
    if (
      typeof e === 'object' &&
      e !== null &&
      'message' in e &&
      typeof (e as { message: unknown }).message === 'string' &&
      ((e as { message: string }).message.includes('User did not share') ||
        (e as { message: string }).message.includes('cancel'))
    ) {
      return false;
    }
    throw e;
  }
}
