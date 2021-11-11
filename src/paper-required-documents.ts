import { DocumentCategory, DomainType, UploadPerspective } from "./models/models"

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
    onlyFor?: {
        married?: boolean,
        paperType?: DomainType,
        previousPromotions?: boolean
    }
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
      onlyFor: { married: true },
      uploadBy: 'student'
    },
    {
      title: 'Certificatul de competență lingvistică',
      name: 'language_certificate',
      category: 'secretary_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
      onlyFor: { previousPromotions: true, paperType: 'bachelor' },
      uploadBy: 'student'
    },
    {
      title: 'Diplomă de bacalaureat',
      name: 'bacalaureat_diploma',
      category: 'secretary_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
      onlyFor: { previousPromotions: true },
      uploadBy: 'student'
    },
    {
      title: 'Diplomă de licență',
      name: 'bachelor_diploma',
      category: 'secretary_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf,image/png,image/jpeg',
      onlyFor: { previousPromotions: true, paperType: 'master' },
      uploadBy: 'student'
    },
    {
      title: 'Lucrare de licență',
      name: 'paper',
      category: 'paper_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf',
      onlyFor: { paperType: 'bachelor' },
      uploadBy: 'student'
    },
    {
      title: 'Lucrare de disertație',
      name: 'paper',
      category: 'paper_files',
      types: { copy: true },
      acceptedMimeTypes: 'application/pdf',
      onlyFor: { paperType: 'master' },
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