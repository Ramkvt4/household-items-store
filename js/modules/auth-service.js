/**
 * Auth Service
 * Firebase Authentication for admin dashboard
 */

const AuthService = (() => {
  let auth = null;

  function init(firebaseAuth) {
    auth = firebaseAuth;
  }

  function onAuthStateChanged(callback) {
    if (!auth) {
      callback(null);
      return () => {};
    }
    return auth.onAuthStateChanged(callback);
  }

  async function signIn(email, password) {
    if (!auth) throw new Error('Firebase Auth not initialized');

    const credential = await auth.signInWithEmailAndPassword(email, password);
    const user = credential.user;

    if (!FirebaseConfig.isAdminEmail(user.email)) {
      await auth.signOut();
      throw new Error('This account is not authorized for admin access.');
    }

    return user;
  }

  async function signOut() {
    if (auth) await auth.signOut();
  }

  function getCurrentUser() {
    return auth?.currentUser || null;
  }

  function isAdmin(user) {
    return user && FirebaseConfig.isAdminEmail(user.email);
  }

  return {
    init,
    onAuthStateChanged,
    signIn,
    signOut,
    getCurrentUser,
    isAdmin,
  };
})();

if (typeof window !== 'undefined') {
  window.AuthService = AuthService;
}
