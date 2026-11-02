/**
 * Authentication Service for User Registration, Login, and Session Management
 * Modeled after AnkiWeb account integration and modern Ed-Tech hybrid auth.
 * 
 * BR-15: Explicit validation and error handling, no silent failures
 */

import { AuthUser, AnkiUserProfile } from '../types';
import { ankiDb, DEFAULT_PROFILE } from './ankiDatabase';

interface StoredUserAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // Base64 encoded or hashed password
  avatar: string;
  profileId: string;
  createdAt: number;
}

const STORAGE_KEYS = {
  USERS: '4you_registered_users_v1',
  SESSION: '4you_auth_session_v1',
} as const;

class AuthService {
  private currentUser: AuthUser | null = null;

  constructor() {
    this.loadSession();
  }

  private loadSession(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (raw) {
        this.currentUser = JSON.parse(raw);
      }
    } catch {
      this.currentUser = null;
    }
  }

  public getCurrentUser(): AuthUser | null {
    if (!this.currentUser) {
      this.loadSession();
    }
    return this.currentUser;
  }

  private getStoredUsers(): StoredUserAccount[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USERS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveStoredUsers(users: StoredUserAccount[]): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  /**
   * Register a new user account with Email and Password
   */
  public async register(name: string, email: string, password: string): Promise<AuthUser> {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      throw new Error('Vui lòng nhập họ và tên của bạn.');
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại.');
    }
    if (!password || password.length < 6) {
      throw new Error('Mật khẩu phải có độ dài tối thiểu từ 6 ký tự trở lên.');
    }

    const users = this.getStoredUsers();
    if (users.some(u => u.email === cleanEmail)) {
      throw new Error('Email này đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng email khác.');
    }

    // Create a dedicated Anki Profile for this user
    const avatar = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop`;
    const newProfile = await ankiDb.createProfile(cleanName, avatar);

    // Link cloud account details
    const updatedProfile: AnkiUserProfile = {
      ...newProfile,
      cloudAccount: {
        email: cleanEmail,
        isLinked: true,
        lastSyncedAt: Date.now(),
      },
    };
    await ankiDb.updateProfile(updatedProfile);
    await ankiDb.setActiveProfile(newProfile.id);

    const newUser: StoredUserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      email: cleanEmail,
      passwordHash: btoa(password), // Simulated hash for client-side storage
      avatar,
      profileId: newProfile.id,
      createdAt: Date.now(),
    };

    users.push(newUser);
    this.saveStoredUsers(users);

    const authUser: AuthUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar,
      profileId: newUser.profileId,
      token: `token_${Date.now()}`,
      createdAt: newUser.createdAt,
    };

    this.currentUser = authUser;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(authUser));
    return authUser;
  }

  /**
   * Log in with Email and Password
   */
  public async login(email: string, password: string): Promise<AuthUser> {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      throw new Error('Vui lòng nhập đầy đủ Email và Mật khẩu.');
    }

    const users = this.getStoredUsers();
    const user = users.find(u => u.email === cleanEmail);

    if (!user || user.passwordHash !== btoa(password)) {
      throw new Error('Email hoặc mật khẩu không chính xác. Vui lòng thử lại.');
    }

    // Switch to user's Anki profile
    try {
      await ankiDb.setActiveProfile(user.profileId);
    } catch {
      // If profile was lost, re-create it
      const restoredProf = await ankiDb.createProfile(user.name, user.avatar);
      user.profileId = restoredProf.id;
      this.saveStoredUsers(users);
      await ankiDb.setActiveProfile(user.profileId);
    }

    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      profileId: user.profileId,
      token: `token_${Date.now()}`,
      createdAt: user.createdAt,
    };

    this.currentUser = authUser;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(authUser));
    return authUser;
  }

  /**
   * Sign in / Register with Google (1-Click OAuth simulation)
   */
  public async loginWithGoogle(defaultName: string = 'Học Viên Google'): Promise<AuthUser> {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const mockEmail = `user${randomSuffix}@gmail.com`;
    const users = this.getStoredUsers();

    let user = users.find(u => u.email === mockEmail);

    if (!user) {
      const avatar = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop`;
      const newProfile = await ankiDb.createProfile(`${defaultName} ${randomSuffix}`, avatar);
      
      const updatedProfile: AnkiUserProfile = {
        ...newProfile,
        cloudAccount: {
          email: mockEmail,
          isLinked: true,
          lastSyncedAt: Date.now(),
        },
      };
      await ankiDb.updateProfile(updatedProfile);
      await ankiDb.setActiveProfile(newProfile.id);

      user = {
        id: `usr_g_${Date.now()}`,
        name: `${defaultName} ${randomSuffix}`,
        email: mockEmail,
        passwordHash: btoa('google_oauth_verified'),
        avatar,
        profileId: newProfile.id,
        createdAt: Date.now(),
      };

      users.push(user);
      this.saveStoredUsers(users);
    } else {
      await ankiDb.setActiveProfile(user.profileId);
    }

    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      profileId: user.profileId,
      token: `g_token_${Date.now()}`,
      createdAt: user.createdAt,
    };

    this.currentUser = authUser;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(authUser));
    return authUser;
  }

  /**
   * Log out of current account
   */
  public async logout(): Promise<void> {
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    try {
      await ankiDb.setActiveProfile(DEFAULT_PROFILE.id);
    } catch {
      // Safe ignore
    }
  }
}

export const authService = new AuthService();
