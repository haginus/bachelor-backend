import { Button, Section, Text } from '@react-email/components';
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

export function ApplicationAccepted({ studentUser, teacherUser, application, url }: EmailProps) {
  return (
    <MailScreen heading={`Salutare, ${studentUser.firstName} ${studentUser.lastName}!`}>
      <Text style={styles.paragraph}>
        Vești bune! Profesorul {teacherUser.firstName} {teacherUser.lastName} a acceptat 
        cererea dvs. de asociere cu titlul „{application.title}”.{'\n\n'}
        Accesați următorul link pentru a vă gestiona lucrarea:
      </Text>
      <Section style={styles.buttonContainer}>
        <Button style={styles.button} href={url}>
          Lucrarea mea
        </Button>
      </Section>
    </MailScreen>
  );
}
