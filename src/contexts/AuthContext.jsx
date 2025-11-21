import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    return !!token;
  });
  const [user, setUser] = useState(() => {
    // Try to load user from localStorage
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (userData) => {
    setIsAuthenticated(true);
    // Extract first name from full name or use name directly
    const displayName = userData.name ? userData.name.split(' ')[0] : userData.email.split('@')[0];
    const userWithDisplay = {
      ...userData,
      displayName: displayName
    };
    setUser(userWithDisplay);
    // Save user to localStorage
    localStorage.setItem('user', JSON.stringify(userWithDisplay));
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
