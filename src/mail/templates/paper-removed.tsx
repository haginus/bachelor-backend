import { Button, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { MailScreen } from '../partials/mail-screen';
import { styles } from "../styles";
import { User } from '../../models/models';

interface EmailProps {
  studentUser: User;
  teacherUser: User;
  url: string;
}

export function PaperRemoved({ studentUser, teacherUser, url }: EmailProps) {
  return (
    <MailScreen heading={`Salutare, ${studentUser.firstName} ${studentUser.lastName}!`}>
      <Text style={styles.paragraph}>
        Din păcate, profesorul {teacherUser.firstName} {teacherUser.lastName} a rupt asocierea cu dumneavoastră.
      </Text>
      <Text style={styles.paragraph}>
        Vizualizați alte oferte accesând link-ul de mai jos:
      </Text>
      <Section style={styles.buttonContainer}>
        <Button style={styles.button} href={url}>
        Găsiți alt profesor
        </Button>
      </Section>
    </MailScreen>
  );
}
