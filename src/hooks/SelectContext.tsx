import React, { createContext, useContext, useState, ReactNode } from "react";

type ModalContextType = {
  selectedDate: Date | null;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | null>>;
  selectedPreset: number | null;
  setSelectedPreset: React.Dispatch<React.SetStateAction<number | null>>;
  selectedColor: string | null;
  setSelectedColor: React.Dispatch<React.SetStateAction<string | null>>;
  customEventSelectedColor: string | null;
  setCustomEventSelectedColor: React.Dispatch<React.SetStateAction<string | null>>;
};

const Context = createContext<ModalContextType | undefined>(undefined);

export const SelectProvider = ({ children }: { children: ReactNode }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [customEventSelectedColor, setCustomEventSelectedColor] = useState<string | null>(null);

  // const [selectedDates, setSelectedDates] = useState({
  //   start: "",
  //   end:""
  // })

  return (
    <Context.Provider
      value={{
        selectedDate,
        setSelectedDate,
        selectedColor,
        setSelectedColor,
        selectedPreset,
        setSelectedPreset,
        customEventSelectedColor,
        setCustomEventSelectedColor,
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
