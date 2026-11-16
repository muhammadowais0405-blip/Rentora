import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser } from '../types/marketplace';
import {
  addFavorite,
  getCurrentUser,
  getFavorites,
  getNotifications,
  loginWithEmail,
  logoutSession,
  registerDemoAccount,
  removeFavorite,
  switchDemoAccount,
  updateUserProfile,
} from '../lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  favoriteIds: Set<number>;
  unreadNotifications: number;
  isFavorite: (listingId: number) => boolean;
  toggleFavorite: (listingId: number) => Promise<boolean>;
  refreshUserActivity: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<AuthUser>;
  switchDemo: (
    email: 'renter@rentora.demo' | 'owner@rentora.demo' | 'admin@rentora.demo',
  ) => Promise<AuthUser>;
  logout: () => Promise<void>;
  saveProfile: (name: string, phone: string) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const loadUserActivity = useCallback(async (activeUser: AuthUser | null) => {
    if (!activeUser) {
      setFavoriteIds(new Set());
      setUnreadNotifications(0);
      return;
    }
    try {
      const [favs, notif] = await Promise.all([getFavorites(), getNotifications()]);
      setFavoriteIds(new Set(favs.ids));
      setUnreadNotifications(notif.unreadCount);
    } catch {
      // Keep previous state on transient network error
    }
  }, []);

  useEffect(() => {
    getCurrentUser()
      .then(async (u) => {
        setUser(u);
        await loadUserActivity(u);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [loadUserActivity]);

  const refreshUserActivity = useCallback(async () => {
    await loadUserActivity(user);
  }, [loadUserActivity, user]);

  const login = useCallback(
    async (email: string, password: string) => {
      const authed = await loginWithEmail(email, password);
      setUser(authed);
      await loadUserActivity(authed);
      return authed;
    },
    [loadUserActivity],
  );

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; phone?: string }) => {
      const authed = await registerDemoAccount(payload);
      setUser(authed);
      await loadUserActivity(authed);
      return authed;
    },
    [loadUserActivity],
  );

  const switchDemo = useCallback(
    async (email: 'renter@rentora.demo' | 'owner@rentora.demo' | 'admin@rentora.demo') => {
      const authed = await switchDemoAccount(email);
      setUser(authed);
      await loadUserActivity(authed);
      return authed;
    },
    [loadUserActivity],
  );

  const logout = useCallback(async () => {
    await logoutSession();
    setUser(null);
    setFavoriteIds(new Set());
    setUnreadNotifications(0);
  }, []);

  const saveProfile = useCallback(async (name: string, phone: string) => {
    const updated = await updateUserProfile(name, phone);
    setUser(updated);
    return updated;
  }, []);

  const isFavorite = useCallback(
    (listingId: number) => favoriteIds.has(listingId),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    async (listingId: number): Promise<boolean> => {
      if (!user) return false;
      const currentlySaved = favoriteIds.has(listingId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (currentlySaved) {
          next.delete(listingId);
        } else {
          next.add(listingId);
        }
        return next;
      });
      try {
        if (currentlySaved) {
          await removeFavorite(listingId);
          return false;
        }
        await addFavorite(listingId);
        return true;
      } catch (err) {
        // Revert optimistic toggle on failure
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (currentlySaved) {
            next.add(listingId);
          } else {
            next.delete(listingId);
          }
          return next;
        });
        throw err;
      }
    },
    [favoriteIds, user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        favoriteIds,
        unreadNotifications,
        isFavorite,
        toggleFavorite,
        refreshUserActivity,
        login,
        register,
        switchDemo,
        logout,
        saveProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
