import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { globalStyles } from "../global-styles";

interface Person {
  position: string;
  name: string;
  stamp?: boolean;
  column?: 'left' | 'right';
}

interface PeopleSignatureFooterProps {
  people: Person[];
}

export function PeopleSignatureFooter({ people }: PeopleSignatureFooterProps) {
  const leftPeople = people.filter(person => person.column === 'left');
  const rightPeople = people.filter(person => person.column === 'right');
  return (
    <View style={globalStyles.section}>
      {[leftPeople, rightPeople].map((people, index) => (
        people.length > 0 && (
          <View key={index} style={globalStyles.sectionColumn}>
            {people.map((person, index) => (
              <View key={index} style={{ flexDirection: 'column', alignItems: 'center' }}>
                <Text style={{ textAlign: 'center' }}>
                  {person.position},{'\n'}{person.name}
                </Text>
                {person.stamp && (
                  <Text style={{ fontWeight: 'bold', alignSelf: 'flex-start' }}>
                    {'\n'}L.S.
                  </Text>
                )}
                <Text>{'\n'}</Text>
              </View>
            ))}
          </View>
        )
      ))}

    </View>
  );
}