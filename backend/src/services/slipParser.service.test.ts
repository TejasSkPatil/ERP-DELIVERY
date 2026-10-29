import { describe, expect, it } from 'vitest';
import {
  parseSlipDetails,
  extractFixedTemplateFields,
  FixedTemplateSlipSchema,
  extractReceiptNo,
  extractPrintedDate,
  extractPrintedTime,
  normalizeReceiptNo,
} from './slipParser.service';

describe('Slip Parser Service', () => {
  describe('normalizeReceiptNo', () => {
    it('strips leading # but preserves leading zeros and alphanumeric characters', () => {
      expect(normalizeReceiptNo('#10245')).toBe('10245');
      expect(normalizeReceiptNo('#00452')).toBe('00452');
      expect(normalizeReceiptNo('  #REC-2026-01  ')).toBe('REC-2026-01');
      expect(normalizeReceiptNo('000987')).toBe('000987');
      expect(normalizeReceiptNo('SLIP/2026/99.')).toBe('SLIP/2026/99');
    });

    it('returns null for empty or invalid values', () => {
      expect(normalizeReceiptNo('')).toBeNull();
      expect(normalizeReceiptNo('#')).toBeNull();
      expect(normalizeReceiptNo('?')).toBeNull();
    });
  });

  describe('extractReceiptNo', () => {
    it('extracts receipt numbers with various standard labels', () => {
      expect(extractReceiptNo('Company Ltd\nReceipt No: 98765\nDelivered')).toBe('98765');
      expect(extractReceiptNo('Receipt #: #REC-1024\nStatus: Complete')).toBe('REC-1024');
      expect(extractReceiptNo('Docket No: 004523\nDate: 11/10/2026')).toBe('004523');
      expect(extractReceiptNo('Bill No: B-99120')).toBe('B-99120');
      expect(extractReceiptNo('Order No. ORD-7788')).toBe('ORD-7788');
    });

    it('extracts receipt numbers across newlines', () => {
      const text = 'DELIVERY SLIP\nReceipt No:\n102938\nCustomer: John Doe';
      expect(extractReceiptNo(text)).toBe('102938');
    });

    it('extracts standalone hashtag identifiers as fallback', () => {
      const text = 'Standard Delivery Slip\nOrder processed #REC-884\nThank you';
      expect(extractReceiptNo(text)).toBe('REC-884');
    });

    it('extracts standalone receipt number printed near top, such as 7 above Sales Receipt', () => {
      const text = `
        PIZZA STORE
        7
        Sales Receipt
        Date: 07/10/2026
        Time: 11:39
      `;
      expect(extractReceiptNo(text)).toBe('7');
    });

    it('extracts standalone receipt number #7 above Delivery Slip', () => {
      const text = `
        LEVEL PIZZA
        #7
        Delivery Slip
      `;
      expect(extractReceiptNo(text)).toBe('7');
    });

    it('does not confuse table number, quantity, or phone number with receipt number', () => {
      const text = `
        PIZZA HUT
        Table 4
        Qty: 2
        Phone: 9820011223
        Cashier: Alex
      `;
      expect(extractReceiptNo(text)).toBeNull();
    });

    it('returns null when no receipt number pattern exists', () => {
      const text = 'Random delivery notes without any receipt or docket tag.';
      expect(extractReceiptNo(text)).toBeNull();
    });
  });

  describe('extractPrintedDate', () => {
    it('normalizes textual month dates to ISO YYYY-MM-DD', () => {
      expect(extractPrintedDate('Date: 11 Oct 2026')).toBe('2026-10-11');
      expect(extractPrintedDate('Delivery Date: 11-October-2026')).toBe('2026-10-11');
      expect(extractPrintedDate('Printed on October 11, 2026')).toBe('2026-10-11');
      expect(extractPrintedDate('Dated: 5 Jan 2026')).toBe('2026-01-05');
    });

    it('normalizes ISO dates to YYYY-MM-DD', () => {
      expect(extractPrintedDate('Date: 2026-10-11')).toBe('2026-10-11');
      expect(extractPrintedDate('Delivered: 2026/04/15')).toBe('2026-04-15');
    });

    it('normalizes DD/MM/YYYY dates to YYYY-MM-DD', () => {
      expect(extractPrintedDate('Date: 11/10/2026')).toBe('2026-10-11');
      expect(extractPrintedDate('Date: 05-08-2026')).toBe('2026-08-05');
      expect(extractPrintedDate('Date: 07/10/2026')).toBe('2026-10-07');
    });

    it('rejects invalid calendar dates', () => {
      expect(extractPrintedDate('Date: 31/02/2026')).toBeNull();
      expect(extractPrintedDate('Date: 2026-02-30')).toBeNull();
    });

    it('returns null when no valid date is present', () => {
      expect(extractPrintedDate('No date mentioned on this slip')).toBeNull();
    });
  });

  describe('extractPrintedTime', () => {
    it('normalizes 12-hour AM/PM times to 24-hour HH:mm', () => {
      expect(extractPrintedTime('Delivered at 02:30 PM')).toBe('14:30');
      expect(extractPrintedTime('Time: 2:30PM')).toBe('14:30');
      expect(extractPrintedTime('Time: 9:15 AM')).toBe('09:15');
      expect(extractPrintedTime('Delivered: 12:00 AM')).toBe('00:00');
      expect(extractPrintedTime('Delivered: 12:45 PM')).toBe('12:45');
    });

    it('normalizes labeled 24-hour times to HH:mm', () => {
      expect(extractPrintedTime('Time: 18:45')).toBe('18:45');
      expect(extractPrintedTime('Delivery Time: 08:30:15')).toBe('08:30');
      expect(extractPrintedTime('At: 14:05')).toBe('14:05');
      expect(extractPrintedTime('Time: 11:39')).toBe('11:39');
    });

    it('does not confuse collection time or due time with receipt time', () => {
      const text = `
        Time: 11:39
        Collection Time: 12:15
        Due Time: 12:30
      `;
      expect(extractPrintedTime(text)).toBe('11:39');

      const textReversed = `
        Collection Time: 12:15
        Due Time: 12:30
        Time: 11:39
      `;
      expect(extractPrintedTime(textReversed)).toBe('11:39');
    });

    it('returns null when no valid time format is present', () => {
      expect(extractPrintedTime('Receipt #1024 Date: 2026-10-11 Total: 500')).toBeNull();
    });
  });

  describe('parseSlipDetails', () => {
    it('successfully parses complete slip with high confidence', () => {
      const ocrText = `
        LEVEL TRAVEL & LOGISTICS
        Receipt No: #REC-90812
        Delivery Date: 11 Oct 2026
        Time: 03:15 PM
        Recipient: Tech Corp
        Status: Signed
      `;

      const result = parseSlipDetails({ text: ocrText, confidence: 92 });

      expect(result.receiptNo).toBe('REC-90812');
      expect(result.printedDeliveryDate).toBe('2026-10-11');
      expect(result.printedDeliveryTime).toBe('15:15');
      expect(result.confidence).toBe(92);
      expect(result.needsReview).toBe(false);
    });

    it('parses receipt with standalone number 7 above Sales Receipt, date 07/10/2026, and time 11:39', () => {
      const ocrText = `
        PIZZA EXPRESS
        7
        Sales Receipt
        Date: 07/10/2026
        Time: 11:39
        Collection Time: 12:15
        Due Time: 12:30
        Customer: Amit Verma
        Total: 450.00
      `;

      const result = parseSlipDetails({ text: ocrText, confidence: 94 });

      expect(result.receiptNo).toBe('7');
      expect(result.printedDeliveryDate).toBe('2026-10-07');
      expect(result.printedDeliveryTime).toBe('11:39');
      expect(result.confidence).toBe(94);
      expect(result.needsReview).toBe(false);
    });

    it('uses positional OCR line blocks when available', () => {
      const ocrLines = [
        { text: 'PIZZA CORNER', confidence: 95, bbox: { x0: 10, y0: 10, x1: 200, y1: 40 } },
        { text: '7', confidence: 96, bbox: { x0: 100, y0: 50, x1: 120, y1: 80 } },
        { text: 'Sales Receipt', confidence: 95, bbox: { x0: 80, y0: 90, x1: 220, y1: 120 } },
        { text: 'Date: 07/10/2026', confidence: 94, bbox: { x0: 20, y0: 130, x1: 180, y1: 150 } },
        { text: 'Time: 11:39', confidence: 93, bbox: { x0: 20, y0: 160, x1: 140, y1: 180 } },
      ];

      const rawText = ocrLines.map((l) => l.text).join('\n');
      const result = parseSlipDetails({ text: rawText, confidence: 94, lines: ocrLines });

      expect(result.receiptNo).toBe('7');
      expect(result.printedDeliveryDate).toBe('2026-10-07');
      expect(result.printedDeliveryTime).toBe('11:39');
      expect(result.needsReview).toBe(false);
    });

    it('flags needsReview: true when receipt number is missing', () => {
      const ocrText = `
        LEVEL TRAVEL & LOGISTICS
        Date: 11 Oct 2026
        Time: 10:00 AM
      `;

      const result = parseSlipDetails({ text: ocrText, confidence: 85 });

      expect(result.receiptNo).toBeNull();
      expect(result.printedDeliveryDate).toBe('2026-10-11');
      expect(result.printedDeliveryTime).toBe('10:00');
      expect(result.needsReview).toBe(true);
    });

    it('flags needsReview: true when confidence is below threshold', () => {
      const ocrText = `
        Receipt No: 12345
        Date: 2026-10-11
        Time: 14:00
      `;

      const result = parseSlipDetails({ text: ocrText, confidence: 45 });

      expect(result.receiptNo).toBe('12345');
      expect(result.confidence).toBe(45);
      expect(result.needsReview).toBe(true);
    });

    it('flags needsReview: true when multiple receipt candidates are ambiguous', () => {
      const ocrText = `
        Receipt No: 1001
        Docket No: 9999
        Date: 2026-10-11
        Time: 14:00
      `;

      const result = parseSlipDetails({ text: ocrText, confidence: 85 });

      expect(result.needsReview).toBe(true);
    });

    it('never synthesizes missing date or time', () => {
      const ocrText = `Receipt No: 445566`;
      const result = parseSlipDetails({ text: ocrText, confidence: 80 });

      expect(result.receiptNo).toBe('445566');
      expect(result.printedDeliveryDate).toBeNull();
      expect(result.printedDeliveryTime).toBeNull();
      expect(result.rawText).toBe(ocrText);
    });

    it('handles empty OCR input safely', () => {
      const result = parseSlipDetails({ text: '', confidence: 0 });

      expect(result.receiptNo).toBeNull();
      expect(result.printedDeliveryDate).toBeNull();
      expect(result.printedDeliveryTime).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.needsReview).toBe(true);
    });
  });

  describe('Fixed Template-Specific OCR Extraction', () => {
    const referenceReceiptText = `
      62
      Sales Receipt
      Basilico
      26 Penton St, The Angel
      London, N1 9PS
      16/10/2026
      7470
      00:13
      DELIVERY
      Web Order
      Items: 1
      Item    Price
      Margherita Basilico   £ 15.70
      + Medium 12"
      + Olives
      Notes: Contact access code:
      827130901
      Subtotal   £ 15.70
      Delivery Charges   £ 3.99
      Tax   £ 3.28
      PAID by Credit   £ 19.69
      VAT #: 380937568
      Deliver to:   Due: ASAP 00:34
      A. Gilad - 442033195035   0
      Drury Lane 141, Prestige
      student living
      WC2B5TB
      London
    `;

    it('successfully extracts required fields from reference receipt (receipt 62)', () => {
      const result = extractFixedTemplateFields({ text: referenceReceiptText, confidence: 95 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        receiptNo: '62',
        receiptDate: '16/10/2026',
        receiptTime: '00:13',
        orderType: 'DELIVERY',
      });

      // Verify schema validation
      const schemaValidation = FixedTemplateSlipSchema.safeParse(result.data);
      expect(schemaValidation.success).toBe(true);
    });

    it('successfully extracts receipt number 11 above Sales Receipt', () => {
      const text = referenceReceiptText.replace('62\n', '11\n');
      const result = extractFixedTemplateFields({ text, confidence: 95 });

      expect(result.success).toBe(true);
      expect(result.data?.receiptNo).toBe('11');
      expect(result.data?.receiptDate).toBe('16/10/2026');
      expect(result.data?.receiptTime).toBe('00:13');
      expect(result.data?.orderType).toBe('DELIVERY');
    });

    it('does not select unrelated numbers (7470, access codes, phone numbers, VAT, or prices) as receiptNo', () => {
      const textWithoutTopReceiptNo = `
        Sales Receipt
        Basilico
        26 Penton St, The Angel
        16/10/2026
        7470
        00:13
        DELIVERY
        Margherita Basilico £ 15.70
        Notes: Contact access code: 827130901
        VAT #: 380937568
        Deliver to: A. Gilad - 442033195035
      `;

      const result = extractFixedTemplateFields({ text: textWithoutTopReceiptNo, confidence: 90 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not find standalone number above Sales Receipt');
      expect(result.rawCandidates?.receiptNo).not.toBe('7470');
      expect(result.rawCandidates?.receiptNo).not.toBe('827130901');
      expect(result.rawCandidates?.receiptNo).not.toBe('442033195035');
      expect(result.rawCandidates?.receiptNo).not.toBe('380937568');
    });

    it('rejects COLLECTION receipts with specific extraction error and typed code', () => {
      const collectionText = referenceReceiptText.replace('DELIVERY', 'COLLECTION');
      const result = extractFixedTemplateFields({ text: collectionText, confidence: 92 });

      expect(result.success).toBe(false);
      expect(result.code).toBe('COLLECTION_REJECTED');
      expect(result.reason).toBe('COLLECTION_REJECTED');
      expect(result.error).toContain("Order type is 'COLLECTION'");
    });

    it('rejects partial order-type matches like DELIVER with ORDER_TYPE_AMBIGUOUS', () => {
      const partialText = referenceReceiptText.replace('DELIVERY', 'DELIVER');
      const result = extractFixedTemplateFields({ text: partialText, confidence: 92 });

      expect(result.success).toBe(false);
      expect(result.code).toBe('ORDER_TYPE_AMBIGUOUS');
      expect(result.error).toContain("Partial match 'DELIVER' detected");
    });

    it('rejects WEB ORDER alone as not proof of delivery with WEB_ORDER_INSUFFICIENT', () => {
      // Remove DELIVERY completely and only keep Web Order
      const webOrderOnlyText = referenceReceiptText.replace('DELIVERY\n', '');
      const result = extractFixedTemplateFields({ text: webOrderOnlyText, confidence: 92 });

      expect(result.success).toBe(false);
      expect(result.code).toBe('WEB_ORDER_INSUFFICIENT');
      expect(result.error).toContain("Found 'WEB ORDER', which alone is not proof of delivery");
    });

    it('rejects unreadable receipt number with RECEIPT_NUMBER_UNREADABLE', () => {
      const noReceiptNoText = referenceReceiptText.replace('62\n', '');
      const result = extractFixedTemplateFields({ text: noReceiptNoText, confidence: 90 });

      expect(result.success).toBe(false);
      expect(result.code).toBe('RECEIPT_NUMBER_UNREADABLE');
      expect(result.error).toContain('Receipt number is unreadable');
    });

    it('does not allow dates elsewhere on the receipt to override an unreadable date region', () => {
      // Remove 16/10/2026 from header, but include another date in the notes/address at the bottom
      const dateElsewhereText = referenceReceiptText
        .replace('16/10/2026', 'XXXX-XX-XX')
        .concat('\nDelivered to customer on 25/12/2026');

      const result = extractFixedTemplateFields({ text: dateElsewhereText, confidence: 90 });
      expect(result.success).toBe(false);
      expect(result.code).toBe('DATE_UNREADABLE');
      expect(result.data).toBeNull();
      // Verifies 25/12/2026 from lower notes did not substitute for the unreadable target region
      expect(result.rawCandidates?.receiptDate).toBeNull();
    });

    it('does not allow due time 00:34 elsewhere on the receipt to override an unreadable time region', () => {
      // Remove 00:13 from header, keeping Due: ASAP 00:34 lower down
      const timeElsewhereText = referenceReceiptText.replace('00:13', 'XX:XX');

      const result = extractFixedTemplateFields({ text: timeElsewhereText, confidence: 90 });
      expect(result.success).toBe(false);
      expect(result.code).toBe('TIME_UNREADABLE');
      expect(result.data).toBeNull();
      // Verifies due time 00:34 did not substitute for unreadable target time
      expect(result.rawCandidates?.receiptTime).toBeNull();
    });

    it('rejects invalid calendar dates (e.g. 31/02/2026) with INVALID_CALENDAR_DATE', () => {
      const invalidDateText = referenceReceiptText.replace('16/10/2026', '31/02/2026');
      const result = extractFixedTemplateFields({ text: invalidDateText, confidence: 92 });

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_CALENDAR_DATE');
      expect(result.error).toContain('does not exist in the calendar');
    });

    it('rejects US date formats where month exceeds 12 (e.g. 10/16/2026)', () => {
      // In DD/MM/YYYY, 10/16/2026 represents Month 16 which is invalid
      const usDateText = referenceReceiptText.replace('16/10/2026', '10/16/2026');
      const result = extractFixedTemplateFields({ text: usDateText, confidence: 92 });

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_CALENDAR_DATE');
      expect(result.error).toContain('does not exist in the calendar');
    });

    it('preserves 00:13 and does not substitute due time 00:34', () => {
      const result = extractFixedTemplateFields({ text: referenceReceiptText, confidence: 95 });

      expect(result.success).toBe(true);
      expect(result.code).toBe('VALID');
      expect(result.data?.receiptTime).toBe('00:13');
      expect(result.data?.receiptTime).not.toBe('00:34');
    });

    it('integrates cleanly with parseSlipDetails for the reference receipt', () => {
      const result = parseSlipDetails({ text: referenceReceiptText, confidence: 95 });

      expect(result.receiptNo).toBe('62');
      expect(result.receiptDate).toBe('16/10/2026');
      expect(result.receiptTime).toBe('00:13');
      expect(result.orderType).toBe('DELIVERY');
      expect(result.printedDeliveryDate).toBe('2026-10-16');
      expect(result.printedDeliveryTime).toBe('00:13');
      expect(result.needsReview).toBe(false);
      expect(result.validationReason).toBe('VALID');
      expect(result.templateResult).toEqual({
        receiptNo: '62',
        receiptDate: '16/10/2026',
        receiptTime: '00:13',
        orderType: 'DELIVERY',
      });
    });
  });
});

