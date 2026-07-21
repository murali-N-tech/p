export function looksDoubleStruck(text: string): boolean {
  const sample = text.substring(0, 3000);
  const alnumPositions: number[] = [];
  for (let i = 0; i < sample.length - 1; i++) {
    if (/[a-zA-Z0-9]/.test(sample[i])) {
      alnumPositions.push(i);
    }
  }
  if (alnumPositions.length < 20) return false;
  let doubled = 0;
  for (let idx = 0; idx < alnumPositions.length - 1; idx++) {
    const i = alnumPositions[idx];
    if (sample[i] === sample[i + 1]) doubled++;
  }
  return (doubled / alnumPositions.length) > 0.4;
}

export function fixDoubleStruck(text: string): string {
  let out = "";
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (i + 1 < n && text[i] === text[i + 1]) {
      out += text[i];
      i += 2;
    } else {
      out += text[i];
      i++;
    }
  }
  return out;
}

export function normalizeText(text: string): string {
  if (text && looksDoubleStruck(text)) {
    return fixDoubleStruck(text);
  }
  return text;
}
export interface Transaction {
  date: string | null;
  description: string;
  debit: number | null;
  credit: number | null;
  balance: number | null;
  is_upi: boolean;
  upi_ref: string | null;
  vpa: string | null;
  txn_type: string | null;
  raw_line: string;
}

const DATE_PATTERNS = [
  "\\d{2}[-/]\\d{2}[-/]\\d{2,4}",
  "\\d{2}\\s?[A-Za-z]{3,9}\\s?\\d{2,4}",
  "\\d{4}[-/]\\d{2}[-/]\\d{2}"
];
const DATE_RE = new RegExp("(" + DATE_PATTERNS.join("|") + ")");
// Match amount: optional symbol, digits with commas, optional decimal, optional Dr/Cr
const AMOUNT_RE = /(?:₹|Rs\.?|INR)?\s*(-?\d+(?:,\d+)*(?:\.\d{1,2})?)\s*(Dr|Cr|DR|CR)?\b/g;
const VPA_RE = /\b[\w.]+@[a-zA-Z]{2,}\b/i;
const UPI_REF_RE = /(\d{10,12})(?!\d)/;
const UPI_KEYWORDS_RE = /\bUPI\b|@ok[a-z]*|@yb[a-z]*|@paytm|@ibl|@sbi|@icici|@axis|@hdfc|@ptaxis|@ptsbi|@apl|@axl|IMPS|NEFT|RTGS/i;
const DEBIT_HINTS = /\bdebit|withdraw|paid|sent|dr\b|debited/i;
const CREDIT_HINTS = /\bcredit|deposit|received|cr\b|credited/i;

function cleanAmount(s: string | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/,/g, "").replace(/[₹Rs.INR]/g, "").trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function parseDate(s: string): string | null {
  s = s.trim();
  const parts = s.split(/[-/\s]/);
  // Basic normalization for return, keeping original roughly if parsing is complex
  // To avoid complex date math in JS without date-fns, let's just return the raw date or a simple ISO conversion
  return s;
}

export function extractFromText(text: string): Transaction[] {
  const txns: Transaction[] = [];
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    const dateMatch = line.match(DATE_RE);
    if (!dateMatch) continue;
    
    // Find all amounts in the line
    const amountMatches = Array.from(line.matchAll(AMOUNT_RE));
    if (amountMatches.length === 0) continue;

    const dateStr = dateMatch[1];
    const desc = line.substring(dateMatch.index! + dateStr.length).trim();
    
    const vpaMatch = line.match(VPA_RE);
    const refMatch = line.match(UPI_REF_RE);
    const isUpi = UPI_KEYWORDS_RE.test(line);

    let debit: number | null = null;
    let credit: number | null = null;
    let balance: number | null = null;

    const nums = amountMatches.map(m => {
      return { val: cleanAmount(m[1]), tag: m[2] ? m[2].toUpperCase() : null };
    }).filter(n => n.val !== null) as {val: number, tag: string | null}[];

    if (nums.length > 0) {
      balance = nums[nums.length - 1].val;
      const txnAmounts = nums.length > 1 ? nums.slice(0, -1) : nums;
      for (const {val, tag} of txnAmounts) {
        if (tag === "DR" || DEBIT_HINTS.test(desc)) {
          debit = Math.abs(val);
        } else if (tag === "CR" || CREDIT_HINTS.test(desc)) {
          credit = Math.abs(val);
        }
      }
      if (debit === null && credit === null && txnAmounts.length > 0) {
        const val = txnAmounts[0].val;
        if (CREDIT_HINTS.test(desc)) credit = Math.abs(val);
        else debit = Math.abs(val);
      }
    }

    const txnType = debit !== null ? "DEBIT" : (credit !== null ? "CREDIT" : null);

    txns.push({
      date: parseDate(dateStr),
      description: desc,
      debit, credit, balance,
      is_upi: isUpi,
      upi_ref: refMatch ? refMatch[1] : null,
      vpa: vpaMatch ? vpaMatch[0] : null,
      txn_type: txnType,
      raw_line: line
    });
  }
  return txns;
}

