import { Button, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { MailScreen } from '../partials/mail-screen';
import { styles } from "../styles";
import { User } from '../../models/models';
import { ProblemReport } from '../../controllers/user.controller';

interface EmailProps {
  user: User;
  report: ProblemReport;
}

export function Feedback({ user, report }: EmailProps) {
  const PROBLEM_TYPES = {
    data: "Inadvertențe ale datelor",
    feedback: "Feedback",
    bug: "Raportare de probleme tehnice",
    question: "Întrebări cu privire la platformă",
  } as const;
  return (
    <MailScreen heading={`Tichet nou de la ${user.firstName} ${user.lastName} (${report.email})`}>
      <Text style={styles.quoteParagraph}>
        <b>{PROBLEM_TYPES[report.type]}</b>{'\n'}
        <i>{report.description}</i>
      </Text>
    </MailScreen>
  );
}
