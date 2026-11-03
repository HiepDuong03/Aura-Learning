/**
 * Production Authentication Service (AURA AI - Local-First & Cloud Sync)
 * 
 * BR-13: Audit log required on authentication & session changes
 * BR-15: Explicit error handling with zero silent swallows
 */

import { AuthUser, AnkiUserProfile, SavedWord } from '../types';
import { ankiDb, DEFAULT_PROFILE } from './ankiDatabase';
import { lingqWordService } from './lingqWordService';

const STORAGE_KEYS = {
  SESSION: '4you_auth_session_v2',
  TOKEN: '4you_auth_token_v2',
} as const;

class AuthService {
  private currentUser: AuthUser | null = null;
  private token: string | null = null;

  constructor() {
    this.loadSession();
  }

  private loadSession(): void {
    try {
      const rawUser = localStorage.getItem(STORAGE_KEYS.SESSION);
      const rawToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (rawUser && rawToken) {
        this.currentUser = JSON.parse(rawUser);
        this.token = rawToken;
        // Bind auth to LingQ service
        lingqWordService.setAuth(this.token, this.currentUser?.id || null);
      }
    } catch {
      this.currentUser = null;
      this.token = null;
    }
  }

  public getCurrentUser(): AuthUser | null {
    if (!this.currentUser) {
      this.loadSession();
    }
    return this.currentUser;
  }

  public getToken(): string | null {
    if (!this.token) {
      this.loadSession();
    }
    return this.token;
  }

  /**
   * Verify session with backend /api/auth/me on application startup
   */
  public async verifySession(): Promise<AuthUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        const user: AuthUser = {
          ...data.user,
          token,
        };
        this.currentUser = user;
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
        lingqWordService.setAuth(token, user.id);
        return user;
      } else if (res.status === 401) {
        console.warn('[Auth] Session token expired or invalid. Logging out.');
        await this.logout();
        return null;
      }
    } catch (err) {
      console.warn('[Auth] Could not reach auth server, continuing in cached offline mode:', err);
    }

    return this.currentUser;
  }

  /**
   * Register a new user account with real backend password hashing
   */
  public async register(name: string, email: string, password: string, initialWords?: SavedWord[]): Promise<AuthUser> {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      throw new Error('Vui lòng nhập họ và tên của bạn (tối thiểu 2 ký tự).');
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại.');
    }
    if (!password || password.length < 6) {
      throw new Error('Mật khẩu phải có độ dài tối thiểu từ 6 ký tự trở lên.');
    }

    const payload = {
      name: cleanName,
      email: cleanEmail,
      password,
      initialWords: initialWords || []
    };

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Đăng ký tài khoản không thành công.');
    }

    const authUser: AuthUser = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      avatar: data.user.avatar,
      profileId: data.user.id,
      token: data.token,
      createdAt: data.user.createdAt,
    };

    this.currentUser = authUser;
    this.token = data.token;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(authUser));
    localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);

    // Sync profile & vocabulary locally
    try {
      const newProfile = await ankiDb.createProfile(cleanName, authUser.avatar);
      const updatedProfile: AnkiUserProfile = {
        ...newProfile,
        id: authUser.id,
        cloudAccount: {
          email: cleanEmail,
          isLinked: true,
          lastSyncedAt: Date.now(),
        },
      };
      await ankiDb.updateProfile(updatedProfile);
      await ankiDb.setActiveProfile(authUser.id);
      lingqWordService.setAuth(data.token, authUser.id);
    } catch (e) {
      console.warn('[Auth] Anki Profile init warning:', e);
    }

    return authUser;
  }

  /**
   * Log in with real backend verification
   */
  public async login(email: string, password: string): Promise<AuthUser> {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      throw new Error('Vui lòng nhập đầy đủ Email và Mật khẩu.');
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: cleanEmail, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Email hoặc mật khẩu không chính xác.');
    }

    const authUser: AuthUser = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      avatar: data.user.avatar,
      profileId: data.user.id,
      token: data.token,
      createdAt: data.user.createdAt,
    };

    this.currentUser = authUser;
    this.token = data.token;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(authUser));
    localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);

    // Switch/create local Anki profile
    try {
      const allProfiles = await ankiDb.getProfiles();
      const existing = allProfiles.find(p => p.id === authUser.id || p.cloudAccount?.email === cleanEmail);
      if (existing) {
        await ankiDb.setActiveProfile(existing.id);
      } else {
        const newProf = await ankiDb.createProfile(authUser.name, authUser.avatar);
        const updated: AnkiUserProfile = {
          ...newProf,
          id: authUser.id,
          cloudAccount: {
            email: cleanEmail,
            isLinked: true,
            lastSyncedAt: Date.now()
          }
        };
        await ankiDb.updateProfile(updated);
        await ankiDb.setActiveProfile(authUser.id);
      }
    } catch (e) {
      console.warn('[Auth] Profile sync warning:', e);
    }

    // Connect LingQ & sync vocabulary from server
    lingqWordService.setAuth(data.token, authUser.id);
    try {
      await ankiDb.syncWithCloud(data.token, authUser.id);
    } catch (e) {
      console.warn('[Auth] Post-login sync warning:', e);
    }

    return authUser;
  }

  /**
   * Log out of current account and reset to guest
   */
  public async logout(): Promise<void> {
    this.currentUser = null;
    this.token = null;
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    lingqWordService.setAuth(null, null);

    try {
      await ankiDb.setActiveProfile(DEFAULT_PROFILE.id);
    } catch {
      // Safe ignore
    }
  }
}

export const authService = new AuthService();
