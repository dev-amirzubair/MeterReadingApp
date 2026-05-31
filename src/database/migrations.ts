/**
 * Schema migrations. Append a new entry; never edit existing ones once shipped.
 * Each migration is a list of SQL statements run in order inside a transaction.
 */
export interface Migration {
  version: number;
  name: string;
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'init',
    statements: [
      `CREATE TABLE IF NOT EXISTS meters (
         id TEXT PRIMARY KEY NOT NULL,
         meter_name TEXT NOT NULL,
         consumer_number TEXT NOT NULL,
         disco TEXT NOT NULL,
         created_at TEXT NOT NULL
       );`,
      `CREATE INDEX IF NOT EXISTS idx_meters_disco ON meters(disco);`,

      `CREATE TABLE IF NOT EXISTS readings (
         id TEXT PRIMARY KEY NOT NULL,
         meter_id TEXT NOT NULL,
         reading_value REAL NOT NULL,
         reading_date TEXT NOT NULL,
         reading_type TEXT NOT NULL CHECK (reading_type IN ('BILL','CASUAL')),
         image_path TEXT,
         ocr_detected_value REAL,
         notes TEXT,
         created_at TEXT NOT NULL,
         FOREIGN KEY (meter_id) REFERENCES meters(id) ON DELETE CASCADE
       );`,
      `CREATE INDEX IF NOT EXISTS idx_readings_meter_date
         ON readings(meter_id, reading_date);`,
      `CREATE INDEX IF NOT EXISTS idx_readings_type
         ON readings(reading_type);`,
    ],
  },
];
