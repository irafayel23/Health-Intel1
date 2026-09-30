// Public Firebase client initialization used by Google verification.
// Classic script: load through index.html; cross-feature functions share its page scope.

      lucide.createIcons();

      const firebaseConfig = {
        apiKey: "AIzaSyA0oMqNoeAhihnrC82_BCYitEyM7xecDIE",
        authDomain: "health-intel-2a0ed.firebaseapp.com",
        projectId: "health-intel-2a0ed",
        storageBucket: "health-intel-2a0ed.firebasestorage.app",
        messagingSenderId: "568295909990",
        appId: "1:568295909990:web:7852352967a13e5ac01ba7",
      };
      firebase.initializeApp(firebaseConfig);
      const auth = firebase.auth();
