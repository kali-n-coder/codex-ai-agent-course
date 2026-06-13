import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

let runtime = null;

function hasConfig() {
  return Boolean(firebaseConfig?.apiKey && firebaseConfig?.projectId && firebaseConfig?.appId);
}

export function getFirebaseRuntime() {
  if (!hasConfig()) return null;
  if (runtime) return runtime;

  const app = initializeApp(firebaseConfig);
  runtime = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
  };
  return runtime;
}

export function waitForUser(auth) {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function signInAdmin(auth) {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function signOutAdmin(auth) {
  return signOut(auth);
}

export async function loadPublicCourse(db) {
  const snapshot = await getDoc(doc(db, "courses", "public"));
  return snapshot.exists() ? snapshot.data().course : null;
}

export async function loadDraftCourse(db) {
  const snapshot = await getDoc(doc(db, "courses", "draft"));
  return snapshot.exists() ? snapshot.data().course : null;
}

export async function saveDraftCourse(db, course) {
  await setDoc(doc(db, "courses", "draft"), {
    course,
    updatedAt: serverTimestamp(),
  });
}

export async function publishCourse(db, course) {
  const publicCourse = {
    ...course,
    lessons: (course.lessons ?? []).filter((lesson) => lesson.status === "published"),
  };
  await setDoc(doc(db, "courses", "public"), {
    course: publicCourse,
    updatedAt: serverTimestamp(),
  });
}
