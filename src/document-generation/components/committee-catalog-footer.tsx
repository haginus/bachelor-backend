import React from "react";
import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { globalStyles } from "../global-styles";
import { Committee } from "src/grading/entities/committee.entity";

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
  const president = committee.members.find(member => member.role == 'president');
  const secretary = committee.members.find(member => member.role == 'secretary');
  const members = committee.members.filter(member => member.role == 'member');
  return (
    <View style={[globalStyles.section, { fontSize: 12 }]}>
      <View style={styles.column}>
        {!minified && <Text>{committee.name}{'\n\n'}</Text>}
        <Text style={{ textAlign: 'center' }}>
          Președinte,{'\n'}{president?.teacher.fullName}
        </Text>
      </View>
      <View style={styles.column}>
        {!minified && (
          <>
            <Text>Membri,</Text>
            {members.map(member => (
              <Text key={member.teacher.id}>{member.teacher.fullName}</Text>
            ))}
            <Text>{'\n'}</Text>
          </>
        )}
        <Text style={{ textAlign: 'center' }}>
          Secretar,{'\n'}{secretary?.teacher.fullName}
        </Text>
      </View>
    </View>
  );
}