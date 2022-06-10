import { DocumentCategory, DomainType, Paper, SessionSettings, UploadPerspective } from "./models/models"

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
}

export const paperRequiredDocuments: PaperRequiredDocument[] = [
    {
      title: 'Cerere de înscriere',
      name: 'sign_up_form',
      category: 'secretary_files',
      types: { generated: true, signed: true },
      acceptedMimeTypes: 'application/pdf',
      uploadBy: 'student'
    },
    {
      title: 'Declarație pe proprie răspundere',
      name: 'statutory_declaration',
      category: 'secretary_files',
      types: { generated: true, signed: true },
      acceptedMimeTypes: 'application/pdf',
      uploadBy: 'student'
    },
    {
      title: 'Formular de lichidare',
      name: 'liquidation_form',
      category: 'secretary_files',
      types: { generated: true, signed: true },
      acceptedMimeTypes: 'application/pdf',
      uploadBy: 'student'
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