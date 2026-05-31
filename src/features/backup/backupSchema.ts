import { z } from 'zod';
import { DISCOS } from '../../types/domain';

const discoValues = DISCOS.map(d => d.value) as [string, ...string[]];

/**
 * The on-disk JSON format for a Meter Tracker PK backup.
 * Bump `version` when introducing breaking changes; old files will then
 * fail validation with a clear error.
 */
export const BACKUP_SCHEMA_VERSION = 1;

const meterSchema = z.object({
  id: z.string().min(1),
  meterName: z.string().min(1),
  consumerNumber: z.string().min(1),
  disco: z.enum(discoValues),
  createdAt: z.string().min(1),
});

const readingSchema = z.object({
  id: z.string().min(1),
  meterId: z.string().min(1),
  readingValue: z.number(),
  readingDate: z.string().min(1),
  readingType: z.enum(['BILL', 'CASUAL']),
  imagePath: z.string().nullable().optional(),
  ocrDetectedValue: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string().min(1),
});

export const backupSchema = z.object({
  app: z.literal('MeterTrackerPK'),
  version: z.number(),
  exportedAt: z.string(),
  meters: z.array(meterSchema),
  readings: z.array(readingSchema),
});

export type BackupSnapshot = z.infer<typeof backupSchema>;
