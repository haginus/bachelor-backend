import React from 'react';
import { Page, Text, Document, StyleSheet } from '@react-pdf/renderer';
import { PAPER_TYPES } from '../constants';
import { DateAndSignature } from '../components/date-and-signature';
import { StudentDocumentGenerationProps } from '../types';

const styles = StyleSheet.create({
  page: {
    fontSize: 12,
    fontFamily: 'Liberation Serif',
    padding: '2cm',
  },
});

export function StatutoryDeclaration({ student, paper, sessionSettings }: StudentDocumentGenerationProps) {
  return (
    <Document title={`Declarație pe proprie răspundere - ${student.user.lastName} ${student.user.firstName}`}>
      <Page size="A4" style={[styles.page]}>
        <Text style={{ textAlign: 'right', marginBottom: '1cm' }}>
          (Acest document se leagă împreună cu lucrarea de {PAPER_TYPES[paper.type]})
        </Text>
        <Text style={{ textAlign: 'center', fontSize: 22, fontWeight: 'bold', marginBottom: '0.5cm' }}>
          Declarație
        </Text>
        <Text style={{ fontSize: 14, textAlign: 'justify' }}>
          Subsemnatul/Subsemnata {student.user.lastName} {student.user.firstName}, candidat la examenul de{' '}
          {PAPER_TYPES[paper.type]}, sesiunea {sessionSettings.sessionName.toLocaleUpperCase()},
          la Facultatea de Matematică şi Informatică, programul de studii {student.specialization.name},
          declar pe propria răspundere că lucrarea de faţă este rezultatul muncii mele, pe baza cercetărilor mele 
          și pe baza informaţiilor obţinute din surse care au fost citate şi indicate, conform normelor etice,
          în note și în bibliografie.
          Declar că nu am folosit în mod tacit sau ilegal munca altora și că nici o parte din teză nu încalcă
          drepturile de proprietate intelectuală ale altcuiva, persoană fizică sau juridică. 
          Declar că lucrarea nu a mai fost prezentată sub această formă vreunei instituții de învățământ 
          superior în vederea obţinerii unui grad sau titlu științific ori didactic.
        </Text>
        <DateAndSignature date={new Date()} />
      </Page>
    </Document>
  );
}
