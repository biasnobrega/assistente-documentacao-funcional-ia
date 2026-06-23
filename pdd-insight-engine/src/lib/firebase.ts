import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

let loginInProgress = false;

export const loginWithGoogle = async () => {
  if (loginInProgress) return;
  loginInProgress = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
      console.warn('Login cancelled by user or multiple requests.');
      return null;
    }
    console.error('Login error:', error);
    throw error;
  } finally {
    loginInProgress = false;
  }
};

export const logout = () => signOut(auth);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Also show an alert so the user knows why it failed
  if (message.includes('permission')) {
    alert(`Erro de permissão no Firestore (${operationType} em ${path}). Verifique se você está logado corretamente.`);
  } else if (message.includes('index')) {
    console.warn('Index missing for query. Falling back to simple query.');
  } else {
    alert(`Erro no Banco de Dados: ${message}`);
  }
  
  throw new Error(JSON.stringify(errInfo));
}

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'service', 'connection-test'));
    console.log('Firebase connection healthy');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Firebase offline or permission error');
    }
  }
}
testConnection();
