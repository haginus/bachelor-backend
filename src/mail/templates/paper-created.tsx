import { Button, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { MailScreen } from '../partials/mail-screen';
import { styles } from "../styles";
import { Paper, User } from '../../models/models';

interface EmailProps {
  studentUser: User;
  teacherUser: User;
  paper: Paper;
  url: string;
}

export function PaperCreated({ studentUser, teacherUser, paper, url }: EmailProps) {
  return (
    <MailScreen heading={`Salutare, ${studentUser.firstName} ${studentUser.lastName}!`}>
      <Text style={styles.paragraph}>
        Profesorul {teacherUser.firstName} {teacherUser.lastName} s-a asociat cu dvs. adăugând 
        lucrarea cu titlul „{paper.title}”.
      </Text>
      <Text style={styles.paragraph}>
        În cazul în care aceasta este o greșeală, contactați profesorul pentru
        a-i cere să rupă asocierea, fie folosind adresa{' '}
        <Link href={`mailto:${teacherUser.email}`} style={styles.link}>{teacherUser.email}</Link>{' '}
        fie dând reply acestui e-mail.
      </Text>
      <Text style={styles.paragraph}>
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
