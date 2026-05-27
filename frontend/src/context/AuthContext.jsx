import React, { createContext, useContext, useState } from 'react';
import { login as apiLogin, register as apiRegister, googleLogin as apiGoogleLogin, githubLogin as apiGithubLogin } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('stock_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    setUser(data.user);
    localStorage.setItem('stock_user', JSON.stringify(data.user));
    return data.user;
  };

  const register = async (username, email, password) => {
    const data = await apiRegister(username, email, password);
    setUser(data.user);
    localStorage.setItem('stock_user', JSON.stringify(data.user));
    return data.user;
  };

  const loginWithGoogle = async (credential) => {
    const data = await apiGoogleLogin(credential);
    setUser(data.user);
    localStorage.setItem('stock_user', JSON.stringify(data.user));
    return data.user;
  };

  const loginWithGithub = async (code) => {
    const data = await apiGithubLogin(code);
    setUser(data.user);
    localStorage.setItem('stock_user', JSON.stringify(data.user));
    return data.user;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('stock_user');
  };

  const updateUser = (updates) => {
    setUser(prev => {
      const newUser = { ...prev, ...updates };
      localStorage.setItem('stock_user', JSON.stringify(newUser));
      return newUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, register, loginWithGoogle, loginWithGithub, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
