import { createContext, useContext, useState, ReactNode } from "react";

interface AuthModeContextType {
  mode: "login" | "signup";
  setMode: (mode: "login" | "signup") => void;
}

const AuthModeContext = createContext<AuthModeContextType | undefined>(undefined);

export const AuthModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<"login" | "signup">("login"); // default mode

  return (
    <AuthModeContext.Provider value={{ mode, setMode }}>
      {children}
    </AuthModeContext.Provider>
  );
};

export const useAuthMode = () => {
  const context = useContext(AuthModeContext);
  if (!context) throw new Error("useAuthMode must be inside AuthModeProvider");
  return context;
};
