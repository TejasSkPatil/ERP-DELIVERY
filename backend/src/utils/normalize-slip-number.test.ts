import { describe, expect, it } from 'vitest';
import {
  normalizeSlipNumber,
  normalizeReceiptNo,
  areSlipNumbersEqual,
} from './normalize-slip-number';

describe('normalize-slip-number utility', () => {
  describe('normalizeSlipNumber', () => {
    it('trims leading and trailing whitespace', () => {
      expect(normalizeSlipNumber('  REC-1001  ')).toBe('REC-1001');
      expect(normalizeSlipNumber('\t98765\n')).toBe('98765');
    });

    it('consistently removes an optional leading # or multiple leading #', () => {
      expect(normalizeSlipNumber('#REC-1001')).toBe('REC-1001');
      expect(normalizeSlipNumber('##98765')).toBe('98765');
      expect(normalizeSlipNumber('  #004520  ')).toBe('004520');
      expect(normalizeSlipNumber('# REC-2026-01')).toBe('REC-2026-01');
    });

    it('applies uppercase case-normalization policy', () => {
      expect(normalizeSlipNumber('rec-1001')).toBe('REC-1001');
      expect(normalizeSlipNumber('slip_2026_abc')).toBe('SLIP_2026_ABC');
      expect(normalizeSlipNumber('dkt/99/xyz')).toBe('DKT/99/XYZ');
    });

    it('strictly preserves leading zeros and meaningful internal characters', () => {
      expect(normalizeSlipNumber('000123')).toBe('000123');
      expect(normalizeSlipNumber('00452')).toBe('00452');
      expect(normalizeSlipNumber('REC-01/B')).toBe('REC-01/B');
      expect(normalizeSlipNumber('INV_9901')).toBe('INV_9901');
      expect(normalizeSlipNumber('DOC.1234')).toBe('DOC.1234');
    });

    it('strips trailing OCR artifact punctuation', () => {
      expect(normalizeSlipNumber('REC-1001.')).toBe('REC-1001');
      expect(normalizeSlipNumber('REC-1001,')).toBe('REC-1001');
      expect(normalizeSlipNumber('REC-1001:')).toBe('REC-1001');
      expect(normalizeSlipNumber('REC-1001;')).toBe('REC-1001');
    });

    it('rejects empty, null, undefined, or whitespace-only inputs', () => {
      expect(normalizeSlipNumber(null)).toBeNull();
      expect(normalizeSlipNumber(undefined)).toBeNull();
      expect(normalizeSlipNumber('')).toBeNull();
      expect(normalizeSlipNumber('   ')).toBeNull();
    });

    it('rejects strings containing only symbols or invalid syntax', () => {
      expect(normalizeSlipNumber('#')).toBeNull();
      expect(normalizeSlipNumber('###')).toBeNull();
      expect(normalizeSlipNumber('???')).toBeNull();
      expect(normalizeSlipNumber('!')).toBeNull();
      expect(normalizeSlipNumber('$')).toBeNull();
    });

    it('supports single-character receipt identifiers such as 7', () => {
      expect(normalizeSlipNumber('7')).toBe('7');
      expect(normalizeSlipNumber('#7')).toBe('7');
      expect(normalizeSlipNumber('A')).toBe('A');
    });

    it('works identically via normalizeReceiptNo alias', () => {
      expect(normalizeReceiptNo('#rec-1001')).toBe('REC-1001');
      expect(normalizeReceiptNo('00452')).toBe('00452');
    });
  });

  describe('areSlipNumbersEqual', () => {
    it('returns true when submitted and OCR receipt numbers match canonical representation', () => {
      expect(areSlipNumbersEqual('  #rec-1001  ', 'REC-1001')).toBe(true);
      expect(areSlipNumbersEqual('REC-1001.', '#REC-1001')).toBe(true);
      expect(areSlipNumbersEqual('004520', '#004520')).toBe(true);
      expect(areSlipNumbersEqual('dkt-99', 'DKT-99')).toBe(true);
    });

    it('returns false when two receipt numbers are legitimately distinct', () => {
      // Leading zero distinction must not be collapsed
      expect(areSlipNumbersEqual('452', '00452')).toBe(false);

      // Distinct punctuation must not be assumed equivalent
      expect(areSlipNumbersEqual('REC-100', 'REC100')).toBe(false);
      expect(areSlipNumbersEqual('REC_100', 'REC-100')).toBe(false);
      expect(areSlipNumbersEqual('REC/100', 'REC-100')).toBe(false);

      // Different numbers
      expect(areSlipNumbersEqual('REC-1001', 'REC-1002')).toBe(false);
    });

    it('returns false when either input is null, undefined, or invalid', () => {
      expect(areSlipNumbersEqual(null, 'REC-1001')).toBe(false);
      expect(areSlipNumbersEqual('REC-1001', undefined)).toBe(false);
      expect(areSlipNumbersEqual('', 'REC-1001')).toBe(false);
      expect(areSlipNumbersEqual('???', 'REC-1001')).toBe(false);
    });
  });
});
