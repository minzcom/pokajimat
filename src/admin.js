/**
 * admin.js — Admin entry point
 * Checks auth first. If not logged in, shows login form.
 * If logged in as admin, dynamically imports AdminView (keeps it out of guest bundle).
 */

import { onAuthChange, signIn, signOut, isAdmin } from './data/firestore.js';

const loginScreen = document.getElementById('login-screen');
const adminApp    = document.getElementById('admin-app');
const loginForm   = document.getElementById('login-form');
const loginError  = document.getElementById('login-error');
const loginBtn    = document.getElementById('login-btn');
const loginSpinner= document.getElementById('login-spinner');
const loginBtnTxt = document.getElementById('login-btn-text');

function showLogin(msg = '') {
  loginScreen.style.display = 'flex';
  adminApp.classList.remove('ready');
  if (msg) { loginError.textContent = msg; loginError.classList.remove('d-none'); }
  else      { loginError.classList.add('d-none'); }
}

function setLoginLoading(on) {
  loginBtn.disabled = on;
  loginSpinner.classList.toggle('d-none', !on);
  loginBtnTxt.textContent = on ? 'Signing in…' : 'Sign In';
}

// ── Login form handler ─────────────────────────────────────
loginForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const email    = "takde_apeponlahsini@pimainjauh2.haha";
  const password = document.getElementById('login-password').value;
  setLoginLoading(true);
  try {
    const cred = await signIn(email, password);
    if (!isAdmin(cred.user)) {
      await signOut();
      showLogin('Access denied. This account is not an admin.');
    }
  } catch (err) {
    showLogin(err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
      ? 'Incorrect password.'
      : err.message);
  } finally {
    setLoginLoading(false);
  }
});

// ── Auth state listener ────────────────────────────────────
onAuthChange(async (user) => {
  if (user && isAdmin(user)) {
    loginScreen.style.display = 'none';
    adminApp.classList.add('ready');
    // Lazy-load admin view — never included in guest bundle
    const { mountAdminView } = await import('./pages/AdminView.js');
    mountAdminView(user);
  } else {
    showLogin();
  }
});
