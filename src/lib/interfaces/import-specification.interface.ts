export interface ImportSpecification {
  type: 'csv';
  mimeType: string;
  properties: ImportSpecificationProperty[];
  exampleFile?: ImportSpecificationExampleFile;
}

export interface ImportSpecificationProperty {
  name: string;
  propertyPath: string;
  entityPropertyPath: string;
  order?: number;
  required?: boolean;
  description?: string;
  types?: string[];
  anyOf?: any[];
  examples?: any[];
}

export interface ImportSpecificationExampleFile {
  fileName: string;
  mimeType: string;
  encoding: 'base64' | 'utf-8';
  content: string;
}
