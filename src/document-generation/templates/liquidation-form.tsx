import React from 'react';
import { Page, Text, Document, StyleSheet } from '@react-pdf/renderer';
import { FormHeader } from '../components/form-header';
import { globalStyles } from '../global-styles';
import { DOMAIN_TYPES, PAPER_TYPES } from '../constants';
import { DateAndSignature } from '../components/date-and-signature';
import { GdprPage } from '../components/gdpr-page';
import { PageCount } from '../components/page-count';
import { StudentDocumentGenerationProps } from 'src/lib/interfaces/student-document-generation-props.interface';

const styles = StyleSheet.create({
  footerNote: {
    position: 'absolute',
    left: globalStyles.page.paddingHorizontal,
    right: globalStyles.page.paddingHorizontal,
    bottom: '3cm',
    fontSize: 10,
  },
});

export function LiquidationForm({ student, paper, sessionSettings, signatureSample }: StudentDocumentGenerationProps) {
  return (
    <Document title={`Formular de lichidare - ${student.lastName} ${student.firstName}`}>
      <Page size="A4" style={globalStyles.page}>
        <PageCount />
        <FormHeader student={student} />
        <Text style={{ textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginBottom: '0.5cm' }}>
          Domnule rector,
        </Text>
        <Text>
          Subsemnatul (a) {student.lastName} {student.firstName}, născut(ă) în{' '}
          {new Date(student.extraData.dateOfBirth).toLocaleDateString('ro-RO')} în localitatea {student.extraData.placeOfBirthLocality},
          județul/sectorul {student.extraData.placeOfBirthCounty}, țara {student.extraData.placeOfBirthCountry},
          având codul numeric personal {student.CNP || '-'}, absolvent(ă) de studii universitare de{' '}
          {DOMAIN_TYPES[student.specialization.domain.type]}, programul de studii {student.specialization.name},
          cu examen de {PAPER_TYPES[paper.type]} promovat în sesiunea{' '}
          {sessionSettings.sessionName.toLocaleUpperCase()}, 
          vă rog să binevoiți a-mi aproba eliberarea diplomei de studii.
        </Text>
        <Text style={{ marginTop: 10 }}>
          Domiciliez în localitatea {student.extraData.address.locality}, sector/județ {student.extraData.address.county},
          strada {student.extraData.address.street}, numărul {student.extraData.address.streetNumber},
          {
            student.extraData.address.building 
              ? ` bloc ${student.extraData.address.building}, scara ${student.extraData.address.stair}, etaj ${student.extraData.address.floor}, apartament ${student.extraData.address.apartment},`
              : ''
          }
          {' '}telefon {student.extraData.mobilePhone}, e-mail {student.extraData.personalEmail}.
        </Text>
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
      <GdprPage />
    </Document>
  );
}
