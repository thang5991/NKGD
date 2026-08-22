import { saveTrade, getAllTrades } from '../db/tradeRepository';
import { getPipMeta, calculateTrade, classifyTradeResult } from './calculator';
import { getFxRate, getQuoteCurrency } from '../db/fxRateRepository';
import { Market, Side, Trade } from '../types/trade';
import { DEFAULT_ACCOUNT_ID } from '../types/account';

export type BrokerPlatform = 'mt5' | 'ctrader';

export interface BrokerTradeCandidate {
  externalId: string;
  openTime: string;
  closeTime: string;
  symbol: string;
  side: Side;
  lot: number;
  units: number;
  entry: number;
  exit: number;
  stopLoss?: number;
  takeProfit?: number;
  commission: number;
  swap: number;
  pnl: number;
  comment?: string;
}

export interface BrokerParseResult {
  platform: BrokerPlatform;
  fileName: string;
  trades: BrokerTradeCandidate[];
  skippedRows: number;
}

export interface BrokerImportResult {
  imported: number;
  duplicates: number;
  failed: number;
}

type Row = string[];

const HEADER_ALIASES = {
  id: ['position id', 'position', 'deal id', 'deal', 'order id', 'order', 'id', 'ticket', 'mã lệnh'],
  symbol: ['symbol', 'instrument', 'ký hiệu', 'sản phẩm'],
  side: ['opening direction', 'direction', 'trade side', 'side', 'type', 'hướng', 'loại'],
  volume: ['closing quantity', 'quantity', 'volume', 'size', 'lots', 'lot', 'khối lượng'],
  openTime: ['opening time', 'open time', 'entry time', 'created time', 'thời gian mở', 'giờ mở'],
  closeTime: ['closing time', 'close time', 'exit time', 'closed time', 'thời gian đóng', 'giờ đóng'],
  entry: ['entry price', 'opening price', 'open price', 'giá mở', 'giá vào'],
  exit: ['closing price', 'close price', 'exit price', 'giá đóng', 'giá thoát'],
  stopLoss: ['stop loss', 's/l', 'sl', 'cắt lỗ'],
  takeProfit: ['take profit', 't/p', 'tp', 'chốt lời'],
  commission: ['commission', 'commissions', 'hoa hồng'],
  swap: ['swap', 'swaps', 'phí qua đêm'],
  fee: ['fee', 'fees', 'phí'],
  pnl: ['net profit', 'net p/l', 'net pnl', 'realized p/l', 'realised p/l', 'profit', 'gross profit', 'p/l', 'pnl', 'lợi nhuận'],
  comment: ['comment', 'label', 'notes', 'bình luận', 'ghi chú'],
} as const;

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function findColumn(headers: string[], aliases: readonly string[]): number {
  for (const alias of aliases) {
    const exact = headers.findIndex((header) => header === alias);
    if (exact >= 0) return exact;
  }
  for (const alias of aliases) {
    const partial = headers.findIndex((header) => header.includes(alias));
    if (partial >= 0) return partial;
  }
  return -1;
}

function findRepeatedColumn(headers: string[], value: string, occurrence: number): number {
  const matches = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => header === value || header.endsWith(` ${value}`));
  return matches[occurrence]?.index ?? -1;
}

function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const negative = /^\s*\(.*\)\s*$/.test(value);
  let cleaned = value.replace(/[()\s\u00a0'€£¥$]/g, '').replace(/[^0-9,.-]/g, '');
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/,/g, '.');
  }
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -Math.abs(parsed) : parsed;
}

function parseDateTime(value: string | undefined): string {
  if (!value) return '';
  const source = value.trim();
  let match = source.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})[ T,]+(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}T${match[4].padStart(2, '0')}:${match[5]}`;
  }

  match = source.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})[ T,]+(\d{1,2}):(\d{2})/);
  if (match) {
    // MT5/cTrader reports follow the terminal locale. Vietnamese and most
    // non-US exports use day/month/year.
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}T${match[4].padStart(2, '0')}:${match[5]}`;
  }

  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) return '';
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function normalizeSymbol(value: string): string {
  return value.toUpperCase().replace(/\//g, '').replace(/\s+/g, '').trim();
}

function parseSide(value: string): Side | null {
  const normalized = value.toLowerCase().trim();
  if (/\b(buy|long|mua)\b/.test(normalized)) return 'Long';
  if (/\b(sell|short|bán|ban)\b/.test(normalized)) return 'Short';
  return null;
}

function parseDelimited(text: string, delimiter: string): Row[] {
  const rows: Row[] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function scoreRows(rows: Row[]): number {
  return rows.reduce((best, row) => {
    const headers = row.map(normalizeHeader);
    const score = [HEADER_ALIASES.symbol, HEADER_ALIASES.side, HEADER_ALIASES.volume, HEADER_ALIASES.pnl]
      .filter((aliases) => findColumn(headers, aliases) >= 0).length;
    return Math.max(best, score);
  }, 0);
}

function rowsFromDelimited(text: string): Row[] {
  const candidates = [',', ';', '\t'].map((delimiter) => parseDelimited(text, delimiter));
  return candidates.sort((a, b) => scoreRows(b) - scoreRows(a))[0];
}

function rowsFromHtml(text: string): Row[] {
  const document = new DOMParser().parseFromString(text, 'text/html');
  return Array.from(document.querySelectorAll('tr')).map((row) =>
    Array.from(row.querySelectorAll('th, td')).map((cell) => cell.textContent?.replace(/\s+/g, ' ').trim() || '')
  ).filter((row) => row.some(Boolean));
}

function locateHeader(rows: Row[]): { index: number; headers: string[] } {
  for (let index = 0; index < rows.length; index++) {
    const headers = rows[index].map(normalizeHeader);
    const hasSymbol = findColumn(headers, HEADER_ALIASES.symbol) >= 0;
    const hasSide = findColumn(headers, HEADER_ALIASES.side) >= 0;
    const hasVolume = findColumn(headers, HEADER_ALIASES.volume) >= 0;
    const hasPnl = findColumn(headers, HEADER_ALIASES.pnl) >= 0;
    if (hasSymbol && hasSide && hasVolume && hasPnl) return { index, headers };
  }
  throw new Error('Không tìm thấy bảng lịch sử giao dịch hợp lệ trong file');
}

function getCell(row: Row, index: number): string {
  return index >= 0 ? row[index] || '' : '';
}

function mapRows(rows: Row[], platform: BrokerPlatform): { trades: BrokerTradeCandidate[]; skippedRows: number } {
  const { index: headerIndex, headers } = locateHeader(rows);
  const idIndex = findColumn(headers, HEADER_ALIASES.id);
  const symbolIndex = findColumn(headers, HEADER_ALIASES.symbol);
  const sideIndex = findColumn(headers, HEADER_ALIASES.side);
  const volumeIndex = findColumn(headers, HEADER_ALIASES.volume);
  const openTimeIndex = findColumn(headers, HEADER_ALIASES.openTime) >= 0
    ? findColumn(headers, HEADER_ALIASES.openTime)
    : findRepeatedColumn(headers, 'time', 0);
  const closeTimeIndex = findColumn(headers, HEADER_ALIASES.closeTime) >= 0
    ? findColumn(headers, HEADER_ALIASES.closeTime)
    : findRepeatedColumn(headers, 'time', 1);
  const entryIndex = findColumn(headers, HEADER_ALIASES.entry) >= 0
    ? findColumn(headers, HEADER_ALIASES.entry)
    : findRepeatedColumn(headers, 'price', 0);
  const exitIndex = findColumn(headers, HEADER_ALIASES.exit) >= 0
    ? findColumn(headers, HEADER_ALIASES.exit)
    : findRepeatedColumn(headers, 'price', 1);
  const stopLossIndex = findColumn(headers, HEADER_ALIASES.stopLoss);
  const takeProfitIndex = findColumn(headers, HEADER_ALIASES.takeProfit);
  const commissionIndex = findColumn(headers, HEADER_ALIASES.commission);
  const swapIndex = findColumn(headers, HEADER_ALIASES.swap);
  const feeIndex = findColumn(headers, HEADER_ALIASES.fee);
  const pnlIndex = findColumn(headers, HEADER_ALIASES.pnl);
  const commentIndex = findColumn(headers, HEADER_ALIASES.comment);
  const volumeHeader = headers[volumeIndex] || '';

  const trades: BrokerTradeCandidate[] = [];
  let skippedRows = 0;
  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const side = parseSide(getCell(row, sideIndex));
    const symbol = normalizeSymbol(getCell(row, symbolIndex));
    const openTime = parseDateTime(getCell(row, openTimeIndex));
    const closeTime = parseDateTime(getCell(row, closeTimeIndex));
    const entry = parseNumber(getCell(row, entryIndex));
    const exit = parseNumber(getCell(row, exitIndex));
    const rawVolume = Math.abs(parseNumber(getCell(row, volumeIndex)));

    if (!side || !symbol || !openTime || !closeTime || entry <= 0 || exit <= 0 || rawVolume <= 0) {
      if (row.some(Boolean)) skippedRows++;
      continue;
    }

    const meta = getPipMeta(symbol);
    const volumeIsUnits = platform === 'ctrader' && volumeHeader.includes('volume') && rawVolume >= meta.contractSize / 10;
    const lot = volumeIsUnits ? rawVolume / meta.contractSize : rawVolume;
    const units = lot * meta.contractSize;
    const commission = parseNumber(getCell(row, commissionIndex)) + parseNumber(getCell(row, feeIndex));
    const swap = parseNumber(getCell(row, swapIndex));
    const reportedPnl = parseNumber(getCell(row, pnlIndex));
    const headerIsNet = (headers[pnlIndex] || '').includes('net');
    const pnl = headerIsNet ? reportedPnl : reportedPnl + commission + swap;
    const externalId = getCell(row, idIndex) || `${symbol}-${openTime}-${closeTime}-${side}-${rawVolume}`;

    trades.push({
      externalId,
      openTime,
      closeTime,
      symbol,
      side,
      lot: Number(lot.toFixed(4)),
      units: Number(units.toFixed(2)),
      entry,
      exit,
      stopLoss: parseNumber(getCell(row, stopLossIndex)) || undefined,
      takeProfit: parseNumber(getCell(row, takeProfitIndex)) || undefined,
      commission,
      swap,
      pnl: Number(pnl.toFixed(2)),
      comment: getCell(row, commentIndex) || undefined,
    });
  }

  return { trades, skippedRows };
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function inferMarket(symbol: string): Market {
  const normalized = symbol.toUpperCase();
  if (normalized.startsWith('XAU') || normalized.startsWith('XAG')) return 'Commodities';
  if (/(BTC|ETH|USDT|USDC|SOL)/.test(normalized)) return 'Crypto';
  if (/(US30|NAS|SPX|GER|DE40|UK100|JP225)/.test(normalized)) return 'Indices';
  return 'Forex';
}

export async function parseBrokerStatement(file: File, platform: BrokerPlatform): Promise<BrokerParseResult> {
  const text = await file.text();
  const isHtml = /\.html?$/i.test(file.name) || /<\s*(html|table|tr)\b/i.test(text);
  const rows = isHtml ? rowsFromHtml(text) : rowsFromDelimited(text);
  const parsed = mapRows(rows, platform);
  if (parsed.trades.length === 0) {
    throw new Error('Không tìm thấy giao dịch đã đóng nào trong file');
  }
  return { platform, fileName: file.name, ...parsed };
}

export async function importBrokerTrades(parsed: BrokerParseResult, accountId = DEFAULT_ACCOUNT_ID, currency = 'USD'): Promise<BrokerImportResult> {
  const existing = await getAllTrades();
  const existingIds = new Set(existing.map((trade) => trade.id));
  let imported = 0;
  let duplicates = 0;
  let failed = 0;

  for (const candidate of parsed.trades) {
    const fingerprint = `${candidate.externalId}|${candidate.symbol}|${candidate.openTime}|${candidate.closeTime}`;
    const id = `import-${parsed.platform}-${stableHash(`${accountId}|${fingerprint}`)}`;
    if (existingIds.has(id)) {
      duplicates++;
      continue;
    }

    try {
      const accountCurrency = currency.toUpperCase().trim() || 'USD';
      const market = inferMarket(candidate.symbol);
      const detectedQuote = getQuoteCurrency(candidate.symbol);
      const quoteCurrency = /^[A-Z]{3}$/.test(detectedQuote) ? detectedQuote : accountCurrency;
      const conversion = await getFxRate(quoteCurrency, accountCurrency, candidate.closeTime);
      const calc = calculateTrade({
        side: candidate.side,
        entry: candidate.entry,
        exit: candidate.exit,
        stopLoss: candidate.stopLoss,
        takeProfit: candidate.takeProfit,
        lot: candidate.lot,
        units: candidate.units,
        fee: 0,
        symbol: candidate.symbol,
        accountCurrency,
        conversionRate: conversion.rate,
      });
      const riskAmount = calc.riskAmount;
      const pnl = candidate.pnl;
      const rMultiple = riskAmount > 0 ? pnl / riskAmount : 0;
      const now = new Date().toISOString();
      const platformName = parsed.platform === 'mt5' ? 'MetaTrader 5' : 'cTrader';
      const fee = Math.max(0, -candidate.commission) + Math.max(0, -candidate.swap);

      const trade: Trade = {
        id,
        accountId,
        date: candidate.openTime,
        exitDate: candidate.closeTime,
        symbol: candidate.symbol,
        timeframe: 'M15',
        side: candidate.side,
        market,
        setup: `Import từ ${platformName}`,
        emotion: 'Bình tĩnh',
        entry: candidate.entry,
        stopLoss: candidate.stopLoss,
        takeProfit: candidate.takeProfit,
        exit: candidate.exit,
        lot: candidate.lot,
        units: candidate.units,
        fee: Number(fee.toFixed(2)),
        accountCurrency,
        quoteCurrency,
        conversionRate: conversion.rate,
        conversionDate: conversion.rateDate,
        conversionSource: conversion.source,
        pnlQuote: calc.pnlQuote,
        riskAmountQuote: calc.riskAmountQuote,
        notes: [`Nguồn: ${platformName}`, `ID: ${candidate.externalId}`, candidate.comment].filter(Boolean).join(' · '),
        imageRefs: [],
        pnl,
        riskAmount,
        rMultiple: Number(rMultiple.toFixed(2)),
        plannedRR: calc.plannedRR,
        result: classifyTradeResult(pnl, riskAmount, rMultiple),
        importSource: parsed.platform,
        externalId: candidate.externalId,
        createdAt: now,
        updatedAt: now,
      };
      await saveTrade(trade);
      existingIds.add(id);
      imported++;
    } catch (error) {
      console.error(`Failed to import ${parsed.platform} trade ${candidate.externalId}:`, error);
      failed++;
    }
  }

  return { imported, duplicates, failed };
}
