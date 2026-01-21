import React from "react";
import { Link, Page, StyleSheet } from "@react-pdf/renderer";
import { globalStyles } from "../global-styles";
import { ListItem } from "./list-item";
import { Text } from "./text";
import { PageCount } from "./page-count";

export function GdprPage() {
  return (
    <Page size="A4" style={[globalStyles.page, { paddingBottom: '2cm' }]}>
      <PageCount />
      <Text style={styles.annexText}>Anexă</Text>
      <Text style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '1cm', marginBottom: '0.7cm' }}>
        Informare privind confidențialitatea datelor cu caracter personal
      </Text>

      <Text style={styles.paragraph}>
        Conform Regulamentului UE 679/2016 privind protecția persoanelor fizice în ceea ce privește
        prelucrarea datelor cu caracter personal,{' '}
        <B>Universitatea din București</B> este un operator de date.
      </Text>

      <Text style={styles.heading}>1. De ce colectăm informații despre dumoneavoastră</Text>
      <Text style={styles.paragraph}>
        <B>Universitatea din București</B> colectează și prelucrează datele dumneavoastră cu caracter personal
        în scopul îndeplinirii atribuțiilor legale ce îi revin conform legii, respectiv în scopul furnizării
        serviciilor educaționale.
      </Text>
      <Text style={[styles.paragraph, { marginBottom: '0cm' }]}>
        În cazul concursului de finalizare a studiilor, universitatea colectează și prelucrează datele
        cu caracter personal (nume, prenume, CNP, serie și număr CI, domiciliu, situație școlară,
        adresă de e-mail personală, ș.a.m.d.) în următoarele scopuri:
      </Text>
      <ListItem>înscrierea absolvenților prin depunerea documentelor la sediile facultăților;</ListItem>
      <ListItem>verificarea datelor din dosarele depuse;</ListItem>
      <ListItem>accesarea pe baza consimțământului absolventului a datelor din RMU;</ListItem>
      <ListItem>
        organizarea examenelor de finalizare a studiilor în vederea evaluării și testării cunoștințelor 
        și a competențelor candidaților. În cazul în care examenul se desfășoară on-line, pentru a exista 
        dovada susținerii acestuia, întregul examen este înregistrat audio-video;
      </ListItem>
      <ListItem>
        transmiterea rezultatelor concursului către Serviciul Acte de Studii, Recunoaștere și 
        Echivalare Studii pentru întocmirea și eliberarea diplomelor de finalizare.
      </ListItem>
      <Text style={[styles.paragraph, { marginTop: '0.5cm' }]}>
        Ulterior examenului de finalizare a studiilor, datele absolvenților pot fi utilizate pentru statistici 
        și analize necesare pentru realizarea strategiei de promovare a Universității din București.
      </Text>
      <Text style={styles.paragraph}>
        Universitatea din București are obligația legală a colectării acestor date cu caracter personal pentru 
        îndeplinirea scopurilor menționate mai sus, iar refuzul dumneavoastră de a furniza aceste date poate 
        duce la dificultăți în funcționarea și organizarea serviciilor educaționale.
      </Text>

      <Text style={styles.heading}>2. Temeiul juridic al prelucrărilor de date cu caracter personal</Text>

      <Text style={[styles.paragraph, { marginBottom: '0cm' }]}>
        Temeiul prelucrării datelor cu caracter personal este acela al îndeplinirii unor obligații legale 
        de către operator, obligații stabilite de următoarele acte normative:
      </Text>
      <ListItem>Legea învățământului superior nr.199/2023;</ListItem>
      <ListItem>Regulamentul privind activitatea profesională a studenților din UB;</ListItem>
      <ListItem>
        Regulamment de organizare și desfășurare a examenelor de finalizare a studiilor universitare 
        de licență și masterat a UB;
      </ListItem>
      <ListItem>Codul drepturilor și  obligațiilor studentului a UB;</ListItem>
      <ListItem>Regulamentul de organizare și funcționare al UB (ROF);</ListItem>
      <ListItem>Regulament UE 679/2016 – GDPR.</ListItem>

      <Text style={[styles.heading, { marginTop: '0.5cm' }]}>
        3. Categoriile de destinatari ai datelor cu caracter personal
      </Text>
      <Text style={styles.paragraph}>
        <B>Universitatea din București</B> are obligația de a furniza o serie de informații către autoritățile 
        competente. Există cazuri în care trebuie să transmitem informații către MEC sau alte instituții ale statului.
      </Text>
      <Text style={styles.heading}>4. Cum protejăm informațiile confidențiale colectate</Text>
      <Text style={styles.paragraph}>
        Informațiile colectate despre dumneavoastră sunt păstrate în formă scrisă și / sau în formă electronică.
        Vă asigurăm că informațiile pe care le deținem sunt păstrate în locații sigure, cu un nivel de securitate 
        adecvat și cu accesul permis doar personalului autorizat. Informatiile utilizate pentru statistici sunt anonimizate.
      </Text>
      <Text style={styles.paragraph}>
        În ceea ce privește colaborările avute, ne asigurăm că persoanele împuternicite sunt obligate din punct de vedere 
        contractual să implementeze un nivel ridicat de măsuri tehnice și organizatorice de protecție a datelor, în cazul
        în care datele prelucrate de aceasta identifică sau ar putea identifica o persoană.
      </Text>

      <Text style={styles.heading}>5. Locația de stocare și durata de stocare</Text>
      <Text style={styles.paragraph}>
        Datele cu caracter personal colectate sunt stocate pe serverele Universității din București sau în locații 
        din interiorul acesteia. Durata de stocare pentru fiecare categorie de date cu caracter personal este în 
        conformitate cu cerințele legale, cu reglementările interne ale Universității din București și cu cele 
        mai bune practici din acest domeniu.
      </Text>
      <Text style={styles.heading}>6. Drepturi legate de prelucrarea datelor cu caracter personal</Text>
      <Text style={styles.paragraph}>
        <Text>
          Conform Regulamentului UE 679 / 2016, aveți următoarele drepturi: informare, acces la datele personale care 
          vă privesc, rectificarea sau ștergerea acestora, restricționarea prelucrării, dreptul de a vă opune prelucrării,
          precum și dreptul la portabilitatea datelor. În plus, aveți dreptul de a vă adresa instanței de judecată competente.
          Disponibilitatea acestor drepturi depinde de justificarea legală a prelucrării. În cazul în care prelucrarea datelor
          cu caracter personal se bazează pe consimțământul dumneavoastră, aveți dreptul de a retrage consimțământul în orice
          moment, fără a afecta legalitatea prelucrării efectuate pe baza consimțământului înainte de retragerea acestuia.{'\n'}
          Conform Regulamentului 679 / 2016, aveți dreptul de a depune o plângere la Autoritatea Națională de Supraveghere
          a Prelucrării Datelor cu Caracter Personal. Mai multe detalii se pot obține accesând adresa{' '}
          <Link style={globalStyles.link} href="https://www.dataprotection.ro">https://www.dataprotection.ro</Link>. {'\n'}
        </Text>
        <Text style={{ fontStyle: 'italic' }}>
          În interpretarea lor, drepturile enumerate mai sus se vor corela cu paragraful de la pct.1 „Pentru înscrierea la unul din 
          concursurile de admitere organizate de către Universitate este necesar să furnizați aceste date cu caracter personal,
          refuzul furnizării acestora, ne pune în imposibilitatea de a vă înscrie la concurs. Totodată refuzul furnizării datelor
          va duce la neîndeplinirea condițiilor legale de prezentare la concurs sau de susținere a acestuia.”.
        </Text>
      </Text>
      <Text style={styles.paragraph}>
        Pentru a vă exercita drepturile sau pentru a vă actualiza informațiile existente, vă rugăm să ne contactați prin intermediul 
        adresei de e-mail dpo@unibuc.ro. 
      </Text>
    </Page>
  )
}

function B(props: React.ComponentProps<typeof Text>) {
  return <Text {...props} style={[{ fontWeight: 'bold' }, props.style as any]} />
}

const styles = StyleSheet.create({
  annexText: {
    fontStyle: 'italic',
    position: 'absolute',
    top: '0.7cm',
    right: '1.5cm',
  },
  paragraph: {
    marginBottom: '0.5cm',
    textAlign: 'justify',
  },
  heading: {
    fontWeight: 'bold',
  }
})