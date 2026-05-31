import { z } from 'zod';

export const readingFormSchema = z.object({
  readingValue: z
    .string()
    .min(1, 'Reading is required')
    .refine(v => /^\d+(\.\d+)?$/.test(v.trim()), 'Use a positive number')
    .refine(v => Number(v) > 0, 'Must be greater than 0'),
  readingDate: z
    .string()
    .min(1, 'Pick a date')
    .refine(v => !Number.isNaN(Date.parse(v)), 'Invalid date'),
  readingType: z.enum(['BILL', 'CASUAL']),
  notes: z.string().max(500, 'Keep it under 500 characters').optional(),
});

export type ReadingFormValues = z.infer<typeof readingFormSchema>;
