import { View, Text } from "@react-pdf/renderer";
import React from "react";
import { Committee } from "src/grading/entities/committee.entity";
import { NUMBERS } from "./constants";

export function flattenStyles(style: React.ComponentProps<typeof View | typeof Text>['style']) {
  if(Array.isArray(style)) {
    return style.reduce((acc, val) => ({ ...acc, ...flattenStyles(val) }), {});
  }
  return style;
}

export function gradeAverageString(committee: Committee, grade: number | undefined) {
  if(grade === undefined) {
    return committee.finalGrades ? 'ABSENT' : '';
  }
  const gradeString = grade.toFixed(2).replace('.', ',');
  const supraunitaryPart = Math.floor(grade);
  const unitaryPart = gradeString.split(',')[1];
  return `${gradeString} (${NUMBERS[supraunitaryPart]}${unitaryPart == '00' ? '' : ` ${unitaryPart}%`})`;
}