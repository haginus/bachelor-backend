import React from 'react';
import { Page, Text, Document, StyleSheet } from '@react-pdf/renderer';
import { FormHeader } from '../components/form-header';
import { globalStyles } from '../global-styles';
import { GraduateStatementText } from '../components/graduate-statement-text';
import { DOMAIN_TYPES, PAPER_TYPES } from '../constants';
import { DateAndSignature } from '../components/date-and-signature';
import { StudentDocumentGenerationProps } from '../types';

const styles = StyleSheet.create({
  footerNote: {
    position: 'absolute',
    left: globalStyles.page.paddingHorizontal,
    bottom: '3cm',
    fontSize: 10,
  },
});

export function LiquidationForm({ student, extraData, paper, sessionSettings, signatureSample }: StudentDocumentGenerationProps) {
  return (
    <Document title={`Formular de lichidare - ${student.user.lastName} ${student.user.firstName}`}>
      <Page size="A4" style={globalStyles.page}>
        <FormHeader student={student} />
        <Text style={{ textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginBottom: '0.5cm' }}>
          Domnule rector,
        </Text>
        <Text>
          Subsemnatul (a) {student.user.lastName} {student.user.firstName}, născut(ă) în{' '}
          {new Date(extraData.dateOfBirth).toLocaleDateString('ro-RO')} în localitatea {extraData.placeOfBirthLocality},
          județul/sectorul {extraData.placeOfBirthCounty}, țara {extraData.placeOfBirthCountry},
          având codul numeric personal {student.user.CNP}, absolvent(ă) de studii universitare de{' '}
          {DOMAIN_TYPES[student.domain.type]}, programul de studii {student.specialization.name},
          cu examen de {PAPER_TYPES[paper.type]} promovat în sesiunea{' '}
          {sessionSettings.sessionName.toLocaleUpperCase()}, 
          vă rog să binevoiți a-mi aproba eliberarea diplomei de studii.
        </Text>
        <Text style={{ marginTop: 10 }}>
          Domiciliez în localitatea {extraData.address.locality}, sector/județ {extraData.address.county},
          strada {extraData.address.street}, numărul {extraData.address.streetNumber},
          {
            extraData.address.building 
              ? ` bloc ${extraData.address.building}, scara ${extraData.address.stair}, etaj ${extraData.address.floor}, apartament ${extraData.address.apartment},`
              : ''
          }
          {' '}telefon {extraData.mobilePhone}, e-mail {extraData.personalEmail}.
        </Text>
        <GraduateStatementText style={{ marginTop: 10 }} />
        <DateAndSignature date={new Date()} signatureSample={signatureSample} />
        <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: 'bold', marginVertical: '1cm' }}>
          ARE/NU ARE DEBITE{'\n'}
          (se completează de către serviciile menționate¹)
        </Text>
        <Text style={{ fontStyle: 'italic', lineHeight: 2.5 }}>
          Biblioteca _____________________________________________________________________
        </Text>
        <Text>{'\n'}</Text>
        <Text style={{ fontStyle: 'italic', lineHeight: 2.5 }}>
          Serviciul social _________________________________________________________________
          ______________________________________________________________________________
        </Text>
        <Text style={styles.footerNote}>
          __________________________
          {'\n'}
          ¹ Pentru promoția {sessionSettings.currentPromotion}, secretarul de an avizează fișa de lichidare, 
          pe baza tabelelor completate și asumate de către Bibliotecă și Servicul Social al Universității din București.
        </Text> 
      </Page>
    </Document>
  );
}
