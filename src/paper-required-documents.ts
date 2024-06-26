import { DocumentCategory, Paper, SessionSettings, UploadPerspective } from "./models/models"
import { StudentDocumentGenerationProps } from "./documents/types";

// 'signed' cannot exist without 'generated', 'copy' is exclusive
export type PaperRequiredDocumentTypes = { generated: true, signed?: boolean } | { copy: true } 

export interface PaperRequiredDocument {
    title: string;
    name: string;
    category: DocumentCategory;
    types: PaperRequiredDocumentTypes;
    acceptedMimeTypes: string;
    acceptedExtensions?: string[]; // will be calculated using mime
    uploadBy: UploadPerspective;
    onlyFor?: (paper: Paper, sessionSettings: SessionSettings) => boolean;
    getGenerationMetadata?: (generationProps: any) => Record<string, any>;
}

export const paperRequiredDocuments: PaperRequiredDocument[] = [
    {
      title: 'Cerere de înscriere',
      name: 'sign_up_form',
      category: 'secretary_files',
      types: { generated: true, signed: true },
      acceptedMimeTypes: 'application/pdf',
      uploadBy: 'student',
      getGenerationMetadata: (generationProps: StudentDocumentGenerationProps) => ({
        student: {
          user: {
            lastName: generationProps.student.user.lastName,
            firstName: generationProps.student.user.firstName,
            email: generationProps.student.user.email,
            CNP: generationProps.student.user.CNP,
          },
          domain: {
            name: generationProps.student.domain.name,
          },
          specialization: {
            name: generationProps.student.specialization.name,
          },
          promotion: generationProps.student.promotion,
          fundingForm: generationProps.student.fundingForm,
          studyForm: generationProps.student.studyForm,
          identificationCode: generationProps.student.identificationCode,
          group: generationProps.student.group,
          generalAverage: generationProps.student.generalAverage,
        },
        extraData: {
          birthLastName: generationProps.extraData.birthLastName,
          parentInitial: generationProps.extraData.parentInitial,
          fatherName: generationProps.extraData.fatherName,
          motherName: generationProps.extraData.motherName,
          dateOfBirth: generationProps.extraData.dateOfBirth,
          civilState: generationProps.extraData.civilState,
          citizenship: generationProps.extraData.citizenship,
          ethnicity: generationProps.extraData.ethnicity,
          placeOfBirthCountry: generationProps.extraData.placeOfBirthCountry,
          placeOfBirthCounty: generationProps.extraData.placeOfBirthCounty,
          placeOfBirthLocality: generationProps.extraData.placeOfBirthLocality,
          landline: generationProps.extraData.landline,
          mobilePhone: generationProps.extraData.mobilePhone,
        },
        paper: {
          type: generationProps.paper.type,
          title: generationProps.paper.title,
          teacher: {
            lastName: generationProps.paper.teacher.lastName,
            firstName: generationProps.paper.teacher.firstName,
          }
        }
      })
    },
    {
      title: 'Declarație pe proprie răspundere',
      name: 'statutory_declaration',
      category: 'secretary_files',
      types: { generated: true, signed: true },
      acceptedMimeTypes: 'application/pdf',
      uploadBy: 'student',
      getGenerationMetadata: (generationProps: StudentDocumentGenerationProps) => ({
        student: {
          user: {
            lastName: generationProps.student.user.lastName,
            firstName: generationProps.student.user.firstName,
            email: generationProps.student.user.email,
          },
          specialization: {
            name: generationProps.student.specialization.name,
          },
        },
        paper: {
          type: generationProps.paper.type,
        },
      }),
    },
    {
      title: 'Formular de lichidare',
      name: 'liquidation_form',
      category: 'secretary_files',
      types: { generated: true, signed: true },
      acceptedMimeTypes: 'application/pdf',
      uploadBy: 'student',
      getGenerationMetadata: (generationProps: StudentDocumentGenerationProps) => ({
        student: {
          user: {
            lastName: generationProps.student.user.lastName,
            firstName: generationProps.student.user.firstName,
            email: generationProps.student.user.email,
            CNP: generationProps.student.user.CNP,
          },
          domain: {
            name: generationProps.student.domain.name,
            type: generationProps.student.domain.type,
          },
          specialization: {
            name: generationProps.student.specialization.name,
          },
          promotion: generationProps.student.promotion,
          fundingForm: generationProps.student.fundingForm,
          studyForm: generationProps.student.studyForm,
        },
        extraData: {
          dateOfBirth: generationProps.extraData.dateOfBirth,
          placeOfBirthCountry: generationProps.extraData.placeOfBirthCountry,
          placeOfBirthCounty: generationProps.extraData.placeOfBirthCounty,
          placeOfBirthLocality: generationProps.extraData.placeOfBirthLocality,
          address: {
            locality: generationProps.extraData.address.locality,
            county: generationProps.extraData.address.county,
            street: generationProps.extraData.address.street,
            streetNumber: generationProps.extraData.address.streetNumber,
            building: generationProps.extraData.address.building,
            stair: generationProps.extraData.address.stair,
            floor: generationProps.extraData.address.floor,
            apartment: generationProps.extraData.address.apartment,
          },
          mobilePhone: generationProps.extraData.mobilePhone,
          personalEmail: generationProps.extraData.personalEmail,
        },
        paper: {
          type: generationProps.paper.type,
        },
      }),
    },
    {
      title: 'Carte de identitate',
      name: 'identity_card',
      category: 'secretary_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
      uploadBy: 'student'
    },
    {
      title: 'Certificat de naștere',
      name: 'birth_certificate',
      category: 'secretary_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
      uploadBy: 'student'
    },
    {
      title: 'Certificat de căsătorie',
      name: 'marriage_certificate',
      category: 'secretary_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
      onlyFor: (paper) => ['married', 're_married', 'widow'].includes(paper.student.studentExtraDatum?.civilState),
      uploadBy: 'student'
    },
    {
      title: 'Certificatul de competență lingvistică',
      name: 'language_certificate',
      category: 'secretary_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
      onlyFor: (paper) => ['bachelor', 'diploma'].includes(paper.type),
      uploadBy: 'student'
    },
    {
      title: 'Diplomă de bacalaureat',
      name: 'bacalaureat_diploma',
      category: 'secretary_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
      uploadBy: 'student'
    },
    {
      title: 'Diplomă de licență',
      name: 'bachelor_diploma',
      category: 'secretary_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
      onlyFor: (paper) => paper.type == 'master',
      uploadBy: 'student'
    },
    {
      title: 'Formular absolventi.unibuc.ro',
      name: 'graduate_form',
      category: 'secretary_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf',
      uploadBy: 'student'
    },
    {
      title: 'Lucrare de licență',
      name: 'paper',
      category: 'paper_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf',
      onlyFor: (paper) => paper.type == 'bachelor',
      uploadBy: 'student'
    },
    {
      title: 'Proiect de diplomă',
      name: 'paper',
      category: 'paper_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf',
      onlyFor: (paper) => paper.type == 'diploma',
      uploadBy: 'student'
    },
    {
      title: 'Lucrare de disertație',
      name: 'paper',
      category: 'paper_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf',
      onlyFor: (paper) => paper.type == 'master',
      uploadBy: 'student'
    },
    {
      title: 'Referat coordonator științific',
      name: 'plagiarism_report',
      category: 'paper_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
      uploadBy: 'teacher'
    },
    {
      title: 'Referat preliminar comisie',
      name: 'committee_report',
      category: 'paper_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
      uploadBy: 'committee'
    },
    {
      title: 'Raport Turnitin',
      name: 'committee_turnitin',
      category: 'paper_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf,image/png,image/jpeg,text/plain',
      uploadBy: 'committee'
    }
  ]