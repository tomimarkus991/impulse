import { ConfigContext, ExpoConfig } from "expo/config";

type AppConfig = {
  name: string;
  scheme: string;
  package: string;
};

const getAppConfig = (): AppConfig => {
  const variant = process.env.EXPO_PUBLIC_APP_VARIANT ?? "preview";

  const config: AppConfig = {
    name: "impulse",
    package: "com.tomimarkus991.impulse",
    scheme: "project-impulse",
  };

  if (variant === "development") {
    return {
      name: `${config.name} Dev`,
      scheme: `${config.scheme}-dev`,
      package: `${config.package}.dev`,
    };
  } else if (variant === "preview") {
    return {
      name: `${config.name} preview`,
      scheme: `${config.scheme}-preview`,
      package: `${config.package}.preview`,
    };
  }

  return config;
};

const appConfig = getAppConfig();

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appConfig.name,
  slug: "impulse",
  version: "1.0.0",
  orientation: "default",
  icon: "./assets/images/icon.png",
  scheme: appConfig.scheme,
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    config: {
      usesNonExemptEncryption: false,
    },
    bundleIdentifier: appConfig.package,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/splash.png",
      backgroundColor: "#1e1f1f",
    },
    package: appConfig.package,
  },
  plugins: [
    "expo-router",
    "expo-sqlite",
    "expo-notifications",
    "expo-document-picker",
    "@react-native-community/datetimepicker",
    "@react-native-google-signin/google-signin",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash.png",
        resizeMode: "contain",
        imageWidth: 200,
        backgroundColor: "#1e1f1f",
      },
    ],
    [
      "expo-font",
      {
        fonts: [
          "./assets/fonts/Rubik-Black.ttf",
          "./assets/fonts/Rubik-BlackItalic.ttf",
          "./assets/fonts/Rubik-Bold.ttf",
          "./assets/fonts/Rubik-BoldItalic.ttf",
          "./assets/fonts/Rubik-ExtraBold.ttf",
          "./assets/fonts/Rubik-ExtraBoldItalic.ttf",
          "./assets/fonts/Rubik-Italic.ttf",
          "./assets/fonts/Rubik-Light.ttf",
          "./assets/fonts/Rubik-LightItalic.ttf",
          "./assets/fonts/Rubik-Medium.ttf",
          "./assets/fonts/Rubik-MediumItalic.ttf",
          "./assets/fonts/Rubik-Regular.ttf",
          "./assets/fonts/Rubik-SemiBold.ttf",
          "./assets/fonts/Rubik-SemiBoldItalic.ttf",
        ],
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "51825d40-f844-409c-ba17-ffaafe448449",
    },
  },
});
