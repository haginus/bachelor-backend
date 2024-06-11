import React from 'react';
import { Text, View } from "@react-pdf/renderer";
import { flattenStyles } from '../utils';

interface RowProps {
  width?: number;
  children: React.ReactNode;
  borderBottom?: boolean;
  style?: React.ComponentProps<typeof View>['style'];
}

export function Row({ width, children, borderBottom = false, style }: RowProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          borderBottomWidth: borderBottom ? 1 : 0,
          borderColor: '#000',
          width: width || 510,
        },
        flattenStyles(style),
      ]}
      wrap={false}
    >
      {children}
    </View>
  );
}

interface CellProps {
  value: string;
  width: number | string;
  borderLeft?: boolean;
  style?: React.ComponentProps<typeof View>['style'];
}

export function Cell({ value, width, borderLeft = false, style }: CellProps) {
  return (
    <View 
      style={[
        { 
          paddingHorizontal: 5,
          borderColor: '#000',
          borderWidth: 1,
          width,
          borderLeftWidth: borderLeft ? 1 : 0,
          borderBottomWidth: 0,
          flexDirection: 'row',
          alignItems: 'center',
        },
        flattenStyles(style),
      ]}
    >
      <Text style={{ textAlign: 'center' }}>{value}</Text>
    </View>
  )
}

export function HeaderCell({ style, ...props }: CellProps) {
  return (
    <Cell
      {...props}
      style={[
        { justifyContent: 'center', backgroundColor: '#bdbdbd', fontWeight: 'bold' },
        flattenStyles(style),
      ]}
    />
  );
}