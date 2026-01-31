import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import React from "react";
import { Cell as _Cell, HeaderCell as _HeaderCell, Row } from "../components/table";
import { globalStyles } from "../global-styles";
import { DOMAIN_TYPES, PAPER_TYPES } from "../constants";
import { flattenStyles } from "../utils";
import { Paper } from "src/papers/entities/paper.entity";
import { SessionSettings } from "src/common/entities/session-settings.entity";
import { filterFalsy } from "src/lib/utils";
import { PeopleSignatureFooter } from "../components/people-signature-footer";

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

interface FinalCatalogProps {
  mode: 'final' | 'centralizing';
  paperPromotionGroups: Paper[][][];
  sessionSettings: SessionSettings;
}

export function FinalCatalog({ mode, paperPromotionGroups, sessionSettings }: FinalCatalogProps) {
  const footerMarginBottom = 40;
  const footerMarginTop = 30;
  const footerRows = 5;
  const pagePaddingBottom = footerRows * 10 + footerMarginBottom + footerMarginTop;

  const catalogName = {
    final: 'Catalog final',
    centralizing: 'Catalag centralizator'
  }[mode];

  return (
    <Document title={`${catalogName} - Sesiunea ${sessionSettings.sessionName}`}>
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
          const referencePaper = referencePromotion[0];
          const referenceStudent = referencePaper.student;
          const referenceSpecialization = referenceStudent.specialization;
          const referenceDomain = referenceSpecialization.domain;
          const studyYears = referenceSpecialization.studyYears;
          const paperTypeString = PAPER_TYPES[referencePaper.type];
          return (
            <View key={index} break={index > 0}>
              <View style={[globalStyles.section, { fontWeight: 'bold', marginBottom: 16 }]}>
                <View style={globalStyles.sectionColumn}>
                  <Text>ROMÂNIA</Text>
                  <Text>MINISTERUL EDUCAȚIEI</Text>
                  <Text>UNIVERSITATEA DIN BUCUREȘTI</Text>
                  <Text>Facultatea de Matematică și Informatică</Text>
                  <Text>Domeniul de {DOMAIN_TYPES[referenceDomain.type]}: {referenceDomain.name}</Text>
                  <Text>Programul de studii/specializarea: {referenceSpecialization.name}</Text>
                  <Text>Durata studiilor: {studyYears} ani ({studyYears * 2} semestre)</Text>
                  <Text>Număr credite: {60 * studyYears}</Text>
                  <Text>Forma de învățământ: {referenceSpecialization.studyForm.toLocaleUpperCase()}</Text>
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
                {catalogName.toLocaleUpperCase()}{'\n'}
                EXAMEN DE {paperTypeString.toLocaleUpperCase()}
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
                    <HeaderCell value={`Media examenului de ${paperTypeString}`} width={averageColumnWidth} />
                  </Row>
                  {promotionGroup.map((paper, index) => (
                    <Row key={index} width={rowWidth} borderBottom style={{ marginTop: -1 }}>
                      <Cell value={index + 1 + '.'} width={numberingColumnWidth} borderLeft />
                      <Cell 
                        value={filterFalsy([paper.student.lastName, paper.student.extraData?.parentInitial, paper.student.firstName]).join(' ')}
                        width={leftSpace}
                        style={{ justifyContent: 'flex-start' }}
                        textStyle={{ textAlign: 'left' }}
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
          <PeopleSignatureFooter
            people={[
              { column: 'left', position: 'DECAN', name: 'Conf. Dr. Cătălin Gherghe', stamp: true },
              { column: 'right', position: 'SECRETAR ȘEF', name: 'Evelina Coteneanu' },
              { column: 'right', position: 'Întocmit', name: '' }
            ]}
          />
        </View>
      </Page>
    </Document>
  );
}