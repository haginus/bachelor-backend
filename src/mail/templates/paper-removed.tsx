import * as React from 'react';
import { Button, Section, Text } from '@react-email/components';
import { MailScreen } from '../partials/mail-screen';
import { styles } from "../styles";
import { User } from '../../users/entities/user.entity';

interface EmailProps {
  student: User;
  teacher: User;
  url: string;
}

export default function PaperRemoved({ student, teacher, url }: EmailProps) {
  return (
    <MailScreen heading={`Salutare, ${student.firstName} ${student.lastName}!`}>
      <Text style={styles.paragraph}>
        Din păcate, profesorul {teacher.firstName} {teacher.lastName} a rupt asocierea cu dumneavoastră.
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
