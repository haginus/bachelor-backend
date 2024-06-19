import { Button, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { MailScreen } from '../partials/mail-screen';
import { styles } from "../styles";
import { DocumentReuploadRequest, Paper, User } from '../../models/models';
import { paperRequiredDocuments } from '../../paper-required-documents';
import { arrayMap } from '../../util/util';

interface EmailProps {
  user: User;
  requests: DocumentReuploadRequest[];
  url: string;
}

export function DocumentReuploadRequestNotice({ user, requests, url }: EmailProps) {
  const requiredDocuments = arrayMap(paperRequiredDocuments, (doc) => doc.name);
  const formatDate = (date: Date) => new Date(date).toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <MailScreen heading={`Solicitare de reîncărcare a documentelor`}>
      <Text style={styles.paragraph}>
        Salutare, {user.firstName} {user.lastName}! A fost emisă o solicitare de reîncărcare a
        unora dintre documentele lucrării dumneavoastră. Asigurați-vă că încărcați documentele corecte
        până la data limită.
      </Text>
      <Section>
        <Text style={styles.paragraph}>Aveți de încărcat următoarele documente:</Text>
        <ul>
          {requests.map((request, index) => (
            <li key={index}>
              <Text style={{ ...styles.paragraph, margin: '0', marginBottom: '8px' }}>
                {requiredDocuments[request.documentName].title} – până pe {formatDate(request.deadline)}
                {'\n'}
                <i style={{ fontSize: '13px' }}>{request.comment}</i>
              </Text>
            </li>
          ))}
        </ul>
      </Section>
      <Text style={styles.paragraph}>
        Accesați următorul link pentru a gestiona documentele lucrării dumneavoastră:
      </Text>
      <Section style={styles.buttonContainer}>
        <Button style={styles.button} href={url}>
          Lucrarea mea
        </Button>
      </Section>
    </MailScreen>
  );
}
