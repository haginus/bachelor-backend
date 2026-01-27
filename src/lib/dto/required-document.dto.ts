import { Expose } from "class-transformer";
import { DocumentCategory } from "../enums/document-category.enum";
import { DocumentUploadPerspective } from "../enums/document-upload-perspective.enum";
import { RequiredDocumentTypes } from "../interfaces/required-document-spec";
import { mimeTypeExtensions } from "../mimes";
import { requiredDocumentSpecs } from "../required-document-specs";

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
    return this.acceptedMimeTypes.split(',').map(mimeType => mimeTypeExtensions[mimeType]).filter(ext => !!ext);
  }

  @Expose()
  uploadBy: DocumentUploadPerspective;

  @Expose()
  uploadInstructions?: string;

  getGenerationMetadata(generationProps?: Record<string, any>): Record<string, any> | undefined {
    return requiredDocumentSpecs.find(spec => spec.name === this.name)?.getGenerationMetadata?.(generationProps);
  }
}