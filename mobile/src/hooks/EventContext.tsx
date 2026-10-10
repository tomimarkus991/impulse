import React, { createContext, useContext, useState, ReactNode } from "react";
import { SelectEvent, SelectPreset } from "../db/types";

type ContextType = {
  events: Map<string, SelectEvent[]>;
  setEvents: React.Dispatch<React.SetStateAction<Map<string, SelectEvent[]>>>;
  presets: SelectPreset[];
  setPresets: React.Dispatch<React.SetStateAction<SelectPreset[]>>;
  /** Bumped when the whole database is replaced, so loaders refetch */
  dataVersion: number;
  reloadEvents: () => void;
};

const Context = createContext<ContextType | undefined>(undefined);

export const EventProvider = ({ children }: { children: ReactNode }) => {
  const [events, setEvents] = useState<Map<string, SelectEvent[]>>(new Map());
  const [presets, setPresets] = useState<SelectPreset[]>([]);
  const [dataVersion, setDataVersion] = useState(0);

  const reloadEvents = () => {
    setEvents(new Map());
    setDataVersion(version => version + 1);
  };

  return (
    <Context.Provider
      value={{
        events,
        setEvents,
        presets,
        setPresets,
        dataVersion,
        reloadEvents,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export const useEvent = () => {
  const context = useContext(Context);
  if (!context) {
    throw new Error("useEvent must be used within a EventProvider");
  }
  return context;
};
