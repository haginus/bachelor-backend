import { DocumentCategory } from "./enums/document-category.enum";
import { DocumentUploadPerspective } from "./enums/document-upload-perspective.enum";
import { PaperType } from "./enums/paper-type.enum";
import { RequiredDocumentSpec } from "./interfaces/required-document-spec";
import { StudentDocumentGenerationProps } from "./interfaces/student-document-generation-props.interface";

const liquidationForm: RequiredDocumentSpec = {
  title: 'Formular de lichidare',
  name: 'liquidation_form',
  category: DocumentCategory.SecretaryFiles,
  types: { generated: true, signed: true },
  acceptedMimeTypes: 'application/pdf',
  uploadBy: DocumentUploadPerspective.Student,
  getGenerationMetadata: ({ student, paper }: StudentDocumentGenerationProps) => ({
    student: {
      lastName: student.lastName,
      firstName: student.firstName,
      email: student.email,
      CNP: student.CNP,
      specialization: {
        name: student.specialization.name,
        studyForm: student.specialization.studyForm,
        domain: {
          name: student.specialization.domain.name,
          type: student.specialization.domain.type,
        }
      },
      promotion: student.promotion,
      fundingForm: student.fundingForm,
      extraData: {
        dateOfBirth: student.extraData.dateOfBirth,
        placeOfBirthCountry: student.extraData.placeOfBirthCountry,
        placeOfBirthCounty: student.extraData.placeOfBirthCounty,
        placeOfBirthLocality: student.extraData.placeOfBirthLocality,
        address: {
          locality: student.extraData.address.locality,
          county: student.extraData.address.county,
          street: student.extraData.address.street,
          streetNumber: student.extraData.address.streetNumber,
          building: student.extraData.address.building,
          stair: student.extraData.address.stair,
          floor: student.extraData.address.floor,
          apartment: student.extraData.address.apartment,
        },
        mobilePhone: student.extraData.mobilePhone,
        personalEmail: student.extraData.personalEmail,
      },
    },
    paper: {
      type: paper.type,
    },
  }),
};

