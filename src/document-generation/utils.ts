import { View, Text } from "@react-pdf/renderer";
import React from "react";

export function flattenStyles(style: React.ComponentProps<typeof View | typeof Text>['style']) {
  if(Array.isArray(style)) {
    return style.reduce((acc, val) => ({ ...acc, ...flattenStyles(val) }), {});
  }
  return style;
}