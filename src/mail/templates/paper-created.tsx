import * as React from 'react';
import { Button, Link, Section, Text } from '@react-email/components';
import { MailScreen } from '../partials/mail-screen';
import { styles } from "../styles";
import { Paper } from 'src/papers/entities/paper.entity';

interface EmailProps {
  paper: Paper;
  url: string;
}

export default function PaperCreated({ paper, url }: EmailProps) {
  return (
    <MailScreen heading={`Salutare, ${paper.student.firstName} ${paper.student.lastName}!`}>
      <Text style={styles.paragraph}>
        Profesorul {paper.teacher.firstName} {paper.teacher.lastName} s-a asociat cu dvs. adăugând 
        lucrarea cu titlul „{paper.title}”.
      </Text>
      <Text style={styles.paragraph}>
        În cazul în care aceasta este o greșeală, contactați profesorul pentru
        a-i cere să rupă asocierea, fie folosind adresa{' '}
        <Link href={`mailto:${paper.teacher.email}`} style={styles.link}>{paper.teacher.email}</Link>{' '}
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
