import { View, Text } from "@react-pdf/renderer";
import React from "react";
import { Committee } from "../grading/entities/committee.entity";
import { NUMBERS } from "./constants";
import { Paper } from "../papers/entities/paper.entity";
import { Submission } from "../grading/entities/submission.entity";

export function flattenStyles(style: React.ComponentProps<typeof View | typeof Text>['style']) {
  if(Array.isArray(style)) {
    return style.reduce((acc, val) => ({ ...acc, ...flattenStyles(val) }), {});
  }
  return style;
}

export function getWrittenExamGrade(submission: Submission) {
  const grade = submission?.writtenExamGrade.finalGrade;
  return !!grade ? grade : null;
}

export function getSubmissionGrade(paper: Paper) {
  const hasWrittenExam = paper.student.specialization.domain.hasWrittenExam;
  const grades = hasWrittenExam ? [getWrittenExamGrade(paper.student.submission), paper.gradeAverage] : [paper.gradeAverage];
  if(grades.some(grade => !grade)) {
    return null;
  }
  return (grades as number[]).reduce((a, b) => a + b, 0) / grades.length;
}

export function gradeAverageString(committee: Committee, grade: number | null | undefined) {
  if(grade === undefined || grade === null) {
    return committee.finalGrades ? 'ABSENT' : '';
  }
  const gradeString = grade.toFixed(2).replace('.', ',');
  const supraunitaryPart = Math.floor(grade);
  const unitaryPart = gradeString.split(',')[1];
  return `${gradeString} (${NUMBERS[supraunitaryPart]}${unitaryPart == '00' ? '' : ` ${unitaryPart}%`})`;
}