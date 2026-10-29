/**
 * slipParser.service.ts
 *
 * Dedicated service to extract structured delivery slip fields from raw OCR text.
 * Keeps OCR extraction separate from business parsing rules so both can be tested independently.
 *
 * Documented Assumptions:
 * 1. Receipt identifiers may follow labels ("Receipt No", "Docket No", "Bill No", "Order No")
 *    OR appear as standalone numbers near the top of the slip (e.g. "7" directly above "Sales Receipt").
 * 2. Positional and layout cues from Tesseract line information are utilized to distinguish
 *    receipt numbers from quantities, table numbers, phone numbers, and dates.
 * 3. Dates formatted as DD/MM/YYYY (such as 07/10/2026) are standard in the Asia/Kolkata context
 *    and normalize to ISO YYYY-MM-DD (2026-10-07).
 * 4. Receipt creation time is distinguished from operational collection time, due time, or upload time.
 * 5. If receipt number candidates are ambiguous, manual review is flagged (needsReview: true)
 *    rather than silently accepting an unreliable guess.
 * 6. Under no circumstance are missing fields synthesized or defaulted to current server timestamps.
 */

import { z } from 'zod';
import { normalizeSlipNumber, normalizeReceiptNo } from '../utils/normalize-slip-number';
import { OCRLine } from './ocr.service';

export { normalizeSlipNumber, normalizeReceiptNo };

export interface FixedTemplateSlipDetails {
  receiptNo: string;
  receiptDate: string; // DD/MM/YYYY e.g. "16/10/2026"
  receiptTime: string; // 24-hour HH:mm e.g. "00:13"
  orderType: 'DELIVERY';
}

export const FixedTemplateSlipSchema = z.object({
  receiptNo: z.string().regex(/^\d+$/, 'Receipt number must be a sequence of digits'),
  receiptDate: z
    .string()
    .regex(/^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(20\d{2})$/, 'Date must be in DD/MM/YYYY format'),
  receiptTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be a valid 24-hour HH:mm string'),
  orderType: z.literal('DELIVERY'),
});

export type TemplateValidationReason =
  | 'VALID'
  | 'RECEIPT_NUMBER_UNREADABLE'
  | 'DATE_UNREADABLE'
  | 'TIME_UNREADABLE'
  | 'NOT_DELIVERY'
  | 'COLLECTION_REJECTED'
  | 'WEB_ORDER_INSUFFICIENT'
  | 'ORDER_TYPE_AMBIGUOUS'
  | 'INVALID_CALENDAR_DATE'
  | 'SCHEMA_VALIDATION_FAILED';

export interface TemplateExtractionResult {
  success: boolean;
  code: TemplateValidationReason;
  reason: TemplateValidationReason;
  data: FixedTemplateSlipDetails | null;
  error?: string | null;
  rawCandidates?: {
    receiptNo?: string | null;
    receiptDate?: string | null;
    receiptTime?: string | null;
    orderType?: string | null;
  };
}

export interface ReceiptCandidate {
  value: string;
  source: 'label' | 'hashtag' | 'positional_top';
  confidence: number;
  lineIndex?: number;
  reason?: string;
}

export interface ExtractedSlipDetails {
  receiptNo: string | null;
  receiptDate?: string | null;
  receiptTime?: string | null;
  orderType?: string | null;
  printedDeliveryDate: string | null;
  printedDeliveryTime: string | null;
  rawText: string;
  confidence: number;
  needsReview: boolean;
  candidates?: ReceiptCandidate[];
  error?: string | null;
  templateResult?: FixedTemplateSlipDetails | null;
  validationReason?: TemplateValidationReason;
}

export interface ParseOptions {
  /**
   * Minimum OCR confidence score (0-100) required to avoid flagging needsReview.
   * Defaults to 60.
   */
  minConfidenceThreshold?: number;
}

export const DEFAULT_CONFIDENCE_THRESHOLD = 60;

const MONTH_NAMES: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

/**
 * Validates whether a calendar date is real (e.g. rejecting 2026-02-31).
 */
function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 2000 || year > 2099) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const dateObj = new Date(Date.UTC(year, month - 1, day));
  return (
    dateObj.getUTCFullYear() === year &&
    dateObj.getUTCMonth() === month - 1 &&
    dateObj.getUTCDate() === day
  );
}

/**
 * Searches for all receipt number candidates in text and positional line blocks.
 */
