// Firebase (Compat) - جاهز
const firebaseConfig = {
  apiKey: "AIzaSyBWWJ7NQTQlX4jniHzReR12NfdA-Nu5aos",
  authDomain: "joodkids-2c94b.firebaseapp.com",
  projectId: "joodkids-2c94b",
  storageBucket: "joodkids-2c94b.appspot.com",
  messagingSenderId: "834966570815",
  appId: "1:834966570815:web:49f91287efec295fac758a"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth ? firebase.auth() : null;
const storage = firebase.storage ? firebase.storage() : null;
