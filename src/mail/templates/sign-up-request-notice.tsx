import { Button, Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { MailScreen } from '../partials/mail-screen';
import { styles } from "../styles";
import { SignUpRequest } from '../../models/models';

interface EmailProps {
  signUpRequest: SignUpRequest;
  url: string;
}

export function SignUpRequestNotice({ signUpRequest, url }: EmailProps) {
  return (
    <MailScreen heading={`Cerere nouă de înregistrare de la ${signUpRequest.firstName} ${signUpRequest.lastName}`}>
      <Text style={styles.paragraph}>
        O nouă solicitare de înrolare în platforma de finalizare studii a fost transmisă.
      </Text>
      <Text style={styles.quoteParagraph}>
        <b>{signUpRequest.firstName} {signUpRequest.lastName.toLocaleUpperCase()}</b> <br/>
        <span>CNP: {signUpRequest.CNP}</span> <br/>
        <span>Număr matricol: {signUpRequest.identificationCode} ({signUpRequest.matriculationYear} - {signUpRequest.promotion})</span> <br/>
        <span>Specializare: {signUpRequest.specialization?.name} - {signUpRequest.studyForm.toLocaleUpperCase()}</span> <br/>
        <span>Grupă: {signUpRequest.group}</span>
      </Text>
      <Text style={styles.paragraph}>
        Pentru a viziona datele din cerere, a face modificări și a răspunde acestei solicitări, urmăriți link-ul de mai jos.
      </Text>
      <Section style={styles.buttonContainer}>
        <Button style={styles.button} href={url}>
          Răspundeți cererii
        </Button>
      </Section>
    </MailScreen>
  );
}
