import { Paper } from "../../papers/entities/paper.entity";
import { DocumentCategory } from "../enums/document-category.enum";
import { DocumentUploadPerspective } from "../enums/document-upload-perspective.enum";
import { SessionSettings } from "../../common/entities/session-settings.entity";

export type RequiredDocumentTypes = { generated: true; signed?: boolean } | { copy: true };

export interface RequiredDocumentSpec {
  name: string;
  title: string;
  category: DocumentCategory;
  types: RequiredDocumentTypes;
  acceptedMimeTypes: string;
  uploadBy: DocumentUploadPerspective;
  uploadInstructions?: string;
  onlyFor?: (props: { paper: Paper; sessionSettings: SessionSettings; }) => boolean;
  getGenerationMetadata?: (generationProps: any) => Record<string, any>;
}