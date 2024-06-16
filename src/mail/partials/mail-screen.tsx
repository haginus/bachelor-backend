import { Container, Head, Html, Preview, Section } from '@react-email/components';
import * as React from 'react';
import { Footer } from './footer';
import { Header } from './header';
import { styles } from "../styles";

interface MailScreenProps {
  heading?: string;
  children?: React.ReactNode;
}

export function MailScreen({ heading, children }: MailScreenProps) {
  return (
    <Html>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600&display=swap" rel="stylesheet" />
      </Head>
      { heading && <Preview>{heading}</Preview> }
      <Section style={styles.main}>
        <Container style={styles.container}>
          <Header heading={heading} />
          {children}
          <Footer />
        </Container>
      </Section>
    </Html>
  );
}