export const requiredDocumentSpecs: RequiredDocumentSpec[] = [
  {
    title: 'Cerere de înscriere',
    name: 'sign_up_form',
    category: DocumentCategory.SecretaryFiles,
    types: { generated: true, signed: true },
    acceptedMimeTypes: 'application/pdf',
    uploadBy: DocumentUploadPerspective.Student,
    getGenerationMetadata: ({ student, paper }: StudentDocumentGenerationProps) => ({
      student: {
        lastName: student.lastName,
        firstName: student.firstName,
        email: student.email,
        CNP: student.CNP,
        specialization: {
          name: student.specialization.name,
          studyForm: student.specialization.studyForm,
          domain: {
            name: student.specialization.domain.name,
          }
        },
        promotion: student.promotion,
        fundingForm: student.fundingForm,
        identificationCode: student.identificationCode,
        group: student.group,
        generalAverage: student.generalAverage,
        extraData: {
          birthLastName: student.extraData.birthLastName,
          parentInitial: student.extraData.parentInitial,
          fatherName: student.extraData.fatherName,
          motherName: student.extraData.motherName,
          dateOfBirth: student.extraData.dateOfBirth,
          civilState: student.extraData.civilState,
          citizenship: student.extraData.citizenship,
          ethnicity: student.extraData.ethnicity,
          placeOfBirthCountry: student.extraData.placeOfBirthCountry,
          placeOfBirthCounty: student.extraData.placeOfBirthCounty,
          placeOfBirthLocality: student.extraData.placeOfBirthLocality,
          landline: student.extraData.landline,
          mobilePhone: student.extraData.mobilePhone,
        }
      },
      paper: {
        type: paper.type,
        title: paper.title,
        teacher: {
          lastName: paper.teacher.lastName,
          firstName: paper.teacher.firstName,
        }
      }
    })
  },
  {
    title: 'Declarație pe proprie răspundere',
    name: 'statutory_declaration',
    category: DocumentCategory.SecretaryFiles,
    types: { generated: true, signed: true },
    acceptedMimeTypes: 'application/pdf',
    uploadBy: DocumentUploadPerspective.Student,
    getGenerationMetadata: ({ student, paper }: StudentDocumentGenerationProps) => ({
      student: {
        lastName: student.lastName,
        firstName: student.firstName,
        email: student.email,
        specialization: {
          name: student.specialization.name,
        },
      },
      paper: {
        type: paper.type,
      },
    }),
  },
  {
    ...liquidationForm,
    onlyFor({ paper, sessionSettings }) {
      return paper.student.promotion == sessionSettings.currentPromotion;
    },
  },
  {
    ...liquidationForm,
    types: { generated: true, copy: true },
    uploadInstructions: 'Descărcați și listați șablonul generat. Semnați documentul, apoi obțineți semnăturile de la serviciile menționate în formular. Încărcați copia scanată a formularului în platformă.',
    onlyFor({ paper, sessionSettings }) {
      return paper.student.promotion != sessionSettings.currentPromotion;
    },
  },
  {
    title: 'Carte de identitate',
    name: 'identity_card',
    category: DocumentCategory.SecretaryFiles,
    types: { copy: true },
    acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
    uploadBy: DocumentUploadPerspective.Student,
  },
  {
    title: 'Certificat de naștere',
    name: 'birth_certificate',
    category: DocumentCategory.SecretaryFiles,
    types: { copy: true },
    acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
    uploadBy: DocumentUploadPerspective.Student,
  },
  {
    title: 'Certificat de căsătorie',
    name: 'marriage_certificate',
    category: DocumentCategory.SecretaryFiles,
    types: { copy: true },
    acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
    onlyFor: ({ paper }) => ['married', 're_married', 'widow'].includes(paper.student.extraData?.civilState),
    uploadBy: DocumentUploadPerspective.Student,
  },
  {
    title: 'Certificat de competență lingvistică',
    name: 'language_certificate',
    category: DocumentCategory.SecretaryFiles,
    types: { copy: true },
    acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
    onlyFor: ({ paper }) => ['bachelor', 'diploma'].includes(paper.type),
    uploadBy: DocumentUploadPerspective.Student,
  },
  {
    title: 'Diplomă de bacalaureat',
    name: 'bacalaureat_diploma',
    category: DocumentCategory.SecretaryFiles,
    types: { copy: true },
    acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
    uploadBy: DocumentUploadPerspective.Student,
  },
  {
    title: 'Diplomă de licență',
    name: 'bachelor_diploma',
    category: DocumentCategory.SecretaryFiles,
    types: { copy: true },
    acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
    onlyFor: ({ paper }) => paper.type == PaperType.Master,
    uploadBy: DocumentUploadPerspective.Student,
  },
  {
    title: 'Formular absolventi.unibuc.ro',
    name: 'graduate_form',
    category: DocumentCategory.SecretaryFiles,
    types: { copy: true },
    acceptedMimeTypes: 'application/pdf',
    uploadBy: DocumentUploadPerspective.Student,
    uploadInstructions: 'Accesați pagina web absolventi.unibuc.ro, completați formularul și descărcați rezultatul în format PDF. Încărcați apoi documentul în platformă.',
  },
  {
    title: 'Lucrare de licență',
    name: 'paper',
    category: DocumentCategory.PaperFiles,
    types: { copy: true },
    acceptedMimeTypes: 'application/pdf',
    onlyFor: ({ paper }) => paper.type == PaperType.Bachelor,
    uploadBy: DocumentUploadPerspective.Student,
  },
  {
    title: 'Proiect de diplomă',
    name: 'paper',
    category: DocumentCategory.PaperFiles,
    types: { copy: true },
    acceptedMimeTypes: 'application/pdf',
    onlyFor: ({ paper }) => paper.type == PaperType.Diploma,
    uploadBy: DocumentUploadPerspective.Student,
  },
  {
    title: 'Lucrare de disertație',
    name: 'paper',
    category: DocumentCategory.PaperFiles,
    types: { copy: true },
    acceptedMimeTypes: 'application/pdf',
    onlyFor: ({ paper }) => paper.type == PaperType.Master,
    uploadBy: DocumentUploadPerspective.Student,
  },
  {
    title: 'Referat coordonator științific',
    name: 'plagiarism_report',
    category: DocumentCategory.PaperFiles,
    types: { copy: true },
    acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
    uploadBy: DocumentUploadPerspective.Teacher,
  },
  {
    title: 'Referat preliminar comisie',
    name: 'committee_report',
    category: DocumentCategory.PaperFiles,
    types: { copy: true },
    acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
    uploadBy: DocumentUploadPerspective.Committee,
  },
  {
    title: 'Raport Turnitin',
    name: 'committee_turnitin',
    category: DocumentCategory.PaperFiles,
    types: { copy: true },
    acceptedMimeTypes: 'application/pdf,image/png,image/jpeg,text/plain',
    uploadBy: DocumentUploadPerspective.Committee,
  }
];