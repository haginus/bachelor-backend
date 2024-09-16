import { Text, View, Image } from "@react-pdf/renderer";
import React from "react";
import { globalStyles } from "../global-styles";

interface DateAndSignatureProps {
  date: Date;
  signatureSample?: string;
}

export function DateAndSignature({ date, signatureSample }: DateAndSignatureProps) {
  return (
    <View style={[globalStyles.section, globalStyles.footer]}>
      <View style={[globalStyles.sectionColumn, globalStyles.footerSection]}>
        <Text>Data</Text>
        <Text>{'\n'}</Text>
        <Text>{date.toLocaleDateString('ro-RO')}</Text>
      </View>
      <View style={[globalStyles.sectionColumn, globalStyles.footerSection]}>
        <Text>Semnătura</Text>
        {signatureSample && <Image src={signatureSample} style={{ width: 90 }} />}
      </View>
    </View>
  );
}