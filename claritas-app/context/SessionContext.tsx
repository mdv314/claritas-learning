// context/SessionContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface SessionContextType {
  name: string | null;
  email: string | null;
  password: string | null;
  setCredentials: (name: string, email: string, password: string) => void;
  clearCredentials: () => void;
}

export const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  const setCredentials = (name: string, email: string, password: string) => {
    setName(name)
    setEmail(email);
    setPassword(password);
  };

  const clearCredentials = () => {
    setEmail(null);
    setPassword(null);
    setName(null);
  };

  return (
    <SessionContext.Provider value={{ email, password, name, setCredentials, clearCredentials }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
};
