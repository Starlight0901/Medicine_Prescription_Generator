import { createContext, useContext, useMemo, useState } from 'react';
import {
  getCurrentUser,
  login as loginUser,
  logout as logoutUser,
} from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser());

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login: (email, password) => {
        const result = loginUser(email, password);

        if (result.success) {
          setUser(result.user);
        }

        return result;
      },
      logout: () => {
        logoutUser();
        setUser(null);
      },
      refreshUser: () => {
        const currentUser = getCurrentUser();
        setUser(currentUser);
        return currentUser;
      },
    }),
    [user]
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
