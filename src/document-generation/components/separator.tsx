import { View } from "@react-pdf/renderer";
import React from "react";

interface SeparatorProps {
  size?: number;
  color?: string;
  margin?: number;
}

export function Separator({ size = 1, color = '#aaa', margin = 10 }: SeparatorProps) {
  return <View style={{ borderBottomWidth: size, borderColor: color, marginVertical: margin }} />;
}