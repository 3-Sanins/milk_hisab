// Firebase Config - APNA REAL CONFIG यहाँ डालो (Firebase Console se le)
const firebaseConfig = {
  apiKey: "AIzaSyCDxI0LiOWrBJdjzUUKEQm41_J02p113Gg",
  authDomain: "milk-hisab-928aa.firebaseapp.com",
  databaseURL: "https://milk-hisab-928aa-default-rtdb.firebaseio.com",
  projectId: "milk-hisab-928aa",
  storageBucket: "milk-hisab-928aa.firebasestorage.app",
  messagingSenderId: "1082898440249",
  appId: "1:1082898440249:web:61313de1ae908566de2de8"
};

// Firebase Initialize (global db export kar rahe hain app.js ke liye)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();