import { z } from 'zod';
import { DISCOS } from '../../types/domain';

const discoValues = DISCOS.map(d => d.value) as [string, ...string[]];

export const meterFormSchema = z.object({
  meterName: z
    .string()
    .min(1, 'Meter name is required')
    .max(60, 'Keep it under 60 characters'),
  consumerNumber: z
    .string()
    .min(4, 'Consumer number looks too short')
    .max(20, 'Consumer number looks too long')
    .regex(/^[\d\- ]+$/, 'Only digits, spaces or dashes'),
  disco: z.enum(discoValues, { message: 'Select a DISCO' }),
});

export type MeterFormValues = z.infer<typeof meterFormSchema>;
