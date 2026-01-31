import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { globalStyles } from "../global-styles";
import { PAPER_TYPES } from "../constants";
import { Committee } from "src/grading/entities/committee.entity";
import { SessionSettings } from "src/common/entities/session-settings.entity";

interface CommitteeCompositionsProps {
  groups: Committee[][];
  sessionSettings: SessionSettings;
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 10,
  },
  groupHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  committee: {
    marginBottom: 8,
  },
  committeeTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  committeeRow: {
    flexDirection: 'row',
  },
  committeeRowFirstColumn: {
    width: 140,
  },
  committeeRowSecondColumn: {
    flex: 1,
  },
});

export function CommitteeCompositions({ groups, sessionSettings }: CommitteeCompositionsProps) {
  return (
    <Document title="Componență comisii și repartiții pe zile">
      <Page size="A4" style={globalStyles.page}>
        {groups.map((group, index) => {
          const domains = group[0].domains;
          const domainNames = domains.map((domain) => domain.name).join(', ');
          const domainType = domains[0].type;
          let groupHeader = `${domains.length > 1 ? 'Domeniile' : 'Domeniul'} ${domainNames} - comisii de ${PAPER_TYPES[domainType]} ${sessionSettings.sessionName}`;
          return (
            <View key={index} style={styles.group}>
              <Text style={styles.groupHeader}>
                {groupHeader}
              </Text>
              <View>
                {group.map((committee, index) => {
                  const president = committee.members.find(member => member.role == 'president')!;
                  const secretary = committee.members.find(member => member.role == 'secretary')!;
                  const members = committee.members.filter(member => member.role == 'member');
                  const rows: [string, string[]][] = [
                    ['Președinte', [president.teacher.fullName || '']],
                    ['Membri', members.map(member => member.teacher.fullName || '')],
                    ['Secretar', [secretary.teacher.fullName || '']],
                  ];
                  return (
                    <View key={index} style={styles.committee} wrap={false}>
                      <Text style={styles.committeeTitle}>
                        {committee.name}
                      </Text>
                      {committee.activityDays?.map(day => (
                        <Text key={day.id} style={{ fontStyle: 'italic' }}>
                          {[
                            day.location,
                            day.startTime?.toLocaleDateString('ro-RO', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          ].filter(str => !!str).join(' | ')}
                        </Text>
                      ))}
                      <View style={{ height: 4 }} />
                      {rows.map(([position, people], index) => (
                        <View style={styles.committeeRow} key={index}>
                          <Text style={styles.committeeRowFirstColumn}>
                            {position}:
                          </Text>
                          <View style={styles.committeeRowSecondColumn}>
                            {people.map((name, index) => (
                              <Text key={index}>
                                {name}
                              </Text>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </Page>
    </Document>
  );
}