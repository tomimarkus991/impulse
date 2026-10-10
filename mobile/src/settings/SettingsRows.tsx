import Ionicons from "@expo/vector-icons/Ionicons";
import React, { ReactNode } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { P } from "../components/P";

export const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <View className="gap-2">
    <P className="px-1 text-[13px] uppercase tracking-wider text-[#a1a1a6]">{title}</P>
    <View className="overflow-hidden rounded-[18px] bg-[#2c2c2b]">{children}</View>
  </View>
);

export const Row = ({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
  busy,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
  busy?: boolean;
  right?: ReactNode;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled || busy || !onPress}
    className="flex-row items-center gap-3.5 px-4 min-h-[60px] py-3 active:bg-[#353534]"
    style={{ opacity: disabled ? 0.4 : 1 }}
  >
    <Ionicons name={icon} size={22} color="#E5E5E7" />
    <View className="flex-1 gap-0.5">
      <P className="text-[17px]">{title}</P>
      {subtitle && <P className="text-sm text-[#a1a1a6]">{subtitle}</P>}
    </View>
    {busy ? <ActivityIndicator color="#E5E5E7" /> : right}
  </Pressable>
);

export const Divider = () => <View className="h-px ml-[54px] bg-[#3a3a39]" />;
