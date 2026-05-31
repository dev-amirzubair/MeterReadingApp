import { z } from 'zod';
import { DISCOS } from '../../types/domain';

const discoValues = DISCOS.map(d => d.value) as [string, ...string[]];

export const billCheckerSchema = z.object({
  disco: z.enum(discoValues, { message: 'Pick a DISCO' }),
  consumerNumber: z
    .string()
    .min(4, 'Consumer number looks too short')
    .max(20, 'Consumer number looks too long')
    .regex(/^[\d\- ]+$/, 'Only digits, spaces or dashes'),
});

export type BillCheckerFormValues = z.infer<typeof billCheckerSchema>;
