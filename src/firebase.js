import { initializeApp } from "firebase/app";
     import { getDatabase } from "firebase/database";

     // แก้ไขค่าต่อไปนี้ให้ตรงกับโปรเจค Firebase ของคุณ
     const firebaseConfig = {
       apiKey: "AIzaSyDlrUJpfzskoXXJL-uvWXtc-aZZFvRKEuM",
       authDomain: "lab6-113c2.firebaseapp.com",
       databaseURL: "https://lab6-113c2-default-rtdb.asia-southeast1.firebasedatabase.app",
       projectId: "lab6-113c2",
       storageBucket: "lab6-113c2.appspot.com",
       //messagingSenderId: "your-messaging-sender-id",
       //appId: "your-app-id"
     };

     // Initialize Firebase
     const app = initializeApp(firebaseConfig);
     const database = getDatabase(app);

     export { database };