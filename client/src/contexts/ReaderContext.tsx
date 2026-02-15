import React, { createContext, useContext, useState, ReactNode } from "react";

interface ReaderContextType {
  isFullScreen: boolean;
  setIsFullScreen: (value: boolean) => void;
  toggleFullScreen: () => void;
}

const ReaderContext = createContext<ReaderContextType | undefined>(undefined);

interface ReaderProviderProps {
  children: ReactNode;
}

export function ReaderProvider({ children }: ReaderProviderProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
  };

  return (
    <ReaderContext.Provider
      value={{
        isFullScreen,
        setIsFullScreen,
        toggleFullScreen,
      }}
    >
      {children}
    </ReaderContext.Provider>
  );
}

export function useReader() {
  const context = useContext(ReaderContext);
  if (context === undefined) {
    throw new Error("useReader must be used within a ReaderProvider");
  }
  return context;
}
