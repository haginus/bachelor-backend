import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { globalStyles } from "../global-styles";
import { Cell as _Cell, HeaderCell, Row } from "../components/table";
import { PAPER_TYPES } from "../constants";
import { Committee } from "src/grading/entities/committee.entity";
import { SessionSettings } from "src/common/entities/session-settings.entity";
import { Paper } from "src/papers/entities/paper.entity";
import { User } from "src/users/entities/user.entity";
import { groupBy } from "src/lib/utils";

interface CommitteeStudentAssignationProps {
  committees: Committee[];
  sessionSettings: SessionSettings;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    marginTop: 24,
  },
});

function Cell({ ...props }: React.ComponentProps<typeof _Cell>) {
  return <_Cell {...props} style={{ paddingHorizontal: 2, justifyContent: 'center', minHeight: 20, fontSize: 10 }} />
}

function sortFn(a: Paper, b: Paper): number {
  return (new Date(a.scheduledGrading || 0).getTime() - new Date(b.scheduledGrading || 0).getTime()) || (a.id - b.id);
}

function getName(user: User) {
  return `${user.lastName} ${user.firstName}`;
}

export function CommitteeStudentAssignation({ committees, sessionSettings }: CommitteeStudentAssignationProps) {
  const rowWidth = 535;
  const numberingColumnWidth = 35;
  const paperTitleColumnWidth = 140;
  const domainColumnWidth = 100;
  const scheduledGradingWidth = 100;
  const leftSpace = rowWidth - numberingColumnWidth - paperTitleColumnWidth - domainColumnWidth;

  return (
    <Document title="Repartizarea studenților pe comisii">
      <Page size="A4" style={[globalStyles.page, { paddingHorizontal: '1cm' }]}>
        {committees.map((committee, index) => {
          const groupedPapers = groupBy(committee.papers, paper => paper.type);
          const paperTypeString = Object.keys(groupedPapers).map(type => PAPER_TYPES[type]).sort((a, b) => b.localeCompare(a)).join("/");
          return (
            <View key={index} break={index > 0}>
              <View style={[globalStyles.section, { fontWeight: "bold" }]}>
                <View style={globalStyles.sectionColumn}>
                  <Text>UNIVERSITATEA DIN BUCUREȘTI</Text>
                  <Text>Facultatea de Matematică și Informatică</Text>
                </View>
                <View
                  style={[
                    globalStyles.sectionColumn,
                    { flexDirection: "row", justifyContent: "flex-end" },
                  ]}
                >
                  <Text>
                    {"\n"}Sesiunea{" "}
                    {sessionSettings.sessionName.toLocaleUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.title}>
                Programarea examenului de {paperTypeString}{"\n"}
                {committee.name}
              </Text>
              <View style={{ fontSize: 11 }}>
                <Row width={rowWidth} borderBottom>
                  <HeaderCell width={numberingColumnWidth} value="Nr. Crt." borderLeft />
                  <HeaderCell width={leftSpace / 2} value="Nume și prenume" />
                  <HeaderCell width={leftSpace / 2} value="Profesor coordonator" />
                  <HeaderCell width={paperTitleColumnWidth} value="Titlul lucrării" />
                  <HeaderCell width={domainColumnWidth} value="Domeniul" />
                  <HeaderCell width={scheduledGradingWidth} value="Programare" />
                </Row>
                {committee.papers.sort(sortFn).map((paper, index) => (
                  <Row key={index} width={rowWidth} borderBottom style={{ marginTop: -1 }}>
                    <Cell width={numberingColumnWidth} value={(index + 1).toString()} borderLeft />
                    <Cell width={leftSpace / 2} value={getName(paper.student).split('-').join(' ')} />
                    <Cell width={leftSpace / 2} value={getName(paper.teacher)} />
                    <Cell width={paperTitleColumnWidth} value={paper.title} />
                    <Cell width={domainColumnWidth} value={paper.student.specialization.domain.name} />
                    <Cell 
                      width={scheduledGradingWidth} 
                      value={paper.scheduledGrading?.toLocaleDateString('ro-RO', {
                        timeZone: 'Europe/Bucharest',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) || ''}
                    />
                  </Row>
                ))}
              </View>
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
