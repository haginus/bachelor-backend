import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import React from "react";
import { Committee, Paper, SessionSettings } from "../../models/models";
import { Cell as _Cell, HeaderCell as _HeaderCell, Row } from "../components/table";
import { globalStyles } from "../global-styles";
import { DOMAIN_TYPES, PAPER_TYPES } from "../constants";
import { CommitteeCatalogFooter } from "../components/committee-catalog-footer";

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

function Cell({ ...props }: React.ComponentProps<typeof _Cell>) {
  return <_Cell {...props} style={{ paddingHorizontal: 3, paddingVertical: 1, justifyContent: 'center', }} />
}

interface CommitteeFinalCatalogProps {
  committee: Committee;
  paperPromotionGroups: { promotion: string, items: Paper[] }[][];
  sessionSettings: SessionSettings;
}

export function CommitteeFinalCatalog({ committee, paperPromotionGroups, sessionSettings }: CommitteeFinalCatalogProps) {
  const footerMarginBottom = 30;
  const footerMarginTop = 16;
  const footerRows = 2;
  const pagePaddingBottom = footerRows * 10 + footerMarginBottom + footerMarginTop;

  return (
    <Document title={`Catalog ${committee.name}`}>
      <Page 
        size="A4" 
        style={[globalStyles.page, { paddingHorizontal: '1cm', paddingBottom: pagePaddingBottom }]}
      >
        {paperPromotionGroups.map((pageGroup, index) => {
          const rowWidth = 535;
          const numberingColumnWidth = 35;
          const matriculationYearColumnWidth = 110;
          const averageColumnWidth = 140;
          const leftSpace = rowWidth - numberingColumnWidth - matriculationYearColumnWidth - averageColumnWidth;

          const referencePromotion = pageGroup[0];
          const referencePaper = referencePromotion.items[0];
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
                </View>
                <View 
                    style={[
                      globalStyles.sectionColumn, 
                      { flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' }
                    ]}
                  >
                    <Text>Sesiunea {sessionSettings.sessionName.toLocaleUpperCase()}</Text>
                    <Text style={{ maxWidth: 180, textAlign: 'right' }}>
                      Proba: Prezentarea și susținerea lucrării de {paperTypeString} - Credite 10
                    </Text>
                  </View>
              </View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
                CATALOG FINAL{'\n'}
                EXAMEN DE {paperTypeString.toLocaleUpperCase()}
              </Text>
              {pageGroup.map((promotionGroup, index) => (
                <View key={index} style={{ marginBottom: 10 }}>
                  <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>
                    Promoția {promotionGroup.promotion}
                  </Text>
                  <Row width={rowWidth} borderBottom>
                    <HeaderCell value="Nr. crt." width={numberingColumnWidth} borderLeft />
                    <HeaderCell value="Numele, inițiala tatălui și prenumele absolventului" width={leftSpace} />
                    <HeaderCell value="Anul înmatriculării" width={matriculationYearColumnWidth} />
                    <HeaderCell value={`Media examenului de ${paperTypeString}`} width={averageColumnWidth} />
                  </Row>
                  {promotionGroup.items.map((paper, index) => (
                    <Row key={index} width={rowWidth} borderBottom style={{ marginTop: -1 }}>
                      <Cell value={index + 1 + '.'} width={numberingColumnWidth} borderLeft />
                      <Cell 
                        value={
                          [
                            paper.student.user.lastName,
                            paper.student.studentExtraDatum?.parentInitial,
                            paper.student.user.firstName
                          ].filter(Boolean).join(' ')
                        }
                        width={leftSpace}
                      />
                      <Cell value={paper.student.matriculationYear} width={matriculationYearColumnWidth} />
                      <Cell value={paper.gradeAverage?.toFixed(2) || 'ABSENT'} width={averageColumnWidth} />
                    </Row>
                  ))}
                </View>
              ))}
            </View>
          );
        })}
        <View fixed style={[styles.footer, { bottom: footerMarginBottom }]}>
          <CommitteeCatalogFooter committee={committee} minified />
        </View>
      </Page>
    </Document>
  );
}