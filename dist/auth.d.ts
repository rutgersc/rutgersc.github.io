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
export declare const msalScopes: string[];
export declare const msalInstance: MsalInstance;
export declare function updateMsalUi(): void;
export declare function msalLogin(): Promise<void>;
export declare function msalLogout(): Promise<void>;
export declare function msalAcquireGraphToken(): Promise<string>;
export declare function handleRedirectPromise(): Promise<void>;
