import { Button, Section, Text } from '@react-email/components';
import * as React from 'react';
import { MailScreen } from '../partials/mail-screen';
import { styles } from "../styles";
import { User } from '../../models/models';

interface EmailProps {
  user: User;
  url: string;
}

export function ResetPassword({ user, url }: EmailProps) {
  return (
    <MailScreen heading={`Bună ziua, ${user.firstName} ${user.lastName}!`}>
      <Text style={styles.paragraph}>
        Am primit o solicitare de resetare a parolei pentru contul asociat acestui e-mail ({user.email}).{'\n'}
        În cazul în care nu dvs. ați făcut această solicitare, puteți ignora acest mesaj.
      </Text>
      <Section style={styles.buttonContainer}>
        <Button style={styles.button} href={url}>
          Resetați parola
        </Button>
      </Section>
    </MailScreen>
  );
}
