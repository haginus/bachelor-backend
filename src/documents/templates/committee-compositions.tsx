import React from "react";
import { Committee, SessionSettings } from "../../models/models";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { globalStyles } from "../global-styles";
import { PAPER_TYPES } from "../constants";

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
    marginBottom: 5,
  },
  committeeTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
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
    <Document title="Componență comisii">
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
                  const president = committee.members.find(member => member.committeeMember.role == 'president');
                  const secretary = committee.members.find(member => member.committeeMember.role == 'secretary');
                  const members = committee.members.filter(member => member.committeeMember.role == 'member');
                  const rows: [string, string[]][] = [
                    ['Președinte', [president?.user?.fullName || '']],
                    ['Membri', members.map(member => member.user.fullName || '')],
                    ['Secretar', [secretary?.user?.fullName || '']],
                  ];
                  return (
                    <View key={index} style={styles.committee} wrap={false}>
                      <Text style={styles.committeeTitle}>
                        {committee.name}
                      </Text>
                      {rows.map(([position, people], index) => (
                        <View style={styles.committeeRow}>
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