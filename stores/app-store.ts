import { create } from 'zustand'
import type { AppUser, Journal, Journals, Records, Site, Trade, UserType, WorkerRecord, WorkerSite, DayRecord } from '../lib/types'
import { withEntry } from '../lib/utils'
import { auth, db } from '../lib/firebase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile as updateAuthProfile,
  User as FirebaseUser
} from 'firebase/auth'
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore'

interface AppState {
  authed: boolean
  user: AppUser
  sites: Site[]
  trades: Trade[]
  records: Records
  journals: Journals
  workerSites: WorkerSite[]
  workerRecords: WorkerRecord[]
  toast: string
  authInitialized: boolean

  // auth
  login: (email: string, pass: string) => Promise<void>
  registerUser: (email: string, pass: string, name: string) => Promise<void>
  resetPasswordEmail: (email: string) => Promise<void>
  switchUserType: (type: UserType) => Promise<void>
  logout: () => Promise<void>
  fetchData: () => Promise<void>
  updateProfile: (patch: { name: string; phone?: string; bank?: string; account?: string; holder?: string }) => Promise<void>

  // sites CRUD
  addSite: (site: Omit<Site, 'id'>) => Promise<void>
  updateSite: (site: Site) => Promise<void>
  deleteSite: (id: string) => Promise<void>

  // trades CRUD
  addTrade: (trade: Omit<Trade, 'id'>) => Promise<void>
  updateTrade: (trade: Trade) => Promise<void>
  deleteTrade: (id: string) => Promise<void>

  // attendance
  setAttendance: (siteId: string, dateStr: string, tradeId: string, patch: Partial<{ count: number; memo: string }>) => Promise<void>

  // journal
  setJournal: (siteId: string, dateStr: string, patch: Partial<Journal>) => Promise<void>

  // worker ledger
  addWorkerSite: (site: Omit<WorkerSite, 'id'>) => Promise<void>
  updateWorkerSite: (site: WorkerSite) => Promise<void>
  deleteWorkerSite: (id: string) => Promise<void>
  addWorkerRecord: (record: Omit<WorkerRecord, 'id'>) => Promise<void>
  updateWorkerRecord: (record: WorkerRecord) => Promise<void>
  deleteWorkerRecord: (id: string) => Promise<void>

  // toast
  flash: (message: string) => void

  // realtime listeners
  unsubscribes: (() => void)[]
  setupRealtimeListeners: () => void
  cleanupRealtimeListeners: () => void

  // theme
  theme: 'light' | 'dark'
  initTheme: () => Promise<void>
  toggleTheme: () => Promise<void>
}

