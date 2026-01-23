export declare const msalScopes: string[];
export declare const msalInstance: MsalInstance;
export declare function updateMsalUi(): void;
export declare function msalLogin(): Promise<void>;
export declare function msalLogout(): Promise<void>;
export declare function msalAcquireGraphToken(): Promise<string>;
export declare function handleRedirectPromise(): Promise<void>;
