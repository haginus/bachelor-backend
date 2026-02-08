import { Button, Section, Text } from '@react-email/components';
import * as React from 'react';
import { MailScreen } from '../partials/mail-screen';
import { styles } from "../styles";
import { User } from '../../users/entities/user.entity';
import { Application } from '../../offers/entities/application.entity';

interface EmailProps {
  studentUser: User;
  teacherUser: User;
  application: Application;
  url: string;
}

export default function ApplicationRejected({ studentUser, teacherUser, application, url }: EmailProps) {
  return (
    <MailScreen heading={`Salutare, ${studentUser.firstName} ${studentUser.lastName}!`}>
      <Text style={styles.paragraph}>
        Din păcate, profesorul {teacherUser.firstName} {teacherUser.lastName} a respins 
        cererea dvs. de asociere cu titlul „{application.title}”.{'\n\n'}
        Vizualizați alte oferte accesând link-ul de mai jos:
      </Text>
      <Section style={styles.buttonContainer}>
        <Button style={styles.button} href={url}>
          Vedeți ofertele
        </Button>
      </Section>
    </MailScreen>
  );
}
