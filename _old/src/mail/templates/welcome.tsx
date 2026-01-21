import { Button, Section, Text } from '@react-email/components';
import * as React from 'react';
import { MailScreen } from '../partials/mail-screen';
import { styles } from "../styles";
import { User } from '../../models/models';

interface EmailProps {
  user: User;
  url: string;
}

export function Welcome({ user, url }: EmailProps) {
  return (
    <MailScreen heading={`Bun venit, ${user.firstName} ${user.lastName}!`}>
      <Text style={styles.paragraph}>
        Ați fost înscris în Platforma de finalizare studii a 
        Facultății de Matematică și Informatică din cadrul Universității din București. {'\n\n'}
        Pentru a finaliza înregistrarea, este nevoie să apăsați pe link-ul de mai jos:
      </Text>
      <Section style={styles.buttonContainer}>
        <Button style={styles.button} href={url}>
          Activați contul
        </Button>
      </Section>
    </MailScreen>
  );
}
