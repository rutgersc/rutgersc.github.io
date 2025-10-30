import { initWatchLater, watchLaterTaskId, loadWatchLater } from './watch-later.js';

// MSAL Configuration
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const redirectUri = isLocalhost
  ? `http://${window.location.hostname}:8000/youtube.html`
  : 'https://rutgersc.github.io/youtube.html';

const msalConfig = {
  auth: {
    clientId: '57f0a441-626f-433e-b375-0c81f1203567',
    authority: 'https://login.microsoftonline.com/consumers',
    redirectUri: redirectUri
  },
  cache: { cacheLocation: 'localStorage', storeAuthStateInCookie: false }
};

export const msalScopes = ['openid', 'profile', 'offline_access', 'User.Read', 'Tasks.ReadWrite'];
export const msalInstance = new msal.PublicClientApplication(msalConfig);

export function updateMsalUi() {
  const btn = document.getElementById('msal-login-btn');
  const status = document.getElementById('msal-login-status');
  const userInfo = document.getElementById('msal-user-info');
  const userName = document.getElementById('msal-user-name');
  const userEmail = document.getElementById('msal-user-email');
  if (!btn || !status) return;
  const account = msalInstance.getActiveAccount();
  if (account) {
    btn.textContent = 'Sign out';
    btn.style.color = '#ff6b6b';
    status.textContent = 'Signed in';

    // Log complete user info to console
    console.log('=== MSAL User Account Info ===');
    console.log('Complete account object:', account);
    console.log('Name:', account.name);
    console.log('Username:', account.username);
    console.log('Local Account ID:', account.localAccountId);
    console.log('Home Account ID:', account.homeAccountId);
    console.log('Environment:', account.environment);
    console.log('Tenant ID:', account.tenantId);
    console.log('ID Token Claims:', account.idTokenClaims);
    console.log('==============================');

    // Show user info
    if (userInfo && userName && userEmail) {
      userName.textContent = account.name || 'User';
      userEmail.textContent = account.username || '';
      userInfo.style.display = 'block';
    }

    // Initialize watch later when signed in
    if (!watchLaterTaskId) {
      initWatchLater().catch(e => console.error('Failed to init watch later:', e));
    }
  } else {
    btn.textContent = 'Sign in';
    btn.style.color = '#8ecae6';
    status.textContent = 'Signed out';

    // Hide user info
    if (userInfo) {
      userInfo.style.display = 'none';
    }
  }
}

function showMsalError(error) {
  const errorDiv = document.getElementById('msal-error');
  const errorMessage = document.getElementById('msal-error-message');
  if (errorDiv && errorMessage) {
    errorMessage.textContent = error.message || error.toString();
    errorDiv.style.display = 'block';

    // Also log complete error details to console
    console.error('=== MSAL Error Details ===');
    console.error('Error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.errorCode);
    console.error('Error stack:', error.stack);
    console.error('=========================');
  }
}

function hideMsalError() {
  const errorDiv = document.getElementById('msal-error');
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
}

export async function msalLogin() {
  hideMsalError();
  try {
    const forceMobileCheckbox = document.getElementById('msal-force-mobile');
    const useMobileFlow = forceMobileCheckbox ? forceMobileCheckbox.checked : false;

    if (useMobileFlow) {
      // Use redirect flow (mobile behavior)
      await msalInstance.loginRedirect({ scopes: msalScopes });
      // Note: control won't return here - page will redirect
    } else {
      // Use popup flow (desktop behavior)
      const res = await msalInstance.loginPopup({ scopes: msalScopes });
      msalInstance.setActiveAccount(res.account);
      updateMsalUi();
    }
  } catch (e) {
    console.warn('msalLogin failed', e);
    showMsalError(e);
  }
}

export async function msalLogout() {
  hideMsalError();
  try {
    const account = msalInstance.getActiveAccount();
    const forceMobileCheckbox = document.getElementById('msal-force-mobile');
    const useMobileFlow = forceMobileCheckbox ? forceMobileCheckbox.checked : false;

    if (useMobileFlow) {
      // Use redirect flow (mobile behavior)
      await msalInstance.logoutRedirect({ account });
      // Note: control won't return here - page will redirect
    } else {
      // Use popup flow (desktop behavior)
      await msalInstance.logoutPopup({ account });
      updateMsalUi();
    }
  } catch (e) {
    console.warn('msalLogout failed', e);
    showMsalError(e);
  }
}

export async function msalAcquireGraphToken() {
  const account = msalInstance.getActiveAccount();
  try {
    if (!account) throw new Error('No signed-in account');
    const res = await msalInstance.acquireTokenSilent({ scopes: msalScopes, account });
    return res.accessToken;
  } catch (e) {
    console.warn('acquireTokenSilent failed, using interactive flow', e);

    // Check if using mobile flow
    const forceMobileCheckbox = document.getElementById('msal-force-mobile');
    const useMobileFlow = forceMobileCheckbox ? forceMobileCheckbox.checked : false;

    if (useMobileFlow) {
      // Use redirect flow - store what we're doing for after redirect
      sessionStorage.setItem('msal-acquiring-token', 'true');
      await msalInstance.acquireTokenRedirect({ scopes: msalScopes });
      // Note: control won't return here - page will redirect
      throw new Error('Redirecting for token acquisition');
    } else {
      // Use popup flow
      const res = await msalInstance.acquireTokenPopup({ scopes: msalScopes });
      msalInstance.setActiveAccount(res.account);
      updateMsalUi();
      return res.accessToken;
    }
  }
}

export async function handleRedirectPromise() {
  try {
    const response = await msalInstance.handleRedirectPromise();
    if (response && response.account) {
      msalInstance.setActiveAccount(response.account);

      // Check if we were acquiring a token
      const wasAcquiringToken = sessionStorage.getItem('msal-acquiring-token');
      if (wasAcquiringToken === 'true') {
        sessionStorage.removeItem('msal-acquiring-token');
        console.log('Token acquisition redirect completed, retrying watch later load');
        // Retry loading watch later after token acquisition
        if (watchLaterTaskId) {
          loadWatchLater().catch(e => console.error('Failed to load watch later after redirect:', e));
        } else {
          initWatchLater().catch(e => console.error('Failed to init watch later after redirect:', e));
        }
      }
    } else {
      const accounts = msalInstance.getAllAccounts();
      if (accounts && accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
      }
    }
  } catch (err) {
    console.warn('handleRedirectPromise error', err);
  } finally {
    updateMsalUi();
  }
}
