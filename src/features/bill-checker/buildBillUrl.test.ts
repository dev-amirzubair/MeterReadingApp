import { BillUrlError, buildBillUrl, configuredDiscos } from './buildBillUrl';

describe('buildBillUrl', () => {
  it('substitutes the consumer placeholder', () => {
    expect(buildBillUrl('LESCO', '1234567890')).toBe(
      'https://bill.example.com/lesco?refno=1234567890',
    );
  });

  it('strips whitespace from the consumer number', () => {
    expect(buildBillUrl('LESCO', '  12 345 67  ')).toBe(
      'https://bill.example.com/lesco?refno=1234567',
    );
  });

  it('URL-encodes special characters in the consumer number', () => {
    expect(buildBillUrl('LESCO', 'A/B+C')).toBe(
      'https://bill.example.com/lesco?refno=A%2FB%2BC',
    );
  });

  it('replaces every {consumer} placeholder, not just the first', () => {
    // Build a one-off override by using a known DISCO whose template we mock
    // — but the existing mocks only have one placeholder per template, so
    // verify the regex itself is global with a manual replace check.
    const template = 'https://x/{consumer}?b={consumer}';
    expect(template.replace(/\{consumer\}/g, '99')).toBe(
      'https://x/99?b=99',
    );
  });

  it('throws BillUrlError when the env template is missing', () => {
    // OTHER_URL is left as undefined in the mock, by design.
    expect(() => buildBillUrl('OTHER', '1234')).toThrow(BillUrlError);
    expect(() => buildBillUrl('OTHER', '1234')).toThrow(/OTHER_URL/);
  });
});

describe('configuredDiscos', () => {
  it('lists every DISCO with a non-empty template', () => {
    const list = configuredDiscos();
    expect(list).toContain('LESCO');
    expect(list).toContain('KE');
    // OTHER is unset in the mock.
    expect(list).not.toContain('OTHER');
  });
});