const EMPTY_USER: AppUser = {
  id: '',
  org_id: '',
  type: 'manager',
  name: '',
  role: '',
  email: '',
  avatar: '',
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export const useAppStore = create<AppState>((set, get) => ({
  authed: false,
  user: EMPTY_USER,
  sites: [],
  trades: [],
  records: {},
  journals: {},
  workerSites: [],
  workerRecords: [],
  toast: '',
  authInitialized: false,
  unsubscribes: [],
  theme: 'light',

  login: async (email, pass) => {
    await signInWithEmailAndPassword(auth, email, pass)
  },

  registerUser: async (email, pass, name) => {
    const credential = await createUserWithEmailAndPassword(auth, email, pass)
    const uid = credential.user.uid
    // Auth profile displayName 동기화
    await updateAuthProfile(credential.user, { displayName: name })
    // Firestore 사용자 문서 기본값 생성
    await setDoc(doc(db, 'users', uid), {
      name,
      email,
      type: 'manager',
      joined: new Date().toISOString().slice(0, 7)
    })
  },

  resetPasswordEmail: async (email) => {
    await sendPasswordResetEmail(auth, email)
  },

  switchUserType: async (type) => {
    const uid = get().user.id
    if (!uid) return
    
    // Firestore에 활성 모드 업데이트
    await updateDoc(doc(db, 'users', uid), { type })
    
    set((s) => ({
      user: {
        ...s.user,
        type,
        role: type === 'worker' ? '노동자' : '관리자'
      }
    }))
  },

  logout: async () => {
    get().cleanupRealtimeListeners()
    await AsyncStorage.removeItem('sitelog_user_hint')
    await signOut(auth)
  },

  setupRealtimeListeners: () => {
    const uid = get().user.id
    if (!uid) return

    get().cleanupRealtimeListeners()

    const unsubs: (() => void)[] = []

    try {
      const sitesUnsub = onSnapshot(collection(db, 'users', uid, 'sites'), (snapshot: QuerySnapshot<DocumentData>) => {
        const sitesList: Site[] = []
        snapshot.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
          sitesList.push({ id: d.id, ...d.data() } as Site)
        })
        set({ sites: sitesList })
      }, (err: Error) => console.error('Sites sync error:', err))
      unsubs.push(sitesUnsub)

      const tradesUnsub = onSnapshot(collection(db, 'users', uid, 'trades'), (snapshot: QuerySnapshot<DocumentData>) => {
        const tradesList: Trade[] = []
        snapshot.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
          tradesList.push({ id: d.id, ...d.data() } as Trade)
        })
        set({ trades: tradesList })
      }, (err: Error) => console.error('Trades sync error:', err))
      unsubs.push(tradesUnsub)

      const recordsUnsub = onSnapshot(collection(db, 'users', uid, 'records'), (snapshot: QuerySnapshot<DocumentData>) => {
        const recordsObj: Records = {}
        snapshot.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
          recordsObj[d.id] = d.data() as DayRecord
        })
        set({ records: recordsObj })
      }, (err: Error) => console.error('Records sync error:', err))
      unsubs.push(recordsUnsub)

      const journalsUnsub = onSnapshot(collection(db, 'users', uid, 'journals'), (snapshot: QuerySnapshot<DocumentData>) => {
        const journalsObj: Journals = {}
        snapshot.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
          journalsObj[d.id] = d.data() as Journal
        })
        set({ journals: journalsObj })
      }, (err: Error) => console.error('Journals sync error:', err))
      unsubs.push(journalsUnsub)

      const workerSitesUnsub = onSnapshot(collection(db, 'users', uid, 'workerSites'), (snapshot: QuerySnapshot<DocumentData>) => {
        const workerSitesList: WorkerSite[] = []
        snapshot.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
          workerSitesList.push({ id: d.id, ...d.data() } as WorkerSite)
        })
        set({ workerSites: workerSitesList })
      }, (err: Error) => console.error('WorkerSites sync error:', err))
      unsubs.push(workerSitesUnsub)

      const workerRecordsUnsub = onSnapshot(collection(db, 'users', uid, 'workerRecords'), (snapshot: QuerySnapshot<DocumentData>) => {
        const workerRecordsList: WorkerRecord[] = []
        snapshot.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
          workerRecordsList.push({ id: d.id, ...d.data() } as WorkerRecord)
        })
        set({ workerRecords: workerRecordsList })
      }, (err: Error) => console.error('WorkerRecords sync error:', err))
      unsubs.push(workerRecordsUnsub)

      set({ unsubscribes: unsubs })
    } catch (e) {
      console.error('Error setting up realtime listeners:', e)
    }
  },

  cleanupRealtimeListeners: () => {
    const unsubs = get().unsubscribes
    if (unsubs && unsubs.length > 0) {
      unsubs.forEach((unsub) => {
        try {
          unsub()
        } catch (e) {
          console.error('Error unsubscribing listener:', e)
        }
      })
    }
    set({ unsubscribes: [] })
  },

  fetchData: async () => {
    const uid = get().user.id
    if (!uid) return

    // 1. Sites 로드
    const sitesSnapshot = await getDocs(collection(db, 'users', uid, 'sites'))
    const sitesList: Site[] = []
    sitesSnapshot.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
      sitesList.push({ id: d.id, ...d.data() } as Site)
    })

    // 2. 나머지 데이터 정상 조회
    const tradesSnapshot = await getDocs(collection(db, 'users', uid, 'trades'))
    const tradesList: Trade[] = []
    tradesSnapshot.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
      tradesList.push({ id: d.id, ...d.data() } as Trade)
    })

    const recordsSnapshot = await getDocs(collection(db, 'users', uid, 'records'))
    const recordsObj: Records = {}
    recordsSnapshot.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
      recordsObj[d.id] = d.data() as DayRecord
    })

    const journalsSnapshot = await getDocs(collection(db, 'users', uid, 'journals'))
    const journalsObj: Journals = {}
    journalsSnapshot.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
      journalsObj[d.id] = d.data() as Journal
    })

    const workerSitesSnapshot = await getDocs(collection(db, 'users', uid, 'workerSites'))
    const workerSitesList: WorkerSite[] = []
    workerSitesSnapshot.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
      workerSitesList.push({ id: d.id, ...d.data() } as WorkerSite)
    })

    const workerRecordsSnapshot = await getDocs(collection(db, 'users', uid, 'workerRecords'))
    const workerRecordsList: WorkerRecord[] = []
    workerRecordsSnapshot.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
      workerRecordsList.push({ id: d.id, ...d.data() } as WorkerRecord)
    })

    set({
      sites: sitesList,
      trades: tradesList,
      records: recordsObj,
      journals: journalsObj,
      workerSites: workerSitesList,
      workerRecords: workerRecordsList,
    })
  },

  addSite: async (site) => {
    const uid = get().user.id
    if (!uid) return
    const newSite: Site = { ...site, id: createId('site') }
    await setDoc(doc(db, 'users', uid, 'sites', newSite.id), newSite)
    set((s) => ({ sites: [...s.sites, newSite] }))
  },

  updateSite: async (site) => {
    const uid = get().user.id
    if (!uid) return
    await setDoc(doc(db, 'users', uid, 'sites', site.id), site)
    set((s) => ({ sites: s.sites.map((x) => (x.id === site.id ? site : x)) }))
  },

  deleteSite: async (id) => {
    const uid = get().user.id
    if (!uid) return
    
    // Firestore 삭제
    await deleteDoc(doc(db, 'users', uid, 'sites', id))
    
    // 관련된 하위 기록 삭제 처리
    const newRecords = Object.fromEntries(Object.entries(get().records).filter(([key]) => !key.startsWith(`${id}|`)))
    const newJournals = Object.fromEntries(Object.entries(get().journals).filter(([key]) => !key.startsWith(`${id}|`)))
    
    set({
      sites: get().sites.filter((x) => x.id !== id),
      records: newRecords,
      journals: newJournals
    })
  },

  addTrade: async (trade) => {
    const uid = get().user.id
    if (!uid) return
    const newTrade: Trade = { ...trade, id: createId('trade') }
    await setDoc(doc(db, 'users', uid, 'trades', newTrade.id), newTrade)
    set((s) => ({ trades: [...s.trades, newTrade] }))
  },

  updateTrade: async (trade) => {
    const uid = get().user.id
    if (!uid) return
    await setDoc(doc(db, 'users', uid, 'trades', trade.id), trade)
    set((s) => ({ trades: s.trades.map((x) => (x.id === trade.id ? trade : x)) }))
  },

  deleteTrade: async (id) => {
    const uid = get().user.id
    if (!uid) return

    await deleteDoc(doc(db, 'users', uid, 'trades', id))

    const records = Object.fromEntries(
      Object.entries(get().records)
        .map(([key, day]) => {
          const { [id]: _, ...rest } = day
          return [key, rest] as const
        })
        .filter(([, day]) => Object.keys(day).length > 0),
    )

    set({
      trades: get().trades.filter((x) => x.id !== id),
      records,
    })
  },

  setAttendance: async (siteId, dateStr, tradeId, patch) => {
    const uid = get().user.id
    if (!uid) return

    const key = `${siteId}|${dateStr}`
    const nextRecords = withEntry(get().records, siteId, dateStr, tradeId, patch)
    const dayRecord = nextRecords[key]

    if (dayRecord && Object.keys(dayRecord).length > 0) {
      await setDoc(doc(db, 'users', uid, 'records', key), dayRecord)
    } else {
      await deleteDoc(doc(db, 'users', uid, 'records', key))
    }

    set({ records: nextRecords })
  },

  setJournal: async (siteId, dateStr, patch) => {
    const uid = get().user.id
    if (!uid) return

    const key = `${siteId}|${dateStr}`
    const prev = get().journals[key] ?? { title: '', body: '', memo: '', photos: [] }
    const next = { ...prev, ...patch }
    const body = next.body ?? next.memo ?? ''
    const photoCount = next.photos?.length ?? 0

    if (!next.title && !body && photoCount === 0) {
      await deleteDoc(doc(db, 'users', uid, 'journals', key))
      set((s) => {
        const { [key]: _, ...rest } = s.journals
        return { journals: rest }
      })
    } else {
      await setDoc(doc(db, 'users', uid, 'journals', key), next)
      set((s) => ({
        journals: {
          ...s.journals,
          [key]: next,
        },
      }))
    }
  },

  addWorkerSite: async (site) => {
    const uid = get().user.id
    if (!uid) return
    const newSite: WorkerSite = { ...site, id: createId('worker-site') }
    await setDoc(doc(db, 'users', uid, 'workerSites', newSite.id), newSite)
    set((s) => ({ workerSites: [...s.workerSites, newSite] }))
  },

  updateWorkerSite: async (site) => {
    const uid = get().user.id
    if (!uid) return
    await setDoc(doc(db, 'users', uid, 'workerSites', site.id), site)
    set((s) => ({ workerSites: s.workerSites.map((x) => (x.id === site.id ? site : x)) }))
  },

  deleteWorkerSite: async (id) => {
    const uid = get().user.id
    if (!uid) return

    await deleteDoc(doc(db, 'users', uid, 'workerSites', id))
    
    set((s) => ({
      workerSites: s.workerSites.filter((x) => x.id !== id),
      workerRecords: s.workerRecords.filter((x) => x.siteId !== id),
    }))
  },

  addWorkerRecord: async (record) => {
    const uid = get().user.id
    if (!uid) return
    const newRecord: WorkerRecord = { ...record, id: createId('worker-record') }
    await setDoc(doc(db, 'users', uid, 'workerRecords', newRecord.id), newRecord)
    set((s) => ({ workerRecords: [...s.workerRecords, newRecord] }))
  },

  updateWorkerRecord: async (record) => {
    const uid = get().user.id
    if (!uid) return
    await setDoc(doc(db, 'users', uid, 'workerRecords', record.id), record)
    set((s) => ({ workerRecords: s.workerRecords.map((x) => (x.id === record.id ? record : x)) }))
  },

  deleteWorkerRecord: async (id) => {
    const uid = get().user.id
    if (!uid) return
    await deleteDoc(doc(db, 'users', uid, 'workerRecords', id))
    set((s) => ({ workerRecords: s.workerRecords.filter((x) => x.id !== id) }))
  },

  updateProfile: async (patch) => {
    const uid = get().user.id
    if (!uid) return

    await updateDoc(doc(db, 'users', uid), {
      name: patch.name,
      phone: patch.phone || '',
      bank: patch.bank || '',
      account: patch.account || '',
      holder: patch.holder || ''
    })

    // Auth profile displayName 동기화
    if (auth.currentUser) {
      await updateAuthProfile(auth.currentUser, { displayName: patch.name })
    }

    set((s) => ({
      user: {
        ...s.user,
        name: patch.name,
        phone: patch.phone || '',
        avatar: patch.name ? patch.name[0] : s.user.avatar,
        bank: patch.bank || '',
        account: patch.account || '',
        holder: patch.holder || ''
      },
    }))
  },

  flash: (message) => {
    set({ toast: message })
    setTimeout(() => set({ toast: '' }), 1800)
  },

  initTheme: async () => {
    const saved = await AsyncStorage.getItem('sitelog_theme') as 'light' | 'dark' | null
    const initialTheme = saved || 'light'
    set({ theme: initialTheme })
  },

  toggleTheme: async () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light'
    set({ theme: nextTheme })
    await AsyncStorage.setItem('sitelog_theme', nextTheme)
  },
}))

