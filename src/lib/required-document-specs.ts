import { DocumentCategory } from "./enums/document-category.enum";
import { DocumentUploadPerspective } from "./enums/document-upload-perspective.enum";
import { PaperType } from "./enums/paper-type.enum";
import { RequiredDocumentSpec } from "./interfaces/required-document-spec";

const liquidationForm: RequiredDocumentSpec = {
  title: 'Formular de lichidare',
  name: 'liquidation_form',
  category: DocumentCategory.SecretaryFiles,
  types: { generated: true, signed: true },
  acceptedMimeTypes: 'application/pdf',
  uploadBy: DocumentUploadPerspective.Student,
  // getGenerationMetadata: (generationProps: StudentDocumentGenerationProps) => ({
  //   student: {
  //     user: {
  //       lastName: generationProps.student.user.lastName,
  //       firstName: generationProps.student.user.firstName,
  //       email: generationProps.student.user.email,
  //       CNP: generationProps.student.user.CNP,
  //     },
  //     domain: {
  //       name: generationProps.student.domain.name,
  //       type: generationProps.student.domain.type,
  //     },
  //     specialization: {
  //       name: generationProps.student.specialization.name,
  //     },
  //     promotion: generationProps.student.promotion,
  //     fundingForm: generationProps.student.fundingForm,
  //     studyForm: generationProps.student.studyForm,
  //   },
  //   extraData: {
  //     dateOfBirth: generationProps.extraData.dateOfBirth,
  //     placeOfBirthCountry: generationProps.extraData.placeOfBirthCountry,
  //     placeOfBirthCounty: generationProps.extraData.placeOfBirthCounty,
  //     placeOfBirthLocality: generationProps.extraData.placeOfBirthLocality,
  //     address: {
  //       locality: generationProps.extraData.address.locality,
  //       county: generationProps.extraData.address.county,
  //       street: generationProps.extraData.address.street,
  //       streetNumber: generationProps.extraData.address.streetNumber,
  //       building: generationProps.extraData.address.building,
  //       stair: generationProps.extraData.address.stair,
  //       floor: generationProps.extraData.address.floor,
  //       apartment: generationProps.extraData.address.apartment,
  //     },
  //     mobilePhone: generationProps.extraData.mobilePhone,
  //     personalEmail: generationProps.extraData.personalEmail,
  //   },
  //   paper: {
  //     type: generationProps.paper.type,
  //   },
  // }),
};

export const requiredDocumentSpecs: RequiredDocumentSpec[] = [
  {
    title: 'Cerere de înscriere',
    name: 'sign_up_form',
    category: DocumentCategory.SecretaryFiles,
    types: { generated: true, signed: true },
    acceptedMimeTypes: 'application/pdf',
    uploadBy: DocumentUploadPerspective.Student,
    // getGenerationMetadata: (generationProps: StudentDocumentGenerationProps) => ({
    //   student: {
    //     user: {
    //       lastName: generationProps.student.user.lastName,
    //       firstName: generationProps.student.user.firstName,
    //       email: generationProps.student.user.email,
    //       CNP: generationProps.student.user.CNP,
    //     },
    //     domain: {
    //       name: generationProps.student.domain.name,
    //     },
    //     specialization: {
    //       name: generationProps.student.specialization.name,
    //     },
    //     promotion: generationProps.student.promotion,
    //     fundingForm: generationProps.student.fundingForm,
    //     studyForm: generationProps.student.studyForm,
    //     identificationCode: generationProps.student.identificationCode,
    //     group: generationProps.student.group,
    //     generalAverage: generationProps.student.generalAverage,
    //   },
    //   extraData: {
    //     birthLastName: generationProps.extraData.birthLastName,
    //     parentInitial: generationProps.extraData.parentInitial,
    //     fatherName: generationProps.extraData.fatherName,
    //     motherName: generationProps.extraData.motherName,
    //     dateOfBirth: generationProps.extraData.dateOfBirth,
    //     civilState: generationProps.extraData.civilState,
    //     citizenship: generationProps.extraData.citizenship,
    //     ethnicity: generationProps.extraData.ethnicity,
    //     placeOfBirthCountry: generationProps.extraData.placeOfBirthCountry,
    //     placeOfBirthCounty: generationProps.extraData.placeOfBirthCounty,
    //     placeOfBirthLocality: generationProps.extraData.placeOfBirthLocality,
    //     landline: generationProps.extraData.landline,
    //     mobilePhone: generationProps.extraData.mobilePhone,
    //   },
    //   paper: {
    //     type: generationProps.paper.type,
    //     title: generationProps.paper.title,
    //     teacher: {
    //       lastName: generationProps.paper.teacher.lastName,
    //       firstName: generationProps.paper.teacher.firstName,
    //     }
    //   }
    // })
  },
  {
    title: 'Declarație pe proprie răspundere',
    name: 'statutory_declaration',
    category: DocumentCategory.SecretaryFiles,
    types: { generated: true, signed: true },
    acceptedMimeTypes: 'application/pdf',
    uploadBy: DocumentUploadPerspective.Student,
    // getGenerationMetadata: (generationProps: StudentDocumentGenerationProps) => ({
    //   student: {
    //     user: {
    //       lastName: generationProps.student.user.lastName,
    //       firstName: generationProps.student.user.firstName,
    //       email: generationProps.student.user.email,
    //     },
    //     specialization: {
    //       name: generationProps.student.specialization.name,
    //     },
    //   },
    //   paper: {
    //     type: generationProps.paper.type,
    //   },
    // }),
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