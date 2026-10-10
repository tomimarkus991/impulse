import React, { createContext, useContext, useState, ReactNode } from "react";

type ModalContextType = {
  selectedDate: Date | null;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | null>>;
};

const Context = createContext<ModalContextType | undefined>(undefined);

export const SelectProvider = ({ children }: { children: ReactNode }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // const [selectedDates, setSelectedDates] = useState({
  //   start: "",
  //   end:""
  // })

  return (
    <Context.Provider
      value={{
        selectedDate,
        setSelectedDate,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export const useSelect = () => {
  const context = useContext(Context);
  if (!context) {
    throw new Error("useSelect must be used within a SelectProvider");
  }
  return context;
};
