import React from "react";
import { Committee } from "../../models/models";
import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { globalStyles } from "../global-styles";

interface CommitteeCatalogFooterProps {
  committee: Committee;
  minified?: boolean;
}

const styles = StyleSheet.create({
  column: {
    ...globalStyles.sectionColumn,
    flexDirection: 'column',
    alignItems: 'center',
  }
});

export function CommitteeCatalogFooter({ committee, minified = false }: CommitteeCatalogFooterProps) {
  const president = committee.members.find(member => member.committeeMember.role == 'president');
  const secretary = committee.members.find(member => member.committeeMember.role == 'secretary');
  const members = committee.members.filter(member => member.committeeMember.role == 'member');
  return (
    <View style={[globalStyles.section, { fontSize: 12 }]}>
      <View style={styles.column}>
        {!minified && <Text>{committee.name}{'\n\n'}</Text>}
        <Text style={{ textAlign: 'center' }}>
          Președinte,{'\n'}{president.user.fullName}
        </Text>
      </View>
      <View style={styles.column}>
        {!minified && (
          <>
            <Text>Membri,</Text>
            {members.map(member => (
              <Text key={member.user.id}>{member.user.fullName}</Text>
            ))}
            <Text>{'\n'}</Text>
          </>
        )}
        <Text style={{ textAlign: 'center' }}>
          Secretar,{'\n'}{secretary.user.fullName}
        </Text>
      </View>
    </View>
  );
}