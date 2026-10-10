import React, { createContext, useContext, useState, ReactNode } from "react";

type ModalContextType = {
  isEditEventModalVisible: boolean;
  setIsEditEventModalVisible: (visible: boolean) => void;
  isCreateEventModalVisible: boolean;
  setIsCreateEventModalVisible: (visible: boolean) => void;
  isColorPickerModalVisible: boolean;
  setIsColorPickerModalVisible: (visible: boolean) => void;
  isRestModalVisible: boolean;
  setIsRestModalVisible: (visible: boolean) => void;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [isEditEventModalVisible, setIsEditEventModalVisible] = useState(false);
  const [isCreateEventModalVisible, setIsCreateEventModalVisible] = useState(false);
  const [isColorPickerModalVisible, setIsColorPickerModalVisible] = useState(false);
  const [isRestModalVisible, setIsRestModalVisible] = useState(false);

  return (
    <ModalContext.Provider
      value={{
        isRestModalVisible,
        setIsRestModalVisible,
        isEditEventModalVisible,
        setIsEditEventModalVisible,
        isCreateEventModalVisible,
        setIsCreateEventModalVisible,
        isColorPickerModalVisible,
        setIsColorPickerModalVisible,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};
