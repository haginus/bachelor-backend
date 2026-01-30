import * as Word from "docx";
import { DOMAIN_TYPES, PAPER_TYPES } from "./constants";
import { Committee } from "src/grading/entities/committee.entity";
import { Paper } from "src/papers/entities/paper.entity";
import { SessionSettings } from "src/common/entities/session-settings.entity";
import { gradeAverageString } from "./utils";
import { filterFalsy } from "src/lib/utils";

interface TableCellOptions {
  text: string;
  bold?: boolean;
  rowSpan?: number;
  colSpan?: number;
  width?: Word.ITableWidthProperties;
  fill?: string;
  alignment?: Word.ITableOptions['alignment'];
  size?: number;
}

const TableCell = (options: TableCellOptions) => {
  return new Word.TableCell({
    margins: {
      top: 25,
      right: 25,
      bottom: 25,
      left: 25,
    },
    rowSpan: options.rowSpan,
    columnSpan: options.colSpan,
    verticalAlign: Word.VerticalAlign.CENTER,
    width: options.width,
    shading: {
      fill: options.fill
    },
    children: [
      new Word.Paragraph({
        alignment: options.alignment || Word.AlignmentType.CENTER,
        children: [
          new Word.TextRun({ text: options.text, bold: options.bold, size: options.size }),
        ],
      }),
    ],
  });
}

const Percent = (size: number) => ({
  size,
  type: Word.WidthType.PERCENTAGE,
});