// Firebase Auth 실시간 리스너 작동 (React Native 특성 상 항상 구동)
useAppStore.getState().initTheme()

onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
  if (firebaseUser) {
    try {
      const docRef = doc(db, 'users', firebaseUser.uid)
      const docSnap = await getDoc(docRef)
      
      let userData: AppUser = EMPTY_USER
      if (docSnap.exists()) {
        const data = docSnap.data()
        userData = {
          id: firebaseUser.uid,
          org_id: firebaseUser.uid, // 회원별 독립 org_id 제공
          type: data.type || 'manager',
          name: data.name || '',
          role: data.type === 'worker' ? '노동자' : '관리자',
          email: firebaseUser.email || '',
          avatar: data.name ? data.name[0] : 'U',
          phone: data.phone || '',
          company: data.company || '',
          joined: data.joined || '',
          bank: data.bank || '',
          account: data.account || '',
          holder: data.holder || '',
        }
      } else {
        const fallbackName = firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : '사용자')
        userData = {
          id: firebaseUser.uid,
          org_id: firebaseUser.uid,
          type: 'manager',
          name: fallbackName,
          role: '관리자',
          email: firebaseUser.email || '',
          avatar: fallbackName[0].toUpperCase(),
          phone: '',
          company: '',
          joined: new Date().toISOString().slice(0, 7)
        }
        await setDoc(docRef, {
          name: userData.name,
          email: userData.email,
          type: userData.type,
          joined: userData.joined
        })
      }

      // 1. 유저 상태를 먼저 설정하여 uid를 확보합니다.
      useAppStore.setState({
        authed: true,
        user: userData
      })
      
      await AsyncStorage.setItem('sitelog_user_hint', JSON.stringify(userData))
      
      // 2. 실시간 동기화 리스너를 실행합니다.
      useAppStore.getState().setupRealtimeListeners()

      // 3. 로딩이 완료되었음을 설정합니다.
      useAppStore.setState({
        authInitialized: true
      })
    } catch (e) {
      console.error('Error fetching user profile:', e)
      useAppStore.setState({
        authInitialized: true
      })
    }
  } else {
    useAppStore.getState().cleanupRealtimeListeners()
    await AsyncStorage.removeItem('sitelog_user_hint')
    useAppStore.setState({
      authed: false,
      user: EMPTY_USER,
      sites: [],
      trades: [],
      records: {},
      journals: {},
      workerSites: [],
      workerRecords: [],
      authInitialized: true
    })
  }
})
