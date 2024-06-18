import React from "react";
import { Committee, Paper, SessionSettings } from "../../models/models";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { globalStyles } from "../global-styles";
import { Cell as _Cell, HeaderCell as _HeaderCell, Row } from "../components/table";
import { DOMAIN_TYPES, NUMBERS, PAPER_TYPES } from "../constants";
import { arrayMap } from "../../util/util";
import { CommitteeCatalogFooter } from "../components/committee-catalog-footer";
import { flattenStyles } from "../utils";

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

  function gradeAverageString(grade: number | null) {
    if(grade === null) {
      return committee.finalGrades ? 'ABSENT' : '';
    }
    const gradeString = grade.toFixed(2).replace('.', ',');
    const supraunitaryPart = Math.floor(grade);
    const unitaryPart = gradeString.split(',')[1];
    return `${gradeString} (${NUMBERS[supraunitaryPart]}${unitaryPart == '00' ? '' : ` ${unitaryPart}%`})`;
  }

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
          const gradingMembers = committee.members.filter(member => member.committeeMember.role != 'secretary');
          const leftSpace = rowWidth - numberingColumnWidth - averageWidth - (gradeWidth * 2 * gradingMembers.length);

          const referencePaper = papers[0];
          const referenceStudent = referencePaper.student;
          const studyYears = parseInt(referenceStudent.specialization.studyYears);
          const paperTypeString = PAPER_TYPES[referencePaper.type];
          return (
            <View key={index} break={index > 0}>
              <View style={[globalStyles.section, { fontWeight: 'bold', marginBottom: 16 }]}>
                <View style={globalStyles.sectionColumn}>
                  <Text>UNIVERSITATEA DIN BUCUREȘTI</Text>
                  <Text>Facultatea de Matematică și Informatică</Text>
                  <Text>Domeniul de {DOMAIN_TYPES[referenceStudent.domain.type]}: {referenceStudent.domain.name}</Text>
                  <Text>Programul de studii/specializarea: {referenceStudent.specialization.name}</Text>
                  <Text>Durata studiilor: {studyYears} ani ({studyYears * 2} semestre)</Text>
                  <Text>Număr credite: {60 * studyYears}</Text>
                  <Text>Forma de învățământ: {referenceStudent.studyForm.toLocaleUpperCase()}</Text>
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
                  <Text>Credite {paperTypeString} - 10</Text>
                </View>
              </View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
                CATALOG EXAMEN DE {paperTypeString.toUpperCase()}
                {'\n'}Prezentarea și susținerea lucrării de {paperTypeString}
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
                          value={[member.user.lastName, member.user.firstName].join(' ').toLocaleUpperCase()} 
                          width={gradeWidth * 2} 
                        />
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      {gradingMembers.map((_, index) => (
                        <>
                          <HeaderCell 
                            key={index + 'paper'}
                            value="Notă pentru lucrare"
                            width={gradeWidth} 
                          />
                          <HeaderCell 
                            key={index + 'presendation'}
                            value="Notă pentru susținerea lucrării"
                            width={gradeWidth} 
                          />
                        </>
                      ))}
                    </View>
                  </View>
                  <HeaderCell value="Media" width={averageWidth} />
                </Row>
                {papers.map((paper, index) => {
                  const gradesByMember = arrayMap(paper.grades, (grade) => grade.teacherId);
                  return (
                    <Row key={paper.id} width={rowWidth} borderBottom style={{ marginTop: -1 }}>
                      <Cell value={index + 1 + '.'} width={numberingColumnWidth} borderLeft />
                      <Cell 
                        value={
                          [
                            paper.student.user.lastName,
                            paper.student.studentExtraDatum?.parentInitial,
                            paper.student.user.firstName
                          ].filter(Boolean).join(' ')
                        }
                        width={leftSpace / 2}
                        style={{ justifyContent: 'flex-start' }}
                        textStyle={{ textAlign: 'left' }}
                      />
                      <Cell 
                        value={`${paper.title} – ${paper.teacher.user.lastName} ${paper.teacher.user.firstName}`.toLocaleUpperCase()}
                        width={leftSpace / 2} 
                      />
                      {gradingMembers.map((member, index) => {
                        const grade = gradesByMember[member.id];
                        return (
                          <View key={index} style={{ flexDirection: 'row' }}>
                            <Cell value={gradeString(grade?.forPaper)} width={gradeWidth} />
                            <Cell value={gradeString(grade?.forPresentation)} width={gradeWidth} />
                          </View>
                        );
                      })}
                      <Cell value={gradeAverageString(paper.gradeAverage)} width={averageWidth} />
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

