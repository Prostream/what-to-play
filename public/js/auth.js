import { api } from './api.js';
import { $, message } from './dom.js';

let user = null;
let mode = 'login';
let afterLogin = null;
let onChange;
const dialog = $('#auth-dialog');
const form = $('#auth-form');

function setUser(value) {
  user = value;
  $('#account-email').textContent = user?.email || '';
  $('#account-button').textContent = user ? 'Sign out' : 'Sign in';
  onChange();
}

export function signIn(action) {
  afterLogin = action;
  $('#auth-error').textContent = '';
  dialog.showModal();
}

export function signedIn() {
  return Boolean(user);
}

export function expiredSession() {
  setUser(null);
}

export async function initAuth(change) {
  onChange = change;
  $('#account-button').addEventListener('click', async () => {
    if (!user) return signIn();
    const button = $('#account-button');
    button.disabled = true;
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      $('#app-status').textContent = message(error);
    } finally {
      button.disabled = false;
    }
  });
  $('#auth-switch').addEventListener('click', () => {
    mode = mode === 'login' ? 'register' : 'login';
    $('#auth-title').textContent =
      mode === 'login' ? 'Welcome back.' : 'Your next chapter.';
    $('#auth-description').textContent =
      mode === 'login'
        ? 'Sign in to keep your games in one place.'
        : 'Create an account to save your discoveries.';
    $('#auth-submit').textContent =
      mode === 'login' ? 'Sign in' : 'Create account';
    $('#auth-switch').textContent =
      mode === 'login'
        ? 'New here? Create an account'
        : 'Already have an account? Sign in';
    form.elements.password.autocomplete =
      mode === 'login' ? 'current-password' : 'new-password';
    $('#auth-error').textContent = '';
  });
  dialog.addEventListener('close', () => {
    form.reset();
    afterLogin = null;
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    $('#auth-submit').disabled = true;
    $('#auth-switch').disabled = true;
    $('#auth-error').textContent = '';
    try {
      const { data } = await api(`/auth/${mode}`, {
        method: 'POST',
        body: Object.fromEntries(new FormData(form)),
      });
      const action = afterLogin;
      dialog.close();
      setUser(data);
      if (action) await action();
    } catch (error) {
      $('#auth-error').textContent = message(error);
    } finally {
      $('#auth-submit').disabled = false;
      $('#auth-switch').disabled = false;
    }
  });
  const { data } = await api('/auth/me');
  setUser(data);
}
