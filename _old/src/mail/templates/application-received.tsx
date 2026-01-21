import { Button, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { MailScreen } from '../partials/mail-screen';
import { styles } from "../styles";
import { Application, User } from '../../models/models';

interface EmailProps {
  studentUser: User;
  teacherUser: User;
  application: Application;
  url: string;
}

export function ApplicationReceived({ studentUser, teacherUser, application, url }: EmailProps) {
  return (
    <MailScreen heading={`Bună ziua, ${teacherUser.firstName} ${teacherUser.lastName}!`}>
      <Text style={styles.paragraph}>
        Aveți o nouă cerere de asociere de la {studentUser.firstName} {studentUser.lastName}.
      </Text>
      <Text style={styles.quoteParagraph}>
        <b>{application.title}</b>{'\n'}
        <i>{application.description}</i>{'\n'}
        {application.usedTechnologies && (
          <span style={{ marginTop: 12, display: 'block' }}>
            Tehnologii folosite: <i>{application.usedTechnologies}</i>
          </span>
        )}
      </Text>
      <Text style={styles.paragraph}>
        În cazul în care aveți întrebări suplimentare legate de tema studentului, îl puteți contacta la adresa{' '}
        <Link href={`mailto:${studentUser.email}`} style={styles.link}>{studentUser.email}</Link>{' '}
        sau dând reply acestui e-mail.
      </Text>
      <Text style={styles.paragraph}>
        Răspundeți cererii de asociere accesând link-ul de mai jos:
      </Text>
      <Section style={styles.buttonContainer}>
        <Button style={styles.button} href={url}>
          Răspundeți cererii
        </Button>
      </Section>
    </MailScreen>
  );
}
