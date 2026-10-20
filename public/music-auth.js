import { api } from './js/api.js';

const dialog = document.querySelector('#music-auth-dialog');
const form = document.querySelector('#music-auth-form');
const errorText = document.querySelector('#music-auth-error');
const accountButton = document.querySelector('#music-account-button');
const accountEmail = document.querySelector('#music-account-email');
let user = null;
let mode = 'login';
let afterLogin = null;
let onChange = () => {};

function setUser(value) {
  user = value;
  accountEmail.textContent = user?.email || '';
  accountButton.textContent = user ? 'Sign out' : 'Sign in';
  onChange();
}

export function musicSignedIn() {
  return Boolean(user);
}

export function requireMusicUser(action) {
  if (user) return true;
  afterLogin = action;
  errorText.textContent = '';
  dialog.showModal();
  return false;
}

export async function initMusicAuth(change) {
  onChange = change;
  accountButton.addEventListener('click', async () => {
    if (!user) return requireMusicUser();
    accountButton.disabled = true;
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      accountEmail.textContent = error.message;
    } finally {
      accountButton.disabled = false;
    }
  });
  document
    .querySelector('#music-auth-close')
    .addEventListener('click', () => dialog.close());
  document.querySelector('#music-auth-switch').addEventListener('click', () => {
    mode = mode === 'login' ? 'register' : 'login';
    document.querySelector('#music-auth-title').textContent =
      mode === 'login' ? 'Welcome back.' : 'Create an account.';
    document.querySelector('#music-auth-submit').textContent =
      mode === 'login' ? 'Sign in' : 'Create account';
    document.querySelector('#music-auth-switch').textContent =
      mode === 'login'
        ? 'New here? Create an account'
        : 'Already have an account? Sign in';
    form.elements.password.autocomplete =
      mode === 'login' ? 'current-password' : 'new-password';
    errorText.textContent = '';
  });
  dialog.addEventListener('close', () => {
    form.reset();
    afterLogin = null;
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = document.querySelector('#music-auth-submit');
    submit.disabled = true;
    errorText.textContent = '';
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
      errorText.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
  try {
    const { data } = await api('/auth/me');
    setUser(data);
  } catch (error) {
    accountEmail.textContent = error.message;
  }
}
