import { Text, View } from "@react-pdf/renderer";
import React from "react";
import { globalStyles } from "../global-styles";

interface DateAndSignatureProps {
  date: Date;
}

export function DateAndSignature({ date }: DateAndSignatureProps) {
  return (
    <View style={[globalStyles.section, globalStyles.footer]}>
      <View style={[globalStyles.sectionColumn, globalStyles.footerSection]}>
        <Text>Data</Text>
        <Text>{'\n'}</Text>
        <Text>{date.toLocaleDateString('ro-RO')}</Text>
      </View>
      <View style={[globalStyles.sectionColumn, globalStyles.footerSection]}>
        <Text>Semnătura</Text>
        <Text>{'\n'}</Text>
        <Text>_________________</Text>
      </View>
    </View>
  );
}