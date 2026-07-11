import 'reflect-metadata';

export const CSV_COLUMNS_KEY = Symbol('CSV_COLUMNS_KEY');

type CsvColumnType = string | Function;

interface CsvColumnOptions {
  name: string;
  entityPropertyPath: string;
  order: number;
  required?: boolean;
  description?: string;
  type?: CsvColumnType | CsvColumnType[];
  anyOf?: any[];
  example?: any | any[];
}

export interface CsvColumnMeta extends Omit<CsvColumnOptions, 'type' | 'example'> {
  propertyKey: string;
  types: string[];
  examples: any[];
}

export function CsvColumn(options: CsvColumnOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const existing: CsvColumnMeta[] = Reflect.getMetadata(CSV_COLUMNS_KEY, target.constructor) ?? [];

    function makeArray(value: any | any[]): any[] {
      return Array.isArray(value) ? value : [value];
    }

    existing.push({
      propertyKey: propertyKey.toString(),
      name: options.name,
      entityPropertyPath: options.entityPropertyPath,
      order: options.order,
      required: options.required ?? false,
      description: options.description,
      types: makeArray(options.type)?.map(t => typeof t === 'string' ? t : t.name) ?? [],
      anyOf: options.anyOf,
      examples: makeArray(options.example),
    });

    Reflect.defineMetadata(CSV_COLUMNS_KEY, existing, target.constructor);
  };
}
