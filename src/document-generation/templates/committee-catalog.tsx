import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { globalStyles } from "../global-styles";
import { Cell as _Cell, HeaderCell as _HeaderCell, Row } from "../components/table";
import { DOMAIN_TYPES, PAPER_TYPES } from "../constants";
import { CommitteeCatalogFooter } from "../components/committee-catalog-footer";
import { flattenStyles, getSpecializationName, gradeAverageString } from "../utils";
import { Committee } from "../../grading/entities/committee.entity";
import { Paper } from "../../papers/entities/paper.entity";
import { SessionSettings } from "../../common/entities/session-settings.entity";
import { indexArray } from "../../lib/utils";

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: globalStyles.page.paddingHorizontal,
    right: globalStyles.page.paddingHorizontal,
  }
});


function HeaderCell({ ...props }: React.ComponentProps<typeof _Cell>) {
  return <_HeaderCell {...props} style={{ paddingHorizontal: 0 }} />
}

function Cell({ style, ...props }: React.ComponentProps<typeof _Cell>) {
  return <_Cell {...props} style={[{ paddingHorizontal: 4, justifyContent: 'center', minHeight: 40 }, flattenStyles(style)]} />
}

interface CommitteeCatalogProps {
  committee: Committee;
  paperGroups: Paper[][];
  sessionSettings: SessionSettings;
}

export function CommitteeCatalog({ committee, paperGroups, sessionSettings }: CommitteeCatalogProps) {

  function gradeString(grade: number | null | undefined) {
    if(grade === null || grade === undefined) {
      return committee.finalGrades ? '-' : '';
    }
    return grade.toString();
  }

  const footerMarginBottom = 30;
  const footerMarginTop = 16;
  const footerRows = committee.members.length + 4;
  const pagePaddingBottom = footerRows * 10 + footerMarginBottom + footerMarginTop;

  return (
    <Document title={`Catalog ${committee.name}`}>
      <Page 
        size="A4"
        orientation="landscape"
        style={[globalStyles.page, { paddingHorizontal: '1cm', paddingBottom: pagePaddingBottom }]}
      >
        {paperGroups.map((papers, index) => {
          const rowWidth = 785;
          const numberingColumnWidth = 30;
          const gradeWidth = 0.06 * rowWidth;
          const averageWidth = 0.09 * rowWidth;
          const gradingMembers = committee.members.filter(member => member.role != 'secretary');
          const leftSpace = rowWidth - numberingColumnWidth - averageWidth - (gradeWidth * 2 * gradingMembers.length);

          const referencePaper = papers[0];
          const referenceStudent = referencePaper.student;
          const studyYears = referenceStudent.specialization.studyYears;
          const paperTypeString = PAPER_TYPES[referencePaper.type];
          return (
            <View key={index} break={index > 0}>
              <View style={[globalStyles.section, { fontWeight: 'bold', marginBottom: 16 }]}>
                <View style={globalStyles.sectionColumn}>
                  <Text>UNIVERSITATEA DIN BUCUREȘTI</Text>
                  <Text>Facultatea de Matematică și Informatică</Text>
                  <Text>Domeniul de {DOMAIN_TYPES[referenceStudent.specialization.domain.type]}: {referenceStudent.specialization.domain.name}</Text>
                  <Text>Programul de studii/specializarea: {getSpecializationName(referenceStudent.specialization)}</Text>
                  <Text>Durata studiilor: {studyYears} ani ({studyYears * 2} semestre)</Text>
                  <Text>Număr credite: {60 * studyYears}</Text>
                  <Text>Forma de învățământ: {referenceStudent.specialization.studyForm.toLocaleUpperCase()}</Text>
                  <Text>Promoția: {referenceStudent.promotion}</Text>
                </View>
                <View 
                  style={[
                    globalStyles.sectionColumn, 
                    { flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' }
                  ]}
                >
                  <Text>Examen de {paperTypeString}</Text>
                  <Text>Sesiunea {sessionSettings.sessionName.toLocaleUpperCase()}</Text>
                  <Text>Nr. credite: {referenceStudent.specialization.domain.hasWrittenExam ? 5 : 10}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
                CATALOG EXAMEN DE {paperTypeString.toUpperCase()}
                {'\n'}{referenceStudent.specialization.domain.hasWrittenExam ? 'Proba 2 – ' : ''}
                Prezentarea și susținerea lucrării de {paperTypeString}
              </Text>
              <View style={{ fontSize: 10 }}>
                <Row width={rowWidth} borderBottom>
                  <HeaderCell value="Nr. crt." width={numberingColumnWidth} borderLeft />
                  <HeaderCell value="Numele, inițiala tatălui și prenumele absolventului" width={leftSpace / 2} />
                  <HeaderCell value="Titlul lucrării de disertație și profesorul coordonator" width={leftSpace / 2} />
                  <View>
                    <View style={{ flexDirection: 'row' }}>
                      {gradingMembers.map((member, index) => (
                        <HeaderCell 
                          key={index}
                          value={[member.teacher.lastName, member.teacher.firstName].join(' ').toLocaleUpperCase()} 
                          width={gradeWidth * 2} 
                        />
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      {gradingMembers.map((_, index) => (
                        <React.Fragment key={index}>
                          <HeaderCell 
                            value="Notă pentru lucrare"
                            width={gradeWidth} 
                          />
                          <HeaderCell 
                            value="Notă pentru susținerea lucrării"
                            width={gradeWidth} 
                          />
                        </React.Fragment>
                      ))}
                    </View>
                  </View>
                  <HeaderCell value="Media" width={averageWidth} />
                </Row>
                {papers.map((paper, index) => {
                  const gradesByMember = indexArray(paper.grades, (grade) => grade.committeeMemberTeacherId);
                  return (
                    <Row key={paper.id} width={rowWidth} borderBottom style={{ marginTop: -1 }}>
                      <Cell value={index + 1 + '.'} width={numberingColumnWidth} borderLeft />
                      <Cell 
                        value={
                          [
                            paper.student.lastName,
                            paper.student.extraData?.parentInitial,
                            paper.student.firstName
                          ].filter(Boolean).join(' ')
                        }
                        width={leftSpace / 2}
                        style={{ justifyContent: 'flex-start' }}
                        textStyle={{ textAlign: 'left' }}
                      />
                      <Cell 
                        value={`${paper.title} – ${paper.teacher.lastName} ${paper.teacher.firstName}`.toLocaleUpperCase()}
                        width={leftSpace / 2} 
                      />
                      {gradingMembers.map((member, index) => {
                        const grade = gradesByMember[member.teacherId];
                        return (
                          <View key={index} style={{ flexDirection: 'row' }}>
                            <Cell value={gradeString(grade?.forPaper)} width={gradeWidth} />
                            <Cell value={gradeString(grade?.forPresentation)} width={gradeWidth} />
                          </View>
                        );
                      })}
                      <Cell value={gradeAverageString(committee, paper.gradeAverage)} width={averageWidth} />
                    </Row>
                  )
                })}
              </View>
            </View>
          );
        })}
        <View fixed style={[styles.footer, { bottom: footerMarginBottom }]}>
          <CommitteeCatalogFooter committee={committee} />
        </View>
      </Page>
    </Document>
  );
}

