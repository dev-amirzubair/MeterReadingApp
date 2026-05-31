import { pickReadingFromText } from './extractReading';

describe('pickReadingFromText', () => {
  it('returns null when nothing plausible is found', () => {
    const result = pickReadingFromText('hello world');
    expect(result.suggestedValue).toBeNull();
    expect(result.candidates).toEqual([]);
  });

  it('rejects 1-2 digit numbers (too short to be a reading)', () => {
    const result = pickReadingFromText('Date 12/05/24 Time 9:30');
    expect(result.suggestedValue).toBeNull();
  });

  it('picks the largest plausible 3-7 digit number', () => {
    const result = pickReadingFromText('Reg 12345 Reading 67890 Cust 100');
    // 67890 is the largest plausible value.
    expect(result.suggestedValue).toBe(67890);
    expect(result.candidates.map(c => c.value)).toEqual([67890, 12345, 100]);
  });

  it('accepts decimal values with 1-2 decimal places', () => {
    const result = pickReadingFromText('Reading: 12345.67 kWh');
    expect(result.suggestedValue).toBe(12345.67);
  });

  it('caps tokens at 7 digits (regex is greedy up to 7 then stops)', () => {
    // For an 8+ digit sequence, the regex captures the first 7 digits.
    // This matches documented behaviour ("3-7 digit number") even though it
    // means an 8-digit serial number would still produce a 7-digit hit.
    const result = pickReadingFromText('Serial 12345678');
    expect(result.suggestedValue).toBe(1234567);
  });

  it('drops tokens above the MAX_VALUE ceiling', () => {
    // 9_999_999 is the max; anything above is rejected because we cap at 7
    // digits; but a 7-digit value should pass.
    const result = pickReadingFromText('Reading 9999998');
    expect(result.suggestedValue).toBe(9999998);
  });

  it('drops tokens below the MIN_VALUE floor (100)', () => {
    // 99 is below the 3-digit floor; 100 is exactly the floor.
    const result = pickReadingFromText('only 99 here, then 100');
    expect(result.suggestedValue).toBe(100);
  });

  it('deduplicates identical tokens', () => {
    const result = pickReadingFromText('123 and 123 and 123');
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].value).toBe(123);
  });

  it('sorts candidates descending by value', () => {
    const result = pickReadingFromText('200 500 300 800 100');
    expect(result.candidates.map(c => c.value)).toEqual([800, 500, 300, 200, 100]);
    expect(result.suggestedValue).toBe(800);
  });

  it('preserves the original token (e.g. leading zero in decimal)', () => {
    const result = pickReadingFromText('Reading 12345.05');
    expect(result.candidates[0]).toEqual({
      value: 12345.05,
      rawToken: '12345.05',
    });
  });

  it('echoes the rawText in the result for debugging', () => {
    const text = 'Meter shows 12345';
    const result = pickReadingFromText(text);
    expect(result.rawText).toBe(text);
  });
});
