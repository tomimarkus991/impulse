import clsx from "clsx";
import React from "react";
import { Text, TextProps } from "react-native";

type Family =
  | "Rubik-Black"
  | "Rubik-BlackItalic"
  | "Rubik-Bold"
  | "Rubik-BoldItalic"
  | "Rubik-ExtraBold"
  | "Rubik-ExtraBoldItalic"
  | "Rubik-Italic"
  | "Rubik-Light"
  | "Rubik-LightItalic"
  | "Rubik-Medium"
  | "Rubik-MediumItalic"
  | "Rubik-Regular"
  | "Rubik-SemiBold"
  | "Rubik-SemiBoldItalic";

interface Props extends TextProps {
  fontFamily?: Family;
}

export const P = ({
  style,
  children,
  className,
  fontFamily = "Rubik-Regular",
  ...props
}: Props) => {
  return (
    <Text className={clsx("text-text", className)} style={[style, { fontFamily }]} {...props}>
      {children}
    </Text>
  );
};
