import React from "react";
import { StyleSheet, View } from "@react-pdf/renderer";
import { globalStyles } from "../global-styles";
import { Text } from "./text";

interface ListItemProps {
  textStyle?: any;
  indent?: number;
  children: string | string[];
}

export function ListItem({ textStyle, indent = 1, children }: ListItemProps) {
  return (
    <View style={[styles.listItem, { paddingLeft: 20 * indent }]}>
      <Text style={[globalStyles.body, styles.bullet, textStyle]}>•</Text>
      <Text style={[globalStyles.body, styles.content, textStyle]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  listItem: {
    flexDirection: 'row',
  },
  bullet: {
    paddingRight: 10,
  },
  content: {
    flex: 1,
  }
});