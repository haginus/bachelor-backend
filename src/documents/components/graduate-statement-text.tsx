import { Text, View } from '@react-pdf/renderer';
import React from 'react';

interface GraduateStatementTextProps {
  style?: React.ComponentProps<typeof View>['style'];
}

export function GraduateStatementText({ style }: GraduateStatementTextProps) {
  return (
    <View style={style}>
      <Text style={{ fontWeight: 'bold' }}>
        Declarația absolventului:
      </Text>
      <Text>
        Am luat cunoștință de informarea privind protecția datelor cu caracter personal. 
        (accesibilă la: https://unibuc.ro/wp-content/uploads/2020/06/Informare-examene-de-finalizare-a-studiilor.pdf)
      </Text>
    </View>
  )
}