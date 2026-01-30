'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { StacksMainnet } from '@stacks/network';

interface AuthContextType {
  userSession: UserSession;
  userData: any;
  authenticate: () => void;
  logout: () => void;
  isLoggedIn: boolean;
}

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

const APP_NAME = 'Stacks Content Monetization';

/**
 * Context to manage Stacks wallet authentication state
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((data) => {
        setUserData(data);
      });
    } else if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  const authenticate = () => {
    console.log('Initiating Stacks authentication...');
    showConnect({
      appDetails: {
        name: APP_NAME,
        icon: window.location.origin + '/logo.png',
      },
      redirectTo: '/',
      onFinish: () => {
        setUserData(userSession.loadUserData());
      },
      userSession,
    });
  };

  const logout = () => {
    userSession.signUserOut();
    setUserData(null);
  };

  return (
    <AuthContext.Provider
      value={{
        userSession,
        userData,
        authenticate,
        logout,
        isLoggedIn: !!userData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
