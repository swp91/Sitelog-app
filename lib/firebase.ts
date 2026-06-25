import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { 
  initializeFirestore, 
  persistentLocalCache,
  getFirestore
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "dummy-api-key-prevent-crash",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "dummy-project.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "dummy-project-id",
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)

// 모바일 환경에 적합한 오프라인 영속성(Firestore Local Cache) 설정
let firestoreDb
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({})
  })
} catch (e) {
  firestoreDb = getFirestore(app)
}

export const db = firestoreDb
export const storage = getStorage(app)
