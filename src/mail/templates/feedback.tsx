import { Text } from '@react-email/components';
import * as React from 'react';
import { MailScreen } from '../partials/mail-screen';
import { styles } from "../styles";
import { FeedbackDto } from '../../feedback/feedback.dto';

interface EmailProps {
  report: FeedbackDto;
}

export default function Feedback({ report }: EmailProps) {
  const FEEDBACK_TYPES = {
    data: "Inadvertențe ale datelor",
    feedback: "Feedback",
    bug: "Raportare de probleme tehnice",
    question: "Întrebări cu privire la platformă",
  } as const;
  return (
    <MailScreen heading={`Tichet nou de la ${report.user.firstName} ${report.user.lastName} (${report.replyToEmail})`}>
      <Text style={styles.quoteParagraph}>
        <b>{FEEDBACK_TYPES[report.type]}</b>{'\n'}
        <i>{report.description}</i>
      </Text>
    </MailScreen>
  );
}
