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
  isAuthenticating: boolean;
  stxAddress: string | null;
  network: StacksMainnet;
}

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });
const network = new StacksMainnet();

const APP_NAME = 'Stacks Content Monetization';
const APP_ICON = '/logo.png';

/**
 * Context to manage Stacks wallet authentication state
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<any>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (userSession.isSignInPending()) {
      setIsAuthenticating(true);
      userSession.handlePendingSignIn().then((data) => {
        setUserData(data);
      }).catch(err => {
        console.error('Failed to handle pending sign-in:', err);
      }).finally(() => {
        setIsAuthenticating(false);
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
        icon: typeof window !== 'undefined' ? window.location.origin + APP_ICON : APP_ICON,
      },
      redirectTo: '/',
      onFinish: () => {
        setUserData(userSession.loadUserData());
      },
      onCancel: () => {
        console.log('User cancelled authentication');
      },
      userSession,
    });
  };

  const logout = () => {
    userSession.signUserOut();
    setUserData(null);
  };

  const stxAddress = userData?.profile?.stxAddress?.mainnet || userData?.profile?.stxAddress?.testnet || null;

  return (
    <AuthContext.Provider
      value={{
        userSession,
        userData,
        authenticate,
        logout,
        isLoggedIn: !!userData,
        isAuthenticating,
        stxAddress,
        network,
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
