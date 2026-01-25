import { Expose } from "class-transformer";
import { DocumentCategory } from "../enums/document-category.enum";
import { DocumentUploadPerspective } from "../enums/document-upload-perspective.enum";
import { RequiredDocumentTypes } from "../interfaces/required-document-spec";

export class RequiredDocumentDto {
  @Expose()
  name: string;

  @Expose()
  title: string;

  @Expose()
  category: DocumentCategory;

  @Expose()
  // @ts-ignore
  types: RequiredDocumentTypes;

  @Expose()
  acceptedMimeTypes: string;

  @Expose()
  get acceptedExtensions(): string[] {
    // TODO: use mime to calculate extensions from acceptedMimeTypes
    return [];
  }

  @Expose()
  uploadBy: DocumentUploadPerspective;

  @Expose()
  uploadInstructions?: string;
}