export function findReceiptCandidates(
  text: string,
  linesInput?: OCRLine[]
): ReceiptCandidate[] {
  const candidates: ReceiptCandidate[] = [];
  if (!text) return candidates;

  const lines = linesInput && linesInput.length > 0
    ? linesInput.map((l) => l.text.trim())
    : text.split(/\r?\n/).map((l) => l.trim());

  // 1. Explicit labeled patterns (Score: 100)
  // Matches: "Receipt No: 98765", "Receipt #: #REC-1024", "Docket No: 004523", "Bill No: B-99120", "Order No. ORD-7788"
  const labelRegex =
    /(?:receipt\s*(?:no\.?|num(?:ber)?\.?|#)|rcpt\s*(?:no\.?|#)|docket\s*(?:no\.?|#)|bill\s*(?:no\.?|#)|order\s*(?:no\.?|#)|slip\s*(?:no\.?|#)|ticket\s*(?:no\.?|#)|token\s*(?:no\.?|#)?|inv(?:oice)?\s*(?:no\.?|#))\s*[:\-#]?\s*([#A-Za-z0-9][A-Za-z0-9\-_/]{0,30})/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(labelRegex);
    if (match && match[1]) {
      const normalized = normalizeReceiptNo(match[1]);
      if (normalized) {
        candidates.push({
          value: normalized,
          source: 'label',
          confidence: 100,
          lineIndex: i,
          reason: `Matched label pattern on line ${i + 1}: "${line}"`,
        });
      }
    }
  }

  // Multiline label pattern where the label is on line i and the value on line i + 1
  const multilineLabelOnlyRegex =
    /^(?:receipt\s*(?:no\.?|num(?:ber)?\.?|#)|rcpt\s*(?:no\.?|#)|docket\s*(?:no\.?|#)|bill\s*(?:no\.?|#)|order\s*(?:no\.?|#)|slip\s*(?:no\.?|#)|ticket\s*(?:no\.?|#)|token\s*(?:no\.?|#)?|inv(?:oice)?\s*(?:no\.?|#))\s*[:\-#]?$/i;

  for (let i = 0; i < lines.length - 1; i++) {
    if (multilineLabelOnlyRegex.test(lines[i]) && lines[i + 1]) {
      const nextLineVal = lines[i + 1].trim();
      const normalized = normalizeReceiptNo(nextLineVal);
      if (normalized) {
        candidates.push({
          value: normalized,
          source: 'label',
          confidence: 98,
          lineIndex: i + 1,
          reason: `Matched multiline label on lines ${i + 1}-${i + 2}: "${lines[i]}" -> "${nextLineVal}"`,
        });
      }
    }
  }

  // 2. Standalone hashtag identifier (Score: 85)
  // Example: "#REC-884", "#10293", "#7"
  const hashtagRegex = /(?:^|\s)#([A-Za-z0-9][A-Za-z0-9\-_]{0,20})(?:\s|$)/m;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(hashtagRegex);
    if (match && match[1]) {
      const normalized = normalizeReceiptNo(match[1]);
      if (normalized) {
        candidates.push({
          value: normalized,
          source: 'hashtag',
          confidence: 85,
          lineIndex: i,
          reason: `Matched hashtag on line ${i + 1}: "${lines[i]}"`,
        });
      }
    }
  }

  // 3. Positional Standalone Number Near Top of Slip (Score: 92 if adjacent to receipt descriptor, 75 if top header)
  // Supports receipts where the receipt number is printed standalone near the top, such as "7" above "Sales Receipt"
  const receiptDescriptorRegex =
    /^(?:sales\s*receipt|receipt|delivery\s*(?:slip|receipt|proof)|order\s*(?:slip|receipt|summary)|tax\s*invoice|invoice|cash\s*memo|guest\s*check|check|bill|ticket|token|docket)$/i;

  const negativeLineRegex =
    /(?:date|time|tel|phone|ph\b|mobile|table|tbl|seat|qty|server|cashier|pax|page|pin|zip|gst|vat|total|subtotal|tax\b|discount|change|balance|card|due\s*time|collection\s*time)/i;

  const maxTopLines = Math.min(lines.length, 6);

  for (let i = 0; i < maxTopLines; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;

    // Filter out lines containing negative keywords like "Table 4" or "Date:" or "Qty: 1"
    if (negativeLineRegex.test(rawLine)) continue;

    // Must be a standalone number or clean alphanumeric identifier
    // E.g. "7", "#7", "42", "104", "007", "REC-7"
    const standaloneMatch = rawLine.match(/^#?\s*([0-9]{1,10}|[A-Za-z0-9\-_]{2,15})\s*\.?$/);
    if (!standaloneMatch) continue;

    const rawVal = standaloneMatch[1];

    // Exclude 4-digit calendar years (2020-2030)
    if (/^20[2-3]\d$/.test(rawVal)) continue;

    const normalized = normalizeReceiptNo(rawVal);
    if (!normalized) continue;

    // Check if adjacent line (next line or previous line) matches a receipt descriptor
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
    const prevLine = i > 0 ? lines[i - 1].trim() : '';

    const isNextDescriptor = receiptDescriptorRegex.test(nextLine);
    const isPrevDescriptor = receiptDescriptorRegex.test(prevLine);

    if (isNextDescriptor || isPrevDescriptor) {
      candidates.push({
        value: normalized,
        source: 'positional_top',
        confidence: 94,
        lineIndex: i,
        reason: `Standalone number on line ${i + 1} ("${rawLine}") directly adjacent to descriptor "${isNextDescriptor ? nextLine : prevLine}"`,
      });
    } else if (i <= 2 && /^\d{1,8}$/.test(rawVal)) {
      // Standalone number in top 3 lines (below store title)
      candidates.push({
        value: normalized,
        source: 'positional_top',
        confidence: 76,
        lineIndex: i,
        reason: `Standalone number on line ${i + 1} ("${rawLine}") near receipt top`,
      });
    }
  }

  // Deduplicate candidates by normalized value, retaining highest confidence
  const candidateMap = new Map<string, ReceiptCandidate>();
  for (const c of candidates) {
    const existing = candidateMap.get(c.value);
    if (!existing || c.confidence > existing.confidence) {
      candidateMap.set(c.value, c);
    }
  }

  return Array.from(candidateMap.values()).sort((a, b) => b.confidence - a.confidence);
}

/**
 * Resolves the primary receipt number and checks for ambiguity between multiple candidates.
 */
export function resolveReceiptNumber(
  text: string,
  options?: { lines?: OCRLine[] }
): { receiptNo: string | null; candidates: ReceiptCandidate[]; isAmbiguous: boolean } {
  if (!text) {
    return { receiptNo: null, candidates: [], isAmbiguous: false };
  }

  const candidates = findReceiptCandidates(text, options?.lines);
  if (candidates.length === 0) {
    return { receiptNo: null, candidates: [], isAmbiguous: false };
  }

  const topCandidate = candidates[0];

  // Ambiguity check: If there are multiple distinct candidates with equal top confidence
  const competingTopCandidates = candidates.filter(
    (c) => c.confidence === topCandidate.confidence && c.value !== topCandidate.value
  );

  if (competingTopCandidates.length > 0) {
    return {
      receiptNo: null,
      candidates,
      isAmbiguous: true,
    };
  }

  // Ambiguity check: If candidates have close confidence below high-certainty threshold
  if (candidates.length > 1) {
    const secondCandidate = candidates[1];
    if (
      topCandidate.confidence < 90 &&
      secondCandidate.confidence >= 70 &&
      topCandidate.value !== secondCandidate.value &&
      Math.abs(topCandidate.confidence - secondCandidate.confidence) < 10
    ) {
      return {
        receiptNo: null,
        candidates,
        isAmbiguous: true,
      };
    }
  }

  return {
    receiptNo: topCandidate.value,
    candidates,
    isAmbiguous: false,
  };
}

/**
 * Extracts candidate receipt numbers from raw OCR text.
 * Returns string | null for backward compatibility.
 */
export function extractReceiptNo(text: string, options?: { lines?: OCRLine[] }): string | null {
  const result = resolveReceiptNumber(text, options);
  return result.receiptNo;
}

/**
 * Helper to parse a date string into ISO YYYY-MM-DD.
 */
function parseDateString(str: string): string | null {
  if (!str) return null;

  // 1. Textual Month Format (e.g. "11 Oct 2026", "11-Oct-2026", "October 11, 2026", "5 Jan 2026")
  const textualDateRegex =
    /\b(\d{1,2})[\s\-\/]([A-Za-z]{3,9})[\s\-\/](\d{4})\b|\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/i;

  const textMatch = str.match(textualDateRegex);
  if (textMatch) {
    let dayStr: string;
    let monthStr: string;
    let yearStr: string;

    if (textMatch[1] && textMatch[2] && textMatch[3]) {
      dayStr = textMatch[1];
      monthStr = textMatch[2].toLowerCase();
      yearStr = textMatch[3];
    } else {
      monthStr = textMatch[4].toLowerCase();
      dayStr = textMatch[5];
      yearStr = textMatch[6];
    }

    const monthNum = MONTH_NAMES[monthStr];
    if (monthNum) {
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthNum, 10);
      const day = parseInt(dayStr, 10);

      if (isValidCalendarDate(year, month, day)) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  // 2. ISO Format: YYYY-MM-DD or YYYY/MM/DD
  const isoRegex = /\b(20\d{2})[\-\/](0?[1-9]|1[0-2])[\-\/](0?[1-9]|[12]\d|3[01])\b/;
  const isoMatch = str.match(isoRegex);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);

    if (isValidCalendarDate(year, month, day)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 3. Indian / Standard Logistics Format: DD/MM/YYYY or DD-MM-YYYY (e.g. "07/10/2026")
  const dmyRegex = /\b(0?[1-9]|[12]\d|3[01])[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](20\d{2})\b/;
  const dmyMatch = str.match(dmyRegex);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);

    if (isValidCalendarDate(year, month, day)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Extracts and normalizes printed delivery date to ISO "YYYY-MM-DD" format.
 */
export function extractPrintedDate(text: string): string | null {
  if (!text) return null;

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const positiveDateLabelRegex =
    /^(?:date|delivery\s*date|dated|printed|order\s*date|invoice\s*date)\s*[:\-]?\s*(.+)$/i;
  const negativeDateLabelRegex =
    /(?:collection|collect|due\b|pickup|ready|estimated|eta|upload)/i;

  // 1. Check lines with explicit positive date labels, excluding collection/due dates
  for (const line of lines) {
    if (negativeDateLabelRegex.test(line)) continue;
    const match = line.match(positiveDateLabelRegex);
    if (match) {
      const parsed = parseDateString(match[1]);
      if (parsed) return parsed;
    }
  }

  // 2. Check lines without negative date labels
  for (const line of lines) {
    if (negativeDateLabelRegex.test(line)) continue;
    const parsed = parseDateString(line);
    if (parsed) return parsed;
  }

  // 3. Fallback across entire text
  return parseDateString(text);
}

/**
 * Helper to parse a time substring into 24-hour HH:mm.
 */
function parseTimeString(str: string): string | null {
  if (!str) return null;

  // 1. 12-hour format with AM/PM (e.g. "02:30 PM", "2:30PM", "11:45 AM", "9:15am")
  const ampmRegex = /\b(0?[1-9]|1[0-2])[:.]([0-5]\d)(?::[0-5]\d)?\s*([APap][Mm])\b/;
  const ampmMatch = str.match(ampmRegex);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const meridian = ampmMatch[3].toUpperCase();

    if (meridian === 'PM' && hours < 12) {
      hours += 12;
    } else if (meridian === 'AM' && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // 2. 24-hour format: HH:mm (e.g. "11:39", "18:45", "08:30:15")
  const time24Regex = /\b([01]?\d|2[0-3])[:.]([0-5]\d)(?::[0-5]\d)?\b/;
  const time24Match = str.match(time24Regex);
  if (time24Match) {
    const hours = parseInt(time24Match[1], 10);
    const minutes = parseInt(time24Match[2], 10);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  return null;
}

/**
 * Extracts and normalizes printed receipt time to standard 24-hour "HH:mm" format.
 * Specifically avoids confusing collection time, due time, or upload time with receipt time.
 */
export function extractPrintedTime(text: string): string | null {
  if (!text) return null;

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Negative labels: Collection time, Due time, Delivery due, Pickup time, Upload time
  const negativeTimeRegex =
    /(?:collection|collect|due|delivery\s*due|order\s*due|ready|pickup|dispatch|promised|estimated|eta|upload)/i;

  // Positive labels: Time, Order Time, Bill Time, Printed, Placed, Created, At
  const positiveTimeLabelRegex =
    /^(?:time|order\s*time|bill\s*time|slip\s*time|printed|placed|created|at)\s*[:\-]?\s*(.+)$/i;

  // 1. Highest priority: Lines explicitly labeled as receipt time and NOT negative
  // Example: "Time: 11:39", "Time: 02:30 PM", "Order Time: 14:15"
  for (const line of lines) {
    if (negativeTimeRegex.test(line)) continue;

    const labelMatch = line.match(positiveTimeLabelRegex);
    if (labelMatch) {
      const parsed = parseTimeString(labelMatch[1]);
      if (parsed) return parsed;
    }
  }

  // 2. Second priority: Timestamp on the same line as the receipt date (e.g. "07/10/2026 11:39")
  for (const line of lines) {
    if (negativeTimeRegex.test(line)) continue;

    if (/\b(?:20\d{2}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/.test(line)) {
      const parsed = parseTimeString(line);
      if (parsed) return parsed;
    }
  }

  // 3. Third priority: Any line without negative keywords containing a valid time
  // e.g. "Delivered at 02:30 PM"
  for (const line of lines) {
    if (negativeTimeRegex.test(line)) continue;
    const parsed = parseTimeString(line);
    if (parsed) return parsed;
  }

  return null;
}

/**
 * Template-specific extractor for the fixed ERP-DELIVERY receipt layout.
 *
 * Fixed Layout Fields:
 * 1. receiptNo: Standalone number centered at top of the receipt, immediately above "Sales Receipt" (e.g. "62", "11").
 * 2. receiptDate: Printed date on left side below business address in DD/MM/YYYY format (e.g. "16/10/2026").
 * 3. receiptTime: Printed time on right side aligned with date in 24-hour HH:mm format (e.g. "00:13").
 * 4. orderType: Bold label below printed time. Must be complete word "DELIVERY". Rejects "COLLECTION", "WEB ORDER", or partials.
 */
export function extractFixedTemplateFields(
  ocrInput: {
    text: string;
    confidence?: number;
    lines?: OCRLine[];
    imageWidth?: number;
    imageHeight?: number;
    templateRegions?: {
      receiptNo?: string | null;
      receiptDate?: string | null;
      receiptTime?: string | null;
      orderType?: string | null;
    };
  }
): TemplateExtractionResult {
  const text = ocrInput?.text || '';
  const lines = (ocrInput?.lines && ocrInput.lines.length > 0)
    ? ocrInput.lines.map((l) => l.text.trim())
    : text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let rawReceiptNo: string | null = ocrInput?.templateRegions?.receiptNo || null;
  let rawDate: string | null = ocrInput?.templateRegions?.receiptDate || null;
  let rawTime: string | null = ocrInput?.templateRegions?.receiptTime || null;
  let rawOrderType: string | null = ocrInput?.templateRegions?.orderType || null;

  // Determine header boundary lines (above items/notes/totals)
  const itemsStartIdx = lines.findIndex((l) =>
    /^(?:items?:|item\b|notes?:|subtotal|delivery\s*charges|due\b)/i.test(l)
  );
  const headerLines = itemsStartIdx !== -1 ? lines.slice(0, itemsStartIdx) : lines.slice(0, 15);

  // 1. Extract receiptNo: Standalone number in top-center region above "Sales Receipt"
  // Examples: "62", "11", "7"
  if (!rawReceiptNo) {
    const salesReceiptIdx = lines.findIndex((l) => /\bsales\s*receipt\b/i.test(l));
    if (salesReceiptIdx !== -1) {
      // Search upwards from the line directly above Sales Receipt
      for (let i = salesReceiptIdx - 1; i >= 0; i--) {
        const line = lines[i];
        // Standalone number (digits only, optional leading hash)
        const numMatch = line.match(/^#?\s*(\d{1,8})\s*$/);
        if (numMatch) {
          rawReceiptNo = numMatch[1];
          break;
        }
        // Number surrounded by noise symbols on borders (e.g. "3 62 x", "4 62 &")
        const allNums = line.match(/\b\d{1,8}\b/g)?.filter((n) => !/^20\d{2}$/.test(n));
        if (allNums && allNums.length > 0) {
          // Select longest number candidate (e.g. "62" over single-digit border noise "3")
          rawReceiptNo = allNums.sort((a, b) => b.length - a.length)[0];
          break;
        }
      }
    }
  }

  // Fallback for standalone receiptNo in top 3 lines if Sales Receipt anchor wasn't found or was on line 0
  if (!rawReceiptNo) {
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      const numMatch = lines[i].match(/^#?\s*(\d{1,8})\s*$/);
      if (numMatch && !/^20\d{2}$/.test(numMatch[1])) {
        rawReceiptNo = numMatch[1];
        break;
      }
    }
  }

  // 2. Extract receiptDate: Left-side date region in DD/MM/YYYY format
  // Example: 16/10/2026 must be recognized as 16 October 2026 (never interpreted using US MM/DD/YYYY format)
  // Rejects invalid calendar dates (e.g. 31/02/2026 or 10/16/2026)
  // Must NOT search outside header (numbers/dates in notes or delivery instructions cannot override)
  if (!rawDate) {
    const anyDateRegex = /(?<!\d)(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?!\d)/;
    for (let i = 0; i < headerLines.length; i++) {
      const line = headerLines[i];
      // Skip due time, bottom instructions, or notes
      if (/(?:due\b|asap|notes|deliver\s*to)/i.test(line)) continue;

      const match = line.match(anyDateRegex);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);

        if (isValidCalendarDate(year, month, day)) {
          rawDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
          break;
        } else {
          return {
            success: false,
            code: 'INVALID_CALENDAR_DATE',
            reason: 'INVALID_CALENDAR_DATE',
            data: null,
            error: `Invalid calendar date: ${match[0]} does not exist in the calendar.`,
            rawCandidates: { receiptNo: rawReceiptNo, receiptDate: match[0], receiptTime: rawTime, orderType: rawOrderType },
          };
        }
      }
    }
  }

  // 3. Extract receiptTime: Right-side time region aligned with the date
  // Valid 24-hour HH:mm (e.g. 00:13)
  // Must NOT substitute due time printed lower on the receipt (Due: ASAP 00:34)
  // Must NOT search outside header lines
  if (!rawTime) {
    const timeRegex = /(?<!\d)([01]\d|2[0-3]):([0-5]\d)(?!\d)/;
    for (let i = 0; i < headerLines.length; i++) {
      const line = headerLines[i];
      // Ignore lines that represent due time, delivery instructions, items, notes, totals, or VAT
      if (/(?:due|asap|deliver\s*to|item|margherita|notes|subtotal|charges|tax|paid|vat\b)/i.test(line)) {
        continue;
      }

      const match = line.match(timeRegex);
      if (match) {
        rawTime = `${match[1]}:${match[2]}`;
        break;
      }
    }
  }

  // 4. Extract orderType: Bold order-type label below the time
  // Requires the complete word DELIVERY. Rejects COLLECTION, WEB ORDER, or partial matches such as DELIVER.
  // Restricted to upper header section to avoid falsely matching 'Delivery Charges' in bill summary.
  if (!rawOrderType) {
    const isDeliveryLine = (l: string) =>
      /^(?:order\s*type\s*[:\-]?\s*)?DELIVERY$/i.test(l.trim()) ||
      (!/(?:charges|deliver\s*to|delivery\s*time|delivery\s*date)/i.test(l) && /\bDELIVERY\b/i.test(l.trim()));

    const isCollectionLine = (l: string) =>
      /^(?:order\s*type\s*[:\-]?\s*)?COLLECTION$/i.test(l.trim()) ||
      (!/(?:charges|deliver\s*to|collection\s*time|collection\s*date)/i.test(l) && /\bCOLLECTION\b/i.test(l.trim()));

    const hasDeliveryInHeader = headerLines.some(isDeliveryLine);
    const hasCollectionInHeader = headerLines.some(isCollectionLine);

    if (hasCollectionInHeader) {
      rawOrderType = 'COLLECTION';
    } else if (hasDeliveryInHeader) {
      rawOrderType = 'DELIVERY';
    } else {
      // Check if partial word like DELIVER or WEB ORDER was provided on a standalone line
      const partialDeliver = headerLines.some((l) => /^(?:order\s*type\s*[:\-]?\s*)?DELIVER$/i.test(l.trim()));
      const webOrderOnly = headerLines.some((l) => /^(?:web\s*order)$/i.test(l.trim()));

      if (partialDeliver) {
        return {
          success: false,
          code: 'ORDER_TYPE_AMBIGUOUS',
          reason: 'ORDER_TYPE_AMBIGUOUS',
          data: null,
          error: `Invalid order type: Partial match 'DELIVER' detected. The complete word 'DELIVERY' is required.`,
          rawCandidates: { receiptNo: rawReceiptNo, receiptDate: rawDate, receiptTime: rawTime, orderType: 'DELIVER' },
        };
      } else if (webOrderOnly) {
        return {
          success: false,
          code: 'WEB_ORDER_INSUFFICIENT',
          reason: 'WEB_ORDER_INSUFFICIENT',
          data: null,
          error: `Invalid order type: Found 'WEB ORDER', which alone is not proof of delivery. Complete word 'DELIVERY' is required.`,
          rawCandidates: { receiptNo: rawReceiptNo, receiptDate: rawDate, receiptTime: rawTime, orderType: 'WEB ORDER' },
        };
      }
    }
  }

  // Verification checks for each required field with typed rejection reasons
  if (!rawReceiptNo) {
    return {
      success: false,
      code: 'RECEIPT_NUMBER_UNREADABLE',
      reason: 'RECEIPT_NUMBER_UNREADABLE',
      data: null,
      error: 'Receipt number is unreadable: Could not find standalone number above Sales Receipt.',
      rawCandidates: { receiptNo: null, receiptDate: rawDate, receiptTime: rawTime, orderType: rawOrderType },
    };
  }

  if (!rawDate) {
    return {
      success: false,
      code: 'DATE_UNREADABLE',
      reason: 'DATE_UNREADABLE',
      data: null,
      error: 'Receipt date is unreadable or not in valid DD/MM/YYYY format.',
      rawCandidates: { receiptNo: rawReceiptNo, receiptDate: null, receiptTime: rawTime, orderType: rawOrderType },
    };
  }

  if (!rawTime) {
    return {
      success: false,
      code: 'TIME_UNREADABLE',
      reason: 'TIME_UNREADABLE',
      data: null,
      error: 'Receipt time is unreadable or missing aligned 24-hour HH:mm time.',
      rawCandidates: { receiptNo: rawReceiptNo, receiptDate: rawDate, receiptTime: null, orderType: rawOrderType },
    };
  }

  if (rawOrderType === 'COLLECTION') {
    return {
      success: false,
      code: 'COLLECTION_REJECTED',
      reason: 'COLLECTION_REJECTED',
      data: null,
      error: "Order type is 'COLLECTION'. Only 'DELIVERY' receipts are accepted.",
      rawCandidates: { receiptNo: rawReceiptNo, receiptDate: rawDate, receiptTime: rawTime, orderType: 'COLLECTION' },
    };
  }

  if (rawOrderType !== 'DELIVERY') {
    return {
      success: false,
      code: 'NOT_DELIVERY',
      reason: 'NOT_DELIVERY',
      data: null,
      error: "Order type is unreadable or not 'DELIVERY'.",
      rawCandidates: { receiptNo: rawReceiptNo, receiptDate: rawDate, receiptTime: rawTime, orderType: rawOrderType },
    };
  }

  // Validate structured result against Zod Schema
  const parseResult = FixedTemplateSlipSchema.safeParse({
    receiptNo: rawReceiptNo,
    receiptDate: rawDate,
    receiptTime: rawTime,
    orderType: rawOrderType,
  });

  if (!parseResult.success) {
    return {
      success: false,
      code: 'SCHEMA_VALIDATION_FAILED',
      reason: 'SCHEMA_VALIDATION_FAILED',
      data: null,
      error: `Schema validation failed: ${parseResult.error.issues.map((i) => i.message).join(', ')}`,
      rawCandidates: { receiptNo: rawReceiptNo, receiptDate: rawDate, receiptTime: rawTime, orderType: rawOrderType },
    };
  }

  return {
    success: true,
    code: 'VALID',
    reason: 'VALID',
    data: parseResult.data,
    rawCandidates: parseResult.data,
  };
}

/**
 * Parses raw OCR text into structured delivery slip fields.
 *
 * @param ocrResult Object containing raw OCR text, confidence score, and optional lines
 * @param options Parser configuration options
 * @returns ExtractedSlipDetails with extracted fields and needsReview flag
 */
export function parseSlipDetails(
  ocrResult: {
    text: string;
    confidence?: number;
    lines?: OCRLine[];
    imageWidth?: number;
    imageHeight?: number;
    templateRegions?: {
      receiptNo?: string | null;
      receiptDate?: string | null;
      receiptTime?: string | null;
      orderType?: string | null;
    };
  },
  options: ParseOptions = {}
): ExtractedSlipDetails {
  const rawText = ocrResult?.text ? ocrResult.text.trim() : '';
  const confidence =
    typeof ocrResult?.confidence === 'number' && !isNaN(ocrResult.confidence)
      ? ocrResult.confidence
      : 0;

  const threshold = options.minConfidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;

  // 1. Attempt fixed-template extraction
  const templateResult = extractFixedTemplateFields(ocrResult);

  if (templateResult.success && templateResult.data) {
    const dmyMatch = templateResult.data.receiptDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const isoDate = dmyMatch
      ? `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`
      : templateResult.data.receiptDate;

    return {
      receiptNo: templateResult.data.receiptNo,
      receiptDate: templateResult.data.receiptDate,
      receiptTime: templateResult.data.receiptTime,
      orderType: templateResult.data.orderType,
      printedDeliveryDate: isoDate,
      printedDeliveryTime: templateResult.data.receiptTime,
      rawText,
      confidence: Math.max(confidence, 90),
      needsReview: false,
      templateResult: templateResult.data,
      validationReason: 'VALID',
    };
  }

  if (templateResult.rawCandidates?.orderType === 'COLLECTION') {
    const rawDate = templateResult.rawCandidates?.receiptDate || null;
    const dmyMatch = rawDate ? rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/) : null;
    const isoDate = dmyMatch ? `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}` : null;

    return {
      receiptNo: templateResult.rawCandidates?.receiptNo || null,
      receiptDate: templateResult.rawCandidates?.receiptDate || null,
      receiptTime: templateResult.rawCandidates?.receiptTime || null,
      orderType: 'COLLECTION',
      printedDeliveryDate: isoDate,
      printedDeliveryTime: templateResult.rawCandidates?.receiptTime || null,
      rawText,
      confidence,
      needsReview: true,
      error: templateResult.error,
      validationReason: 'COLLECTION_REJECTED',
    };
  }

  // If fixed template slip was detected but failed strict acceptance rules:
  const isDeliveryOrCollectionLine = (l: string) =>
    /^(?:order\s*type\s*[:\-]?\s*)?(?:DELIVERY|COLLECTION)$/i.test(l.trim()) ||
    (!/(?:charges|deliver\s*to|delivery\s*time|delivery\s*date|collection\s*time|collection\s*date)/i.test(l) &&
      /\b(?:DELIVERY|COLLECTION)\b/i.test(l.trim()));

  const checkLines = rawText.split(/\r?\n/).map((l) => l.trim());
  const hasOrderType = checkLines.some(isDeliveryOrCollectionLine);
  const isTemplateSlip =
    hasOrderType ||
    /\b(?:basilico|web\s*order)\b/i.test(rawText) ||
    !!ocrResult?.templateRegions;

  if (isTemplateSlip && !templateResult.success) {
    const rawDate = templateResult.rawCandidates?.receiptDate || null;
    const dmyMatch = rawDate ? rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/) : null;
    const isoDate = dmyMatch ? `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}` : null;

    return {
      receiptNo: templateResult.rawCandidates?.receiptNo || null,
      receiptDate: templateResult.rawCandidates?.receiptDate || null,
      receiptTime: templateResult.rawCandidates?.receiptTime || null,
      orderType: (templateResult.rawCandidates?.orderType as any) || undefined,
      printedDeliveryDate: isoDate,
      printedDeliveryTime: templateResult.rawCandidates?.receiptTime || null,
      rawText,
      confidence,
      needsReview: true,
      error: templateResult.error,
      validationReason: templateResult.code,
    };
  }

  // 2. Generic fallback for legacy formats and tests
  const { receiptNo, candidates, isAmbiguous } = resolveReceiptNumber(rawText, {
    lines: ocrResult?.lines,
  });

  const printedDeliveryDate = extractPrintedDate(rawText);
  const printedDeliveryTime = extractPrintedTime(rawText);

  // Diagnostic logging in development mode
  if (process.env.NODE_ENV !== 'production') {
    console.log('[OCR Parser] Scanned text length:', rawText.length);
    console.log('[OCR Parser] Identified candidates:', candidates);
    console.log('[OCR Parser] Extracted fields:', {
      receiptNo,
      printedDeliveryDate,
      printedDeliveryTime,
      confidence,
      isAmbiguous,
    });
  }

  const isConfidenceLow = confidence < threshold;
  const isReceiptMissing = receiptNo === null;
  const isTextEmpty = rawText.length === 0;

  const needsReview = isConfidenceLow || isReceiptMissing || isAmbiguous || isTextEmpty;

  return {
    receiptNo,
    printedDeliveryDate,
    printedDeliveryTime,
    receiptDate: printedDeliveryDate || undefined,
    receiptTime: printedDeliveryTime || undefined,
    orderType: /\bDELIVERY\b/i.test(rawText) ? 'DELIVERY' : undefined,
    rawText,
    confidence,
    needsReview,
    candidates,
  };
}

export default {
  parseSlipDetails,
  extractFixedTemplateFields,
  extractReceiptNo,
  resolveReceiptNumber,
  findReceiptCandidates,
  extractPrintedDate,
  extractPrintedTime,
  normalizeReceiptNo,
  DEFAULT_CONFIDENCE_THRESHOLD,
};