const BLOCK_DATE_RE = /^([A-Za-z]{3}\s\d{1,2},?\s\d{4})\b/;
const BLOCK_TIME_RE = /\b\d{1,2}:\d{2}\s?[AP]M\b/;
const BLOCK_TYPE_RE = /\b(DEBIT|CREDIT)\b/i;
const BLOCK_AMOUNT_RE = /₹\s?(-?\d[\d,]*\.?\d*)/;
const BLOCK_TXNID_RE = /Transaction\s*ID[:\s]*([A-Za-z0-9]+)/i;
const BLOCK_UTR_RE = /UTR\s*No\.?[:\s]*([A-Za-z0-9]+)/i;
const BLOCK_ACCT_RE = /\b(?:Paid by|Credited to|Debited from|Paid from)[:\s]*([A-Za-z0-9]+)/i;
const BLOCK_PAIDTO_RE = /\b(?:Paid to|Received from|Paid by|Credited to|Debited from)\b/i;
const JUNK_LINE_RE = /^(Transaction\s+)?Statement\s+for\b|^\d{1,2}\s[A-Za-z]{3},?\s\d{4}\s*-\s*\d{1,2}\s[A-Za-z]{3},?\s\d{4}$|^Date\s+Transaction\s+Details?\s+Type\s+Amount$|^Page\s+\d+\s+of\s+\d+$/i;

export function extractFromAppBlocks(text: string): Transaction[] {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0 && !JUNK_LINE_RE.test(l));
  
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (BLOCK_DATE_RE.test(line)) {
      if (current.length > 0) blocks.push(current);
      current = [line];
    } else if (current.length > 0) {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);

  const txns: Transaction[] = [];
  for (const blockLines of blocks) {
    const blockText = blockLines.join(" ");
    const dateM = blockLines[0].match(BLOCK_DATE_RE);
    const typeM = blockText.match(BLOCK_TYPE_RE);
    const amountM = blockText.match(BLOCK_AMOUNT_RE);

    if (!dateM || !typeM || !amountM) continue;

    const amount = cleanAmount(amountM[1]);
    const ttype = typeM[1].toUpperCase();
    const debit = ttype === "DEBIT" ? amount : null;
    const credit = ttype === "CREDIT" ? amount : null;

    const txnIdM = blockText.match(BLOCK_TXNID_RE);
    const utrM = blockText.match(BLOCK_UTR_RE);
    const vpaM = blockText.match(VPA_RE);

    let desc = blockText;
    desc = desc.replace(BLOCK_DATE_RE, "");
    desc = desc.replace(BLOCK_TIME_RE, "");
    desc = desc.replace(BLOCK_TYPE_RE, "");
    desc = desc.replace(BLOCK_AMOUNT_RE, "");
    desc = desc.replace(BLOCK_TXNID_RE, "");
    desc = desc.replace(BLOCK_UTR_RE, "");
    desc = desc.replace(BLOCK_ACCT_RE, "");
    desc = desc.replace(BLOCK_PAIDTO_RE, "");
    desc = desc.replace(/\s+/g, " ").replace(/^[ .-]+|[ .-]+$/g, "");

    txns.push({
      date: parseDate(dateM[1].replace(/,/g, "")),
      description: desc,
      debit, credit, balance: null,
      is_upi: true,
      upi_ref: txnIdM ? txnIdM[1] : (utrM ? utrM[1] : null),
      vpa: vpaM ? vpaM[0] : null,
      txn_type: ttype,
      raw_line: blockText
    });
  }
  return txns;
}

const GPAY_DATE_RE = /^(\d{2}[A-Za-z]{3},\d{4})\b/;
const GPAY_TXN_RE = /^\d{2}[A-Za-z]{3},\d{4}\s+(Paidto|Receivedfrom)(.+?)\s*₹\s?(-?[\d,]+\.?\d*)/i;
const GPAY_TXNID_RE = /UPITransactionID:?\s*(\w+)/i;
const GPAY_JUNK_RE = /^Transaction\s*statement$|^\d{7,}.*@|^Transactionstatementperiod|^\d{2}[A-Za-z]{3,9}\d{4}\s*-\s*\d{2}[A-Za-z]{3,9}\d{4}|^Date&time|^Note:|^received\.|GooglePay|^Page\d+of\d+$/i;

export function extractFromGpayBlocks(text: string): Transaction[] {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0 && !GPAY_JUNK_RE.test(l));

  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (GPAY_DATE_RE.test(line)) {
      if (current.length > 0) blocks.push(current);
      current = [line];
    } else if (current.length > 0) {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);

  const txns: Transaction[] = [];
  for (const blockLines of blocks) {
    const blockText = blockLines.join(" ");
    const m = blockText.match(GPAY_TXN_RE);
    const dateM = blockLines[0].match(GPAY_DATE_RE);
    if (!m || !dateM) continue;

    const direction = m[1].toLowerCase();
    const name = m[2].replace(/\s+/g, " ").trim();
    const amount = cleanAmount(m[3]);
    const ttype = direction === "paidto" ? "DEBIT" : "CREDIT";
    const debit = ttype === "DEBIT" ? amount : null;
    const credit = ttype === "CREDIT" ? amount : null;

    const txnIdM = blockText.match(GPAY_TXNID_RE);
    const dateNorm = dateM[1].replace(/^(\d{2})([A-Za-z]{3}),(\d{4})$/, "$1 $2 $3");

    txns.push({
      date: parseDate(dateNorm),
      description: name,
      debit, credit, balance: null,
      is_upi: true,
      upi_ref: txnIdM ? txnIdM[1] : null,
      vpa: null,
      txn_type: ttype,
      raw_line: blockText
    });
  }
  return txns;
}

export function parseStatementText(rawText: string): Transaction[] {
  const normalized = normalizeText(rawText);
  const textTxns = extractFromText(normalized);
  const appTxns = extractFromAppBlocks(normalized);
  const gpayTxns = extractFromGpayBlocks(normalized);

  let best = textTxns;
  if (appTxns.length > best.length) best = appTxns;
  if (gpayTxns.length > best.length) best = gpayTxns;

  return best;
}
