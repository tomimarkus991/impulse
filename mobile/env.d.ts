declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_APP_VARIANT: "production" | "development" | "preview";
    }
  }
}

export {};
