import { getDb } from './connection';
import type { Reading, ReadingType } from '../types/domain';
import { uid } from '../utils/id';

interface ReadingRow {
  id: string;
  meter_id: string;
  reading_value: number;
  reading_date: string;
  reading_type: string;
  image_path: string | null;
  ocr_detected_value: number | null;
  notes: string | null;
  created_at: string;
}

const rowToReading = (r: ReadingRow): Reading => ({
  id: r.id,
  meterId: r.meter_id,
  readingValue: r.reading_value,
  readingDate: r.reading_date,
  readingType: r.reading_type as ReadingType,
  imagePath: r.image_path,
  ocrDetectedValue: r.ocr_detected_value,
  notes: r.notes,
  createdAt: r.created_at,
});

export interface NewReadingInput {
  meterId: string;
  readingValue: number;
  readingDate: string; // ISO date
  readingType: ReadingType;
  imagePath?: string | null;
  ocrDetectedValue?: number | null;
  notes?: string | null;
}

export interface UpdateReadingInput {
  readingValue?: number;
  readingDate?: string;
  readingType?: ReadingType;
  imagePath?: string | null;
  ocrDetectedValue?: number | null;
  notes?: string | null;
}

export const readingRepository = {
  async listForMeter(meterId: string): Promise<Reading[]> {
    const db = await getDb();
    const result = await db.execute(
      `SELECT * FROM readings
        WHERE meter_id = ?
        ORDER BY reading_date DESC, created_at DESC;`,
      [meterId],
    );
    return (result.rows as unknown as ReadingRow[]).map(rowToReading);
  },

  async listBillReadingsForMeter(meterId: string): Promise<Reading[]> {
    const db = await getDb();
    const result = await db.execute(
      `SELECT * FROM readings
        WHERE meter_id = ? AND reading_type = 'BILL'
        ORDER BY reading_date ASC;`,
      [meterId],
    );
    return (result.rows as unknown as ReadingRow[]).map(rowToReading);
  },

  async findLatestForMeter(
    meterId: string,
    type?: ReadingType,
  ): Promise<Reading | null> {
    const db = await getDb();
    const sql = type
      ? `SELECT * FROM readings
           WHERE meter_id = ? AND reading_type = ?
           ORDER BY reading_date DESC, created_at DESC
           LIMIT 1;`
      : `SELECT * FROM readings
           WHERE meter_id = ?
           ORDER BY reading_date DESC, created_at DESC
           LIMIT 1;`;
    const params = type ? [meterId, type] : [meterId];
    const result = await db.execute(sql, params);
    const row = result.rows[0] as unknown as ReadingRow | undefined;
    return row ? rowToReading(row) : null;
  },

  async findGlobalLatest(): Promise<Reading | null> {
    const db = await getDb();
    const result = await db.execute(
      `SELECT * FROM readings
        ORDER BY reading_date DESC, created_at DESC
        LIMIT 1;`,
    );
    const row = result.rows[0] as unknown as ReadingRow | undefined;
    return row ? rowToReading(row) : null;
  },

  async listAllBillReadings(): Promise<Reading[]> {
    const db = await getDb();
    const result = await db.execute(
      `SELECT * FROM readings
        WHERE reading_type = 'BILL'
        ORDER BY meter_id ASC, reading_date ASC;`,
    );
    return (result.rows as unknown as ReadingRow[]).map(rowToReading);
  },

  async create(input: NewReadingInput): Promise<Reading> {
    const db = await getDb();
    const reading: Reading = {
      id: uid(),
      meterId: input.meterId,
      readingValue: input.readingValue,
      readingDate: input.readingDate,
      readingType: input.readingType,
      imagePath: input.imagePath ?? null,
      ocrDetectedValue: input.ocrDetectedValue ?? null,
      notes: input.notes ?? null,
      createdAt: new Date().toISOString(),
    };
    await db.execute(
      `INSERT INTO readings (
         id, meter_id, reading_value, reading_date, reading_type,
         image_path, ocr_detected_value, notes, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        reading.id,
        reading.meterId,
        reading.readingValue,
        reading.readingDate,
        reading.readingType,
        reading.imagePath ?? null,
        reading.ocrDetectedValue ?? null,
        reading.notes ?? null,
        reading.createdAt,
      ],
    );
    return reading;
  },

  async update(id: string, input: UpdateReadingInput): Promise<void> {
    const db = await getDb();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (input.readingValue !== undefined) {
      fields.push('reading_value = ?');
      values.push(input.readingValue);
    }
    if (input.readingDate !== undefined) {
      fields.push('reading_date = ?');
      values.push(input.readingDate);
    }
    if (input.readingType !== undefined) {
      fields.push('reading_type = ?');
      values.push(input.readingType);
    }
    if (input.imagePath !== undefined) {
      fields.push('image_path = ?');
      values.push(input.imagePath ?? null);
    }
    if (input.ocrDetectedValue !== undefined) {
      fields.push('ocr_detected_value = ?');
      values.push(input.ocrDetectedValue ?? null);
    }
    if (input.notes !== undefined) {
      fields.push('notes = ?');
      values.push(input.notes ?? null);
    }
    if (fields.length === 0) {
      return;
    }
    values.push(id);
    await db.execute(
      `UPDATE readings SET ${fields.join(', ')} WHERE id = ?;`,
      values,
    );
  },

  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM readings WHERE id = ?;', [id]);
  },

  async removeForMeter(meterId: string): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM readings WHERE meter_id = ?;', [meterId]);
  },

  async listAll(): Promise<Reading[]> {
    const db = await getDb();
    const result = await db.execute(
      `SELECT * FROM readings
        ORDER BY meter_id ASC, reading_date ASC;`,
    );
    return (result.rows as unknown as ReadingRow[]).map(rowToReading);
  },

  /**
   * Bulk-inserts pre-built reading records (preserves their existing ids
   * and `meter_id` foreign keys). Intended for backup/restore.
   */
  async bulkInsert(readings: Reading[]): Promise<void> {
    if (readings.length === 0) {
      return;
    }
    const db = await getDb();
    await db.transaction(async tx => {
      for (const r of readings) {
        await tx.execute(
          `INSERT INTO readings (
             id, meter_id, reading_value, reading_date, reading_type,
             image_path, ocr_detected_value, notes, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            r.id,
            r.meterId,
            r.readingValue,
            r.readingDate,
            r.readingType,
            r.imagePath ?? null,
            r.ocrDetectedValue ?? null,
            r.notes ?? null,
            r.createdAt,
          ],
        );
      }
    });
  },
};
