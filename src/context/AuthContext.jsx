import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getCurrentUser,
  login as loginUser,
  logout as logoutUser,
} from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser().then((currentUser) => {
      if (!cancelled) {
        setUser(currentUser);
        setIsAuthReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAuthReady,
      login: async (email, password) => {
        const result = await loginUser(email, password);

        if (result.success) {
          setUser(result.user);
        }

        return result;
      },
      logout: async () => {
        await logoutUser();
        setUser(null);
      },
      refreshUser: async () => {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        return currentUser;
      },
    }),
    [user, isAuthReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