export async function CommitteeCatalog({ committee, paperGroups, sessionSettings }: { committee: Committee, paperGroups: Paper[][], sessionSettings: SessionSettings }) {
  const document = new Word.Document({
    sections: paperGroups.map(group => {
      const referencePaper = group[0];
      const specialization = referencePaper.student.specialization;
      const domain = specialization.domain;
      let studyYears = specialization.studyYears;
      let creditNumber = 60 * studyYears;
      let studyDurationString = `${studyYears} ani (${studyYears * 2} semestre)`;
      let paperType = referencePaper.type;
      let domainType = domain.type;
      let domainTypeString = DOMAIN_TYPES[domainType];
      let paperTypeString = PAPER_TYPES[paperType];

      const gradingMembers = committee.members.filter(m => m.role != 'secretary');

      const discriminatedMembers = {
        president: committee.members.find(m => m.role == 'president')!,
        secretary: committee.members.find(m => m.role == 'secretary')!,
        members: committee.members.filter(m => m.role == 'member'),
      }

      return {
        properties: {
          type: Word.SectionType.NEXT_PAGE,
          page: {
            size: { orientation: Word.PageOrientation.LANDSCAPE },
            margin: {
              top: 1000,
              right: 600,
              bottom: 1000,
              left: 600,
            }
          },
        },
        children: [
          new Word.Table({
            borders: Word.TableBorders.NONE,
            width: {
              size: 100,
              type: Word.WidthType.PERCENTAGE,
            },
            rows: [
              new Word.TableRow({
                children: [
                  new Word.TableCell({
                    width: {
                      size: 50,
                      type: Word.WidthType.PERCENTAGE,
                    },
                    children: [
                      new Word.Paragraph({
                        children: [
                          new Word.TextRun({ text: 'UNIVERSITATEA DIN BUCUREȘTI', bold: true }),
                          new Word.TextRun({ text: 'Facultatea de Matematică și Informatică', bold: true, break: 1 }),
                          new Word.TextRun({ text: `Domeniul de ${domainTypeString}: ${domain.name}`, bold: true, break: 1 }),
                          new Word.TextRun({ text: `Programul de studii/specializarea: ${specialization.name}`, bold: true, break: 1 }),
                          new Word.TextRun({ text: `Durata studiilor: ${studyDurationString}`, bold: true, break: 1 }),
                          new Word.TextRun({ text: `Număr credite: ${creditNumber}`, bold: true, break: 1 }),
                          new Word.TextRun({ text: `Forma de învățământ: ${specialization.studyForm.toUpperCase()}`, bold: true, break: 1 }),
                          new Word.TextRun({ text: `Promoția: ${referencePaper.student.promotion}`, bold: true, break: 1 }),
                        ],
                      }),
                    ],
                  }),
                  new Word.TableCell({
                    width: {
                      size: 50,
                      type: Word.WidthType.PERCENTAGE,
                    },
                    verticalAlign: Word.VerticalAlign.BOTTOM,
                    children: [
                      new Word.Paragraph({
                        alignment: Word.AlignmentType.RIGHT,
                        children: [
                          new Word.TextRun({ text: `Examen de ${paperTypeString}`, bold: true }),
                          new Word.TextRun({ text: `Sesiunea ${sessionSettings.sessionName.toUpperCase()}`, bold: true, break: 1 }),
                          new Word.TextRun({ text: `Credite ${paperTypeString} - 10`, bold: true, break: 1 }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ]
          }),
          new Word.Paragraph({
            alignment: Word.AlignmentType.CENTER,
            spacing: {
              before: 300,
              after: 300,
            },
            children: [
              new Word.TextRun({ text: `CATALOG EXAMEN DE LICENȚĂ`, bold: true, size: 36 }),
              new Word.TextRun({ text: `Prezentarea și susținerea lucrării de licență`, bold: true, size: 36, break: 1 }),
            ],
          }),
          new Word.Table({
            rows: [
              new Word.TableRow({
                tableHeader: true,
                children: [
                  TableCell({ text: 'Nr. crt.', bold: true, rowSpan: 2, fill: '#bdbdbd' }),
                  TableCell({ text: 'Numele, inițiala tatălui și prenumele absolventului', bold: true, rowSpan: 2, fill: '#bdbdbd' }),
                  TableCell({ text: 'Titlul lucrării de licență și profesorul coordonator', bold: true, rowSpan: 2, fill: '#bdbdbd' }),
                  ...gradingMembers.map(member => (
                    TableCell({ text: `${member.teacher.lastName} ${member.teacher.firstName}`.toLocaleUpperCase(), bold: true, colSpan: 2, fill: '#bdbdbd' })
                  )),
                  TableCell({ text: 'Media', bold: true, rowSpan: 2, fill: '#bdbdbd' }),
                ],
              }),
              new Word.TableRow({
                tableHeader: true,
                children: gradingMembers.flatMap(() => [
                  TableCell({ text: 'Notă pentru lucrare', bold: true, width: Percent(6), fill: '#bdbdbd' }),
                  TableCell({ text: 'Notă pentru susținerea lucrării', bold: true, width: Percent(6), fill: '#bdbdbd' }),
                ]),
              }),
              ...group.map((paper, i) => new Word.TableRow({
                height: {
                  value: '36pt',
                  rule: Word.HeightRule.EXACT,
                },
                children: [
                  TableCell({ text: `${i + 1}.` }),
                  TableCell({ text: filterFalsy([paper.student.lastName, paper.student.extraData?.parentInitial, paper.student.firstName]).join(' ').toLocaleUpperCase() }),
                  TableCell({ text: `${paper.title} – ${paper.teacher.lastName} ${paper.teacher.firstName}`.toLocaleUpperCase() }),
                  ...gradingMembers.flatMap(member => {
                    const grade = paper.grades.find(grade => grade.committeeMemberTeacherId == member.teacherId);
                    return [
                      TableCell({ text: (grade?.forPaper.toString()) || '-' }),
                      TableCell({ text: (grade?.forPresentation.toString()) || '-' })
                    ];
                  }),
                  TableCell({ text: gradeAverageString(committee, paper.gradeAverage) })
                ]
              }))
            ]
          }),
        ],
        footers: {
          default: new Word.Footer({
            children: [
              new Word.Table({
                borders: Word.TableBorders.NONE,
                width: Percent(100),
                rows: [
                  new Word.TableRow({
                    children: [
                      new Word.TableCell({
                        width: Percent(50),
                        children: [
                          new Word.Paragraph({
                            alignment: Word.AlignmentType.CENTER,
                            children: [
                              new Word.TextRun({ text: committee.name }),
                              new Word.TextRun({ text: 'Președinte,', break: 2 }),
                              new Word.TextRun({ 
                                text: `${discriminatedMembers.president.teacher.title || ''} ${discriminatedMembers.president.teacher.lastName} ${discriminatedMembers.president.teacher.firstName}`,
                                break: 1,
                              }),
                            ]
                          }),
                        ],
                      }),
                      new Word.TableCell({
                        width: Percent(50),
                        children: [
                          new Word.Paragraph({
                            alignment: Word.AlignmentType.CENTER,
                            children: [
                              new Word.TextRun({ text: 'Membri,' }),
                              ...discriminatedMembers.members.map(member => (
                                new Word.TextRun({ text: `${member.teacher.title || ''} ${member.teacher.lastName} ${member.teacher.firstName}`, break: 1 })
                              )),
                              new Word.TextRun({ text: 'Secretar,', break: 2 }),
                              new Word.TextRun({
                                text: `${discriminatedMembers.secretary.teacher.title || ''} ${discriminatedMembers.secretary.teacher.lastName} ${discriminatedMembers.secretary.teacher.firstName}`,
                                break: 1,
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        },
      }
    })
  });
  const buffer = await Word.Packer.toBuffer(document);
  return Buffer.from(buffer);
}

// export async function FinalCatalogWord({ mode, paperPromotionGroups, sessionSettings }: { mode: 'final' | 'centralizing'; paperPromotionGroups: { promotion: string, items: Paper[] }[][]; sessionSettings: SessionSettings }) {
//   const catalogName = {
//     final: 'Catalog final',
//     centralizing: 'Catalag centralizator'
//   }[mode];
//   const document = new Word.Document({
//     title: `${catalogName} - Sesiunea ${sessionSettings.sessionName}`,
//     creator: 'Platforma de finalizare studii a Facultății de Matematică și Informatică',
//     sections: paperPromotionGroups.map(pageGroup => {
//       const referencePromotion = pageGroup[0];
//       const referencePaper = referencePromotion.items[0];
//       const referenceStudent = referencePaper.student;
//       const studyYears = parseInt(referenceStudent.specialization.studyYears);
//       const paperTypeString = PAPER_TYPES[referencePaper.type];
//       const size = 24;

//       return {
//         properties: {
//           type: Word.SectionType.NEXT_PAGE,
//           page: {
//             size: { orientation: Word.PageOrientation.PORTRAIT },
//             margin: {
//               top: 1000,
//               right: 600,
//               bottom: 1000,
//               left: 600,
//             }
//           },
//         },
//         children: [
//           new Word.Table({
//             borders: Word.TableBorders.NONE,
//             width: {
//               size: 100,
//               type: Word.WidthType.PERCENTAGE,
//             },
//             rows: [
//               new Word.TableRow({
//                 children: [
//                   new Word.TableCell({
//                     width: {
//                       size: 65,
//                       type: Word.WidthType.PERCENTAGE,
//                     },
//                     children: [
//                       new Word.Paragraph({
//                         children: [
//                           new Word.TextRun({ text: 'ROMÂNIA', bold: true, size }),
//                           new Word.TextRun({ text: 'MINISTERUL EDUCAȚIEI', bold: true, break: 1, size }),
//                           new Word.TextRun({ text: 'UNIVERSITATEA DIN BUCUREȘTI', bold: true, break: 1, size }),
//                           new Word.TextRun({ text: 'Facultatea de Matematică și Informatică', bold: true, break: 1, size }),
//                           new Word.TextRun({ text: `Domeniul de ${DOMAIN_TYPES[referenceStudent.domain.type]}: ${referenceStudent.domain.name}`, bold: true, break: 1, size }),
//                           new Word.TextRun({ text: `Programul de studii/specializarea: ${referenceStudent.specialization.name}`, bold: true, break: 1, size }),
//                           new Word.TextRun({ text: `Durata studiilor: ${studyYears} ani (${studyYears * 2} semestre)`, bold: true, break: 1, size }),
//                           new Word.TextRun({ text: `Număr credite: ${60 * studyYears}`, bold: true, break: 1, size }),
//                           new Word.TextRun({ text: `Forma de învățământ: ${referenceStudent.studyForm.toLocaleUpperCase()}`, bold: true, break: 1, size }),
//                         ],
//                       }),
//                     ],
//                   }),
//                   new Word.TableCell({
//                     width: {
//                       size: 35,
//                       type: Word.WidthType.PERCENTAGE,
//                     },
//                     verticalAlign: Word.VerticalAlign.BOTTOM,
//                     children: [
//                       new Word.Paragraph({
//                         alignment: Word.AlignmentType.RIGHT,
//                         children: [
//                           new Word.TextRun({ text: `Sesiunea ${sessionSettings.sessionName.toLocaleUpperCase()}`, bold: true, break: 1, size }),
//                           new Word.TextRun({ text: `Proba: Prezentarea și susținerea lucrării de ${paperTypeString} - Credite 10`, bold: true, break: 1, size }),
//                         ],
//                       }),
//                     ],
//                   }),
//                 ],
//               }),
//             ]
//           }),
//           new Word.Paragraph({
//             alignment: Word.AlignmentType.CENTER,
//             spacing: {
//               before: 500,
//               after: 0,
//             },
//             children: [
//               new Word.TextRun({ text: catalogName.toLocaleUpperCase(), bold: true, size: 36 }),
//               new Word.TextRun({ text: `EXAMEN DE ${paperTypeString.toLocaleUpperCase()}`, bold: true, size: 36, break: 1 }),
//             ],
//           }),
//           ...pageGroup.flatMap((promotionGroup, index) => [
//             new Word.Paragraph({
//               spacing: {
//                 after: 100,
//               },
//               children: [
//                 new Word.TextRun({ text: `Promoția ${promotionGroup.promotion}`, bold: true, break: 1, size }),
//               ],
//             }),
//             new Word.Table({
//               width: {
//                 size: 100,
//                 type: Word.WidthType.PERCENTAGE,
//               },
//               rows: [
//                 new Word.TableRow({
//                   tableHeader: true,
//                   children: [
//                     TableCell({ text: 'Nr. crt.', bold: true, fill: '#bdbdbd', size }),
//                     TableCell({ text: 'Numele, inițiala tatălui și prenumele absolventului', bold: true, fill: '#bdbdbd', size }),
//                     TableCell({ text: 'Anul înmatriculării', bold: true, fill: '#bdbdbd', size }),
//                     TableCell({ text: `Media examenului de ${paperTypeString}`, bold: true, fill: '#bdbdbd', size }),
//                   ],
//                 }),
//                 ...promotionGroup.items.map((paper, i) => new Word.TableRow({
//                   children: [
//                     TableCell({ text: `${i + 1}.`, size }),
//                     TableCell({ text: `${paper.student.user.lastName} ${paper.student.studentExtraDatum?.parentInitial} ${paper.student.user.firstName}`.toLocaleUpperCase(), alignment: Word.AlignmentType.LEFT, size }),
//                     TableCell({ text: paper.student.matriculationYear, size }),
//                     TableCell({ text: paper.gradeAverage?.toFixed(2) || 'ABSENT', size })
//                   ]
//                 }))
//               ]
//             }),
//           ]),
//         ],
//         footers: {
//           default: new Word.Footer({
//             children: [
//               PeopleSignatureFooter([
//                 { column: 'left', position: 'DECAN', name: 'Conf. Dr. Cătălin Gherghe', stamp: true },
//                 { column: 'right', position: 'SECRETAR ȘEF', name: 'Evelina Coteneanu' },
//                 { column: 'right', position: 'Întocmit', name: ''}
//               ])
//             ],
//           }),
//         },
//       }
//     })
//   });
//   const buffer = await Word.Packer.toBuffer(document);
//   return Buffer.from(buffer);
// }

interface Person {
  position: string;
  name: string;
  stamp?: boolean;
  column?: 'left' | 'right';
}

function PeopleSignatureFooter(people: Person[], testSize = 24) {
  const leftPeople = people.filter(person => person.column === 'left');
  const rightPeople = people.filter(person => person.column === 'right');
  const size = testSize;

  const mapPerson = (person: Person) => new Word.Paragraph({
    alignment: Word.AlignmentType.CENTER,
    children: filterFalsy<Word.ParagraphChild>([
      new Word.TextRun({ text: `${person.position},`, break: 1, size }),
      new Word.TextRun({ text: person.name, break: 1, size }),
      new Word.TextRun({ text: '', break: 1, size }),
      person.stamp && new Word.TextRun({ text: 'L.S.', bold: true, break: 1, size }),
    ]),
  });

  return new Word.Table({
    borders: Word.TableBorders.NONE,
    width: Percent(100),
    rows: [
      new Word.TableRow({
        children: [
          new Word.TableCell({
            width: Percent(50),
            children: leftPeople.map(mapPerson),
          }),
          new Word.TableCell({
            width: Percent(50),
            children: rightPeople.map(mapPerson),
          }),
        ],
      }),
    ],
  });
}