import { DocumentCategory } from "../../lib/enums/document-category.enum";
import { DocumentType } from "../../lib/enums/document-type.enum";

export class CreateDocumentDto {
  paperId: number;
  name: string;
  category: DocumentCategory;
  type: DocumentType;
  mimeType: string;
  uploadedById: number | null;
  meta?: Record<string, any>;
}