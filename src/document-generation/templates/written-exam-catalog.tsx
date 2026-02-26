import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { SessionSettings } from "../../common/entities/session-settings.entity";
import { Submission } from "../../grading/entities/submission.entity";
import { globalStyles } from "../global-styles";
import { DOMAIN_TYPES, FACULTY_DEAN_NAME, FACULTY_WRITTEN_EXAM_SECRETARY_NAME, PAPER_TYPES } from "../constants";
import { Cell as _Cell, HeaderCell as _HeaderCell, Row } from "../components/table";
import { filterFalsy } from "../../lib/utils";
import { flattenStyles, getSpecializationName, getWrittenExamGrade } from "../utils";
import { PeopleSignatureFooter } from "../components/people-signature-footer";

interface WrittenExamCatalogProps {
  isAfterDisputes?: boolean;
  submissionPromotionGroups: Submission[][][];
  sessionSettings: SessionSettings;
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: globalStyles.page.paddingHorizontal,
    right: globalStyles.page.paddingHorizontal,
  }
});

function HeaderCell({ ...props }: React.ComponentProps<typeof _Cell>) {
  return <_HeaderCell {...props} style={{ paddingHorizontal: 6 }} />
}

function Cell({ style, ...props }: React.ComponentProps<typeof _Cell>) {
  return <_Cell {...props} style={[{ paddingHorizontal: 3, paddingVertical: 1, justifyContent: 'center' }, flattenStyles(style)]} />
}

export function WrittenExamCatalog({ isAfterDisputes = false, submissionPromotionGroups, sessionSettings }: WrittenExamCatalogProps) {

  const footerMarginBottom = 40;
  const footerMarginTop = 30;
  const footerRows = 3;
  const pagePaddingBottom = footerRows * 10 + footerMarginBottom + footerMarginTop;

  return (
    <Document title={`Catalog proba 1 - Sesiunea ${sessionSettings.sessionName}`}>
      {submissionPromotionGroups.map((pageGroup, index) => {
        const rowWidth = 535;
        const numberingColumnWidth = 35;
        const matriculationYearColumnWidth = 110;
        const gradeColumnWidth = 130;
        const leftSpace = rowWidth - numberingColumnWidth - matriculationYearColumnWidth - gradeColumnWidth;

        const referenceSubmission = pageGroup[0][0];
        const referenceStudent = referenceSubmission.student;
        const studyYears = referenceStudent.specialization.studyYears;
        const paperTypeString = PAPER_TYPES[referenceStudent.specialization.domain.paperType];

        const stringifySubmissionGrade = (submission: Submission) => {
          const grade = isAfterDisputes 
            ? getWrittenExamGrade(submission)
            : submission?.writtenExamGrade?.initialGrade || null;
          const areGradesFinal = sessionSettings.writtenExamGradesPublic;
          return grade?.toFixed(2) || (areGradesFinal ? 'ABSENT' : '');
        }
        return (
          <Page
            key={index}
            size="A4"
            style={[globalStyles.page, { paddingHorizontal: '1cm', paddingBottom: pagePaddingBottom }]}
          >
            <View style={[globalStyles.section, { fontWeight: 'bold', marginBottom: 16 }]}>
              <View style={globalStyles.sectionColumn}>
                <Text>UNIVERSITATEA DIN BUCUREȘTI</Text>
                <Text>Facultatea de Matematică și Informatică</Text>
                <Text>Domeniul de {DOMAIN_TYPES[referenceStudent.specialization.domain.type]}: {referenceStudent.specialization.domain.name}</Text>
                <Text>Programul de studii/specializarea: {getSpecializationName(referenceStudent.specialization)}</Text>
                <Text>Durata studiilor: {studyYears} ani ({studyYears * 2} semestre)</Text>
                <Text>Număr credite: {60 * studyYears}</Text>
                <Text>Forma de învățământ: {referenceStudent.specialization.studyForm.toLocaleUpperCase()}</Text>
              </View>
              <View 
                style={[
                  globalStyles.sectionColumn, 
                  { flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' }
                ]}
              >
                <Text>Examen de {paperTypeString}</Text>
                <Text>Sesiunea {sessionSettings.sessionName.toLocaleUpperCase()}</Text>
                <Text>Nr. credite: 5</Text>
              </View>
            </View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
              CATALOG EXAMEN DE {paperTypeString.toUpperCase()}
              {'\n'}Proba 1 – Cunoștințe fundamentale și de specialitate
              {isAfterDisputes && '\n– după soluționarea contestațiilor –'}
            </Text>
            {pageGroup.map((promotionGroup, index) => (
              <View key={index} style={{ marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>
                  Promoția {promotionGroup[0].student.promotion}
                </Text>
                <Row width={rowWidth} borderBottom>
                  <HeaderCell value="Nr. crt." width={numberingColumnWidth} borderLeft />
                  <HeaderCell value="Numele, inițiala tatălui și prenumele absolventului" width={leftSpace} />
                  <HeaderCell value="Anul înmatriculării" width={matriculationYearColumnWidth} />
                  <HeaderCell value="Nota Proba 1" width={gradeColumnWidth} />
                </Row>
                {promotionGroup.map((submission, index) => (
                  <Row key={index} width={rowWidth} borderBottom style={{ marginTop: -1 }}>
                    <Cell value={(index + 1) + '.'} width={numberingColumnWidth} borderLeft />
                    <Cell 
                      value={filterFalsy([submission.student.lastName, submission.student.extraData?.parentInitial, submission.student.firstName]).join(' ')}
                      width={leftSpace}
                      style={{ justifyContent: 'flex-start' }}
                      textStyle={{ textAlign: 'left' }}
                    />
                    <Cell value={submission.student.matriculationYear} width={matriculationYearColumnWidth} />
                    <Cell value={stringifySubmissionGrade(submission)} width={gradeColumnWidth} />
                  </Row>
                ))}
              </View>
            ))}
            <View fixed style={[styles.footer, { bottom: footerMarginBottom }]}>
              <PeopleSignatureFooter
                people={[
                  { column: 'left', position: `Președinte comisie examen de ${paperTypeString}`, name: 'Decan – ' + FACULTY_DEAN_NAME },
                  { column: 'right', position: `Secretar comisie examen de ${paperTypeString}`, name: FACULTY_WRITTEN_EXAM_SECRETARY_NAME },
                ]}
              />
            </View>
          </Page>
        );
      })}
    </Document>
  );
}