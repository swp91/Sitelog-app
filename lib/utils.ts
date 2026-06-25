import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Records, DayRecord } from './types'
import { Share } from 'react-native'
import * as Clipboard from 'expo-clipboard'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Date helpers ──────────────────────────────────────────────────────────────

export function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

export function fmtKDate(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`
}

export function fmtKShort(d: Date): string {
  return `${d.getMonth() + 1}.${d.getDate()}`
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

// ── Currency ──────────────────────────────────────────────────────────────────

export function wonFmt(n: number): string {
  return Math.round(n).toLocaleString('ko-KR')
}

export function wonShort(n: number): string {
  if (n >= 100_000_000) return (n / 100_000_000).toFixed(n % 100_000_000 === 0 ? 0 : 1) + '억'
  if (n >= 10_000) {
    const man = Math.round(n / 1_000) / 10
    return man.toLocaleString('ko-KR', { maximumFractionDigits: 1 }) + '만'
  }
  return wonFmt(n)
}

// ── Attendance aggregation ────────────────────────────────────────────────────

export function dayTotal(records: Records, siteId: string, dateStr: string): number {
  const e = records[`${siteId}|${dateStr}`]
  if (!e) return 0
  return Object.values(e).reduce((s, x) => s + x.count, 0)
}

export function dayEntries(records: Records, siteId: string, dateStr: string): DayRecord {
  return records[`${siteId}|${dateStr}`] ?? {}
}

export function allSitesDayTotal(records: Records, siteIds: string[], dateStr: string): number {
  return siteIds.reduce((s, sid) => s + dayTotal(records, sid, dateStr), 0)
}

export function tradeManDays(
  records: Records,
  siteIds: string[],
  fromStr: string,
  toStr: string,
): Record<string, number> {
  const out: Record<string, number> = {}
  const from = parseYmd(fromStr)
  const to = parseYmd(toStr)
  for (const sid of siteIds) {
    let cur = new Date(from)
    while (cur <= to) {
      const e = dayEntries(records, sid, ymd(cur))
      for (const [tid, en] of Object.entries(e)) {
        out[tid] = (out[tid] ?? 0) + en.count
      }
      cur = addDays(cur, 1)
    }
  }
  return out
}

export function withEntry(
  records: Records,
  siteId: string,
  dateStr: string,
  tradeId: string,
  patch: Partial<{ count: number; memo: string }>,
): Records {
  const key = `${siteId}|${dateStr}`
  const prev = records[key] ?? {}
  const entry = { ...(prev[tradeId] ?? { count: 0 }), ...patch }
  if (entry.count === 0 && !entry.memo) {
    const { [tradeId]: _, ...rest } = prev
    return Object.keys(rest).length ? { ...records, [key]: rest } : (() => { const { [key]: __, ...r } = records; return r })()
  }
  return { ...records, [key]: { ...prev, [tradeId]: entry } }
}

// ── Mobile Native Share & Clipboard Fallback ──────────────────────────────────

export async function shareText({
  title,
  text,
  url,
  onSuccess,
  onError,
}: {
  title: string
  text: string
  url?: string
  onSuccess?: (type: 'share' | 'copy') => void
  onError?: (error: unknown) => void
}) {
  const message = url ? `${text}\n\n확인 링크: ${url}` : text

  try {
    const result = await Share.share({
      title: title,
      message: message,
    })

    if (result.action === Share.sharedAction) {
      if (onSuccess) onSuccess('share')
    }
  } catch (err) {
    // 공유 실패 시 클립보드 복사로 Fallback 처리
    try {
      await Clipboard.setStringAsync(message)
      if (onSuccess) onSuccess('copy')
    } catch (clipErr) {
      if (onError) onError(clipErr)
    }
  }
}
