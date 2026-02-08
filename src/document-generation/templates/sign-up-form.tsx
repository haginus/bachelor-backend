import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { globalStyles } from '../global-styles';
import { CIVIL_STATES, PAPER_TYPES } from '../constants'
import { FormHeader } from '../components/form-header';
import { DateAndSignature } from '../components/date-and-signature';
import { StudentDocumentGenerationProps } from '../../lib/interfaces/student-document-generation-props.interface';
import { GdprPage } from '../components/gdpr-page';
import { PageCount } from '../components/page-count';

const styles = StyleSheet.create({
  tableLabel: {
    fontWeight: 'bold',
    fontSize: 11,
    marginVertical: 4,
  },
});

export function SignUpForm({ student, paper, sessionSettings, signatureSample }: StudentDocumentGenerationProps) {
  const date = new Date();
  return (
    <Document title={`Cerere de înscriere - ${student.lastName} ${student.firstName}`}>
      <Page size="A4" style={globalStyles.page}>
        <PageCount />
        <FormHeader student={student} showIdentificationCode showMG />
        <Text style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '0.5cm' }}>
          FIȘĂ DE ÎNSCRIERE {'\n'}
          pentru examenul de finalizare a studiilor {'\n'}
          sesiunea {sessionSettings.sessionName.toLocaleUpperCase()}
        </Text>
        <Text style={styles.tableLabel}>Date personale</Text>
        <Row>
          <Cell width={115} value="Nume de familie la naștere" borderLeft={true} />
          <Cell width={145} value={student.extraData.birthLastName} />
          <Cell width={95} value="Nume de familie actual" />
          <Cell width={155} value={student.lastName} />
        </Row>
        <Row>
          <Cell width={115} value="Prenume" borderLeft={true} />
          <Cell width={240} value={student.firstName} />
          <Cell width={115} value="Inițiala tatălui/mamei" />
          <Cell width={40} value={student.extraData.parentInitial} />
        </Row>
        <Row>
          <Cell width={115} value="Fiul/fiica lui" borderLeft={true} />
          <Cell width={145} value={student.extraData.fatherName} />
          <Cell width={95} value="și" />
          <Cell width={155} value={student.extraData.motherName} />
        </Row>
        <Row>
          <Cell width={115} value="Data nașterii" borderLeft={true} />
          <Cell width={145} value={new Date(student.extraData.dateOfBirth).toLocaleDateString('ro-RO')} />
          <Cell width={95} value="Stare civilă" />
          <Cell width={155} value={CIVIL_STATES[student.extraData.civilState]} />
        </Row>
        <Row>
          <Cell width={115} value="Cetățenie" borderLeft={true} />
          <Cell width={395} value={student.extraData.citizenship} />
        </Row>
        <Row borderBottom={true}>
          <Cell width={115} value="Etnie" borderLeft={true} />
          <Cell width={145} value={student.extraData.ethnicity} />
          <Cell width={95} value="CNP" />
          <Cell width={155} value={student.CNP || ''} />
        </Row>
        <Text style={styles.tableLabel}>Locul nașterii</Text>
        <Row>
          <Cell width={85} value="Țara" borderLeft={true} />
          <Cell width={175} value={student.extraData.placeOfBirthCountry} />
          <Cell width={95} value="Județ/Sector" />
          <Cell width={155} value={student.extraData.placeOfBirthCounty} />
        </Row>
        <Row borderBottom={true}>
          <Cell width={85} value="Localitatea" borderLeft={true} />
          <Cell width={425} value={student.extraData.placeOfBirthLocality} />
        </Row>
        <Text style={styles.tableLabel}>Date de contact</Text>
        <Row>
          <Cell width={85} value="Telefon fix" borderLeft={true} />
          <Cell width={175} value={student.extraData.landline} />
          <Cell width={95} value="Telefon mobil" />
          <Cell width={155} value={student.extraData.mobilePhone} />
        </Row>
        <Row borderBottom={true}>
          <Cell width={85} value="E-mail" borderLeft={true} />
          <Cell width={425} value={student.email} />
        </Row>
        <Text style={{ fontWeight: 'bold', marginTop: 15 }}>
          Titlul lucrării de {PAPER_TYPES[paper.type]}:
        </Text>
        <Text style={{ marginTop: 10, fontStyle: 'italic' }}>
          {paper.title}
        </Text>
        <View style={{ marginTop: 10, flexDirection: 'row' }}>
          <Text style={{ fontWeight: 'bold' }}>
            Coordonator științific:{' '}
          </Text>
          <Text>
            {paper.teacher!.lastName} {paper.teacher!.firstName}
          </Text>
        </View>
        <DateAndSignature date={date} signatureSample={signatureSample} />
      </Page>
      <GdprPage />
    </Document>
  );
}

interface RowProps {
  children: React.ReactNode;
  borderBottom?: boolean;
}

function Row({ children, borderBottom = false }: RowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        borderBottomWidth: borderBottom ? 1 : 0,
        borderColor: '#000',
        width: 510,
      }}
    >
      {children}
    </View>
  );
}

interface CellProps {
  value: string;
  width: number;
  borderLeft?: boolean;
  style?: React.ComponentProps<typeof View>['style'];
}

function Cell({ value, width, borderLeft = false }: CellProps) {
  return (
    <View 
      style={{ 
        paddingHorizontal: 5,
        borderColor: '#000',
        borderWidth: 1,
        width,
        borderLeftWidth: borderLeft ? 1 : 0,
        borderBottomWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        fontSize: 11,
      }}
    >
      <Text>{value}</Text>
    </View>
  )
}