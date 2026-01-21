import React from "react";
import { Text } from "@react-pdf/renderer";

interface CheckboxesProps {
  label: string;
  value: string;
  options: {
    label: string;
    value: string;
  }[];
}

export function Checkboxes({ label, value, options }: CheckboxesProps) {
  const checked = '■';
  const unchecked = '□';
  return (
    <Text>
      {label}:{' '}
      {options.map((option, index) => (
        <Text key={index}>
          {value === option.value ? checked : unchecked} {option.label}{index < options.length - 1 ? '/ ' : ''}
        </Text>
      ))}
    </Text>
  );
}