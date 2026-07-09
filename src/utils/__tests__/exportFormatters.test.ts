import { csvCell, sanitizeFilename } from '../exportFormatters';

describe('csvCell', () => {
  it('returns plain values unchanged', () => {
    expect(csvCell('Smith')).toBe('Smith');
    expect(csvCell('')).toBe('');
  });

  it('quotes values containing commas', () => {
    expect(csvCell('Smith, Jr.')).toBe('"Smith, Jr."');
  });

  it('escapes embedded double quotes', () => {
    expect(csvCell('Say "hello"')).toBe('"Say ""hello"""');
  });

  it('quotes values with newlines or carriage returns', () => {
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvCell('line1\rline2')).toBe('"line1\rline2"');
  });

  it('handles combined special characters', () => {
    expect(csvCell('A, "B"\nC')).toBe('"A, ""B""\nC"');
  });
});

describe('sanitizeFilename', () => {
  it('strips unsafe characters and collapses spaces', () => {
    expect(sanitizeFilename('Emma & Liam\'s Wedding!')).toBe('Emma_Liams_Wedding');
    expect(sanitizeFilename('My   Big   Day')).toBe('My_Big_Day');
  });

  it('truncates to 40 characters', () => {
    const long = 'A'.repeat(60);
    expect(sanitizeFilename(long)).toHaveLength(40);
  });

  it('falls back when the name is empty or only symbols', () => {
    expect(sanitizeFilename('')).toBe('export');
    expect(sanitizeFilename('!!!')).toBe('export');
  });

  it('handles nullish input defensively', () => {
    expect(sanitizeFilename(null as unknown as string)).toBe('export');
  });
});
