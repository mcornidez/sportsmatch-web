import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AuthContextType = {
  isAuthenticated: boolean;
  clubId: number | null;
  login: (apiKey?: string, clubId?: number) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  const [clubId, setClubId] = useState<number | null>(() => {
    const savedClubId = localStorage.getItem('clubId');
    return savedClubId ? parseInt(savedClubId) : null;
  });

  const login = (apiKey?: string, clubId?: number) => {
    setIsAuthenticated(true);
    localStorage.setItem('isAuthenticated', 'true');

    if (apiKey) {
      localStorage.setItem('c-api-key', apiKey);
    }

    if (clubId) {
      setClubId(clubId);
      localStorage.setItem('clubId', clubId.toString());
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setClubId(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('c-api-key');
    localStorage.removeItem('clubId');
  };

  useEffect(() => {
    localStorage.setItem('isAuthenticated', isAuthenticated.toString());
  }, [isAuthenticated]);

  return (
      <AuthContext.Provider value={{ isAuthenticated, clubId, login, logout }}>
        {children}
      </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
