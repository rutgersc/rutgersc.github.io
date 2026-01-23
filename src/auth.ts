import { initWatchLater, watchLaterTaskId, loadWatchLater } from './watch-later.js';
import { initHistorySync, historyTaskId, isHistorySyncEnabled } from './history-sync.js';

declare global {
  const msal: {
    PublicClientApplication: new (config: MsalConfig) => MsalInstance;
  };

  interface MsalConfig {
    auth: {
      clientId: string;
      authority: string;
      redirectUri: string;
    };
    cache?: {
      cacheLocation?: string;
      storeAuthStateInCookie?: boolean;
    };
  }

  interface MsalInstance {
    getActiveAccount(): MsalAccount | null;
    getAllAccounts(): MsalAccount[];
    setActiveAccount(account: MsalAccount | null): void;
    loginPopup(request: MsalRequest): Promise<MsalResponse>;
    loginRedirect(request: MsalRequest): Promise<void>;
    logoutPopup(request?: MsalLogoutRequest): Promise<void>;
    logoutRedirect(request?: MsalLogoutRequest): Promise<void>;
    acquireTokenSilent(request: MsalSilentRequest): Promise<MsalResponse>;
    acquireTokenPopup(request: MsalRequest): Promise<MsalResponse>;
    acquireTokenRedirect(request: MsalRequest): Promise<void>;
    handleRedirectPromise(): Promise<MsalResponse | null>;
  }

  interface MsalAccount {
    homeAccountId: string;
    localAccountId: string;
    environment: string;
    tenantId: string;
    username: string;
    name?: string;
    idTokenClaims?: Record<string, unknown>;
  }

  interface MsalRequest {
    scopes: string[];
    account?: MsalAccount;
  }

  interface MsalSilentRequest {
    scopes: string[];
    account: MsalAccount;
  }

  interface MsalLogoutRequest {
    account?: MsalAccount | null;
  }

  interface MsalResponse {
    account: MsalAccount;
    accessToken: string;
    idToken?: string;
    scopes: string[];
    expiresOn?: Date;
  }
}

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const redirectUri = isLocalhost
  ? `http://${window.location.hostname}:8000/youtube.html`
  : 'https://rutgersc.github.io/youtube.html';

const msalConfig: MsalConfig = {
  auth: {
    clientId: '57f0a441-626f-433e-b375-0c81f1203567',
    authority: 'https://login.microsoftonline.com/consumers',
    redirectUri: redirectUri
  },
  cache: { cacheLocation: 'localStorage', storeAuthStateInCookie: false }
};

export const msalScopes: string[] = ['openid', 'profile', 'offline_access', 'User.Read', 'Tasks.ReadWrite'];
export const msalInstance: MsalInstance = new msal.PublicClientApplication(msalConfig);

export function updateMsalUi(): void {
  const btn = document.getElementById('msal-login-btn') as HTMLButtonElement | null;
  const status = document.getElementById('msal-login-status') as HTMLElement | null;
  const userInfo = document.getElementById('msal-user-info') as HTMLElement | null;
  const userName = document.getElementById('msal-user-name') as HTMLElement | null;
  const userEmail = document.getElementById('msal-user-email') as HTMLElement | null;
  if (!btn || !status) return;
  const account = msalInstance.getActiveAccount();
  if (account) {
    btn.textContent = 'Sign out';
    btn.style.color = '#ff6b6b';
    status.textContent = 'Signed in';

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

    if (userInfo && userName && userEmail) {
      userName.textContent = account.name || 'User';
      userEmail.textContent = account.username || '';
      userInfo.style.display = 'block';
    }

    if (!watchLaterTaskId) {
      initWatchLater().catch(e => console.error('Failed to init watch later:', e));
    }

    if (!historyTaskId && isHistorySyncEnabled()) {
      initHistorySync().catch(e => console.error('Failed to init history sync:', e));
    }
  } else {
    btn.textContent = 'Sign in';
    btn.style.color = '#8ecae6';
    status.textContent = 'Signed out';

    if (userInfo) {
      userInfo.style.display = 'none';
    }
  }
}

function showMsalError(error: Error): void {
  const errorDiv = document.getElementById('msal-error');
  const errorMessage = document.getElementById('msal-error-message');
  if (errorDiv && errorMessage) {
    errorMessage.textContent = error.message || error.toString();
    errorDiv.style.display = 'block';

    console.error('=== MSAL Error Details ===');
    console.error('Error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('=========================');
  }
}

function hideMsalError(): void {
  const errorDiv = document.getElementById('msal-error');
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
}

export async function msalLogin(): Promise<void> {
  hideMsalError();
  try {
    const forceMobileCheckbox = document.getElementById('msal-force-mobile') as HTMLInputElement | null;
    const useMobileFlow = forceMobileCheckbox ? forceMobileCheckbox.checked : false;

    if (useMobileFlow) {
      await msalInstance.loginRedirect({ scopes: msalScopes });
    } else {
      const res = await msalInstance.loginPopup({ scopes: msalScopes });
      msalInstance.setActiveAccount(res.account);
      updateMsalUi();
    }
  } catch (e) {
    console.warn('msalLogin failed', e);
    showMsalError(e as Error);
  }
}

export async function msalLogout(): Promise<void> {
  hideMsalError();
  try {
    const account = msalInstance.getActiveAccount();
    const forceMobileCheckbox = document.getElementById('msal-force-mobile') as HTMLInputElement | null;
    const useMobileFlow = forceMobileCheckbox ? forceMobileCheckbox.checked : false;

    if (useMobileFlow) {
      await msalInstance.logoutRedirect({ account });
    } else {
      await msalInstance.logoutPopup({ account });
      updateMsalUi();
    }
  } catch (e) {
    console.warn('msalLogout failed', e);
    showMsalError(e as Error);
  }
}

export async function msalAcquireGraphToken(): Promise<string> {
  const account = msalInstance.getActiveAccount();
  try {
    if (!account) throw new Error('No signed-in account');
    const res = await msalInstance.acquireTokenSilent({ scopes: msalScopes, account });
    return res.accessToken;
  } catch (e) {
    console.warn('acquireTokenSilent failed, using interactive flow', e);

    const forceMobileCheckbox = document.getElementById('msal-force-mobile') as HTMLInputElement | null;
    const useMobileFlow = forceMobileCheckbox ? forceMobileCheckbox.checked : false;

    if (useMobileFlow) {
      sessionStorage.setItem('msal-acquiring-token', 'true');
      await msalInstance.acquireTokenRedirect({ scopes: msalScopes });
      throw new Error('Redirecting for token acquisition');
    } else {
      const res = await msalInstance.acquireTokenPopup({ scopes: msalScopes });
      msalInstance.setActiveAccount(res.account);
      updateMsalUi();
      return res.accessToken;
    }
  }
}

export async function handleRedirectPromise(): Promise<void> {
  try {
    const response = await msalInstance.handleRedirectPromise();
    if (response && response.account) {
      msalInstance.setActiveAccount(response.account);

      const wasAcquiringToken = sessionStorage.getItem('msal-acquiring-token');
      if (wasAcquiringToken === 'true') {
        sessionStorage.removeItem('msal-acquiring-token');
        console.log('Token acquisition redirect completed, retrying watch later load');
        if (watchLaterTaskId) {
          loadWatchLater().catch(e => console.error('Failed to load watch later after redirect:', e));
        } else {
          initWatchLater().catch(e => console.error('Failed to init watch later after redirect:', e));
        }
        if (!historyTaskId && isHistorySyncEnabled()) {
          initHistorySync().catch(e => console.error('Failed to init history sync after redirect:', e));
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
