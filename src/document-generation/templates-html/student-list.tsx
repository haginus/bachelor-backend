import React from 'react';
import { Domain } from 'src/users/entities/domain.entity';
import { Student } from 'src/users/entities/user.entity';

interface StudentListProps {
  domain: Domain;
  students: Student[];
}

export function StudentList({ domain, students }: StudentListProps) {
  return (
    <html>
      <head>
        <title>{`Listă studenți - ${domain.name}`}</title>
      </head>
      <body>
        <h1 style={styles.header}>Listă studenți</h1>
        <h1 style={styles.header}>Domeniul {domain.name}</h1>
        <table style={styles.table}>
          <tr style={styles.tableBorder}>
            <th style={styles.tableBorder}>Nr. crt.</th>
            <th style={styles.tableBorder}>Nume</th>
            <th style={styles.tableBorder}>Prenume</th>
            <th style={styles.tableBorder}>Specializare</th>
            <th style={styles.tableBorder}>Grupă</th>
            <th style={styles.tableBorder}>Titlu lucrare</th>
            <th style={styles.tableBorder}>Profesor coordonator</th>
            <th style={styles.tableBorder}>Comisie</th>
            <th style={styles.tableBorder}>Notă lucrare</th>
            <th style={styles.tableBorder}>Documente</th>
          </tr>
          {students.map((student, i) => {
            let dataLink = `${student.group}_${student.fullName}`;
            return (
              <tr key={student.id} style={styles.tableBorder}>
                <td style={styles.tableCell}>{i + 1}.</td>
                <td style={styles.tableCell}>{student.lastName}</td>
                <td style={styles.tableCell}>{student.firstName}</td>
                <td style={styles.tableCell}>{student.specialization.name}</td>
                <td style={styles.tableCell}>{student.group}</td>
                <td style={styles.tableCell}>{student.paper?.title}</td>
                <td style={styles.tableCell}>{student.paper?.teacher?.fullName}</td>
                <td style={styles.tableCell}>{student.paper?.committee?.name}</td>
                <td style={styles.tableCell}>{student.paper?.gradeAverage}</td>
                <td style={styles.tableCell}>
                  <a href={dataLink} target="_blank">
                    Vezi documentele
                  </a>
                </td>
              </tr>
            );
          })}
        </table>
      </body>
    </html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    fontSize: '18pt',
    textAlign: 'center'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '10pt'
  },
  tableBorder: {
    border: '1px solid black'
  },
  tableCell: {
    border: '1px solid black',
    textAlign: 'center'
  }
};
