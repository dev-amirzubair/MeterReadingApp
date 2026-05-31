import { getDb } from './connection';
import type { Meter, Disco } from '../types/domain';
import { uid } from '../utils/id';

interface MeterRow {
  id: string;
  meter_name: string;
  consumer_number: string;
  disco: string;
  created_at: string;
}

const rowToMeter = (r: MeterRow): Meter => ({
  id: r.id,
  meterName: r.meter_name,
  consumerNumber: r.consumer_number,
  disco: r.disco as Disco,
  createdAt: r.created_at,
});

export interface NewMeterInput {
  meterName: string;
  consumerNumber: string;
  disco: Disco;
}

export interface UpdateMeterInput {
  meterName?: string;
  consumerNumber?: string;
  disco?: Disco;
}

export const meterRepository = {
  async listAll(): Promise<Meter[]> {
    const db = await getDb();
    const result = await db.execute(
      'SELECT * FROM meters ORDER BY created_at DESC;',
    );
    return (result.rows as unknown as MeterRow[]).map(rowToMeter);
  },

  async findById(id: string): Promise<Meter | null> {
    const db = await getDb();
    const result = await db.execute(
      'SELECT * FROM meters WHERE id = ? LIMIT 1;',
      [id],
    );
    const row = result.rows[0] as unknown as MeterRow | undefined;
    return row ? rowToMeter(row) : null;
  },

  async search(query: string): Promise<Meter[]> {
    const db = await getDb();
    const q = `%${query.trim()}%`;
    const result = await db.execute(
      `SELECT * FROM meters
       WHERE meter_name LIKE ?
          OR consumer_number LIKE ?
          OR disco LIKE ?
       ORDER BY created_at DESC;`,
      [q, q, q],
    );
    return (result.rows as unknown as MeterRow[]).map(rowToMeter);
  },

  async create(input: NewMeterInput): Promise<Meter> {
    const db = await getDb();
    const meter: Meter = {
      id: uid(),
      meterName: input.meterName.trim(),
      consumerNumber: input.consumerNumber.trim(),
      disco: input.disco,
      createdAt: new Date().toISOString(),
    };
    await db.execute(
      `INSERT INTO meters (id, meter_name, consumer_number, disco, created_at)
       VALUES (?, ?, ?, ?, ?);`,
      [
        meter.id,
        meter.meterName,
        meter.consumerNumber,
        meter.disco,
        meter.createdAt,
      ],
    );
    return meter;
  },

  async update(id: string, input: UpdateMeterInput): Promise<Meter | null> {
    const db = await getDb();
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }
    const next: Meter = {
      ...existing,
      meterName: input.meterName?.trim() ?? existing.meterName,
      consumerNumber: input.consumerNumber?.trim() ?? existing.consumerNumber,
      disco: input.disco ?? existing.disco,
    };
    await db.execute(
      `UPDATE meters
         SET meter_name = ?, consumer_number = ?, disco = ?
       WHERE id = ?;`,
      [next.meterName, next.consumerNumber, next.disco, id],
    );
    return next;
  },

  async remove(id: string): Promise<void> {
    const db = await getDb();
    // FK ON DELETE CASCADE will remove the meter's readings too.
    await db.execute('DELETE FROM meters WHERE id = ?;', [id]);
  },

  async count(): Promise<number> {
    const db = await getDb();
    const result = await db.execute('SELECT COUNT(*) AS n FROM meters;');
    return (result.rows[0]?.n as number) ?? 0;
  },

  async clearAll(): Promise<void> {
    const db = await getDb();
    // FK CASCADE will also drop readings; we run both for explicitness.
    await db.execute('DELETE FROM readings;');
    await db.execute('DELETE FROM meters;');
  },

  /**
   * Bulk-inserts pre-built meter records (preserves their existing ids).
   * Intended for backup/restore — caller must have called `clearAll()`
   * first if doing a full restore.
   */
  async bulkInsert(meters: Meter[]): Promise<void> {
    if (meters.length === 0) {
      return;
    }
    const db = await getDb();
    await db.transaction(async tx => {
      for (const m of meters) {
        await tx.execute(
          `INSERT INTO meters (id, meter_name, consumer_number, disco, created_at)
           VALUES (?, ?, ?, ?, ?);`,
          [m.id, m.meterName, m.consumerNumber, m.disco, m.createdAt],
        );
      }
    });
  },
};
