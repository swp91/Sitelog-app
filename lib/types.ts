export type SiteStatus = '진행중' | '마감임박' | '완료'
export type UserType = 'manager' | 'worker'
export type PaymentStatus = 'unpaid' | 'paid'

export interface Trade {
  id: string
  name: string
  color: string
  rate: number
  company?: string
  contact?: string
  phone?: string
  sort_order?: number
}

export interface Site {
  id: string
  name: string
  addr?: string
  status: SiteStatus
  start?: string
  manager?: string
}

export interface AttendanceEntry {
  count: number
  memo?: string
}

/** key: tradeId */
export type DayRecord = Record<string, AttendanceEntry>

/** key: "siteId|YYYY-MM-DD" */
export type Records = Record<string, DayRecord>

export interface JournalPhoto {
  id: string
  name: string
  url: string
  size?: number
  type?: string
}

export interface Journal {
  title?: string
  body?: string
  memo?: string
  photos?: JournalPhoto[]
}

/** key: "siteId|YYYY-MM-DD" */
export type Journals = Record<string, Journal>

export interface AppUser {
  id: string
  org_id: string
  type: UserType
  name: string
  role: string
  email: string
  avatar: string
  phone?: string
  company?: string
  joined?: string
  bank?: string
  account?: string
  holder?: string
}

export interface WorkerSite {
  id: string
  name: string
  defaultRate: number
  color: string
  memo?: string
}

export interface WorkerRecord {
  id: string
  date: string
  siteId: string
  manDay: number
  rate: number
  memo?: string
  paymentStatus: PaymentStatus
}
