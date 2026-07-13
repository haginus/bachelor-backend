import { BadRequestException, Injectable } from "@nestjs/common";
import { PassThrough } from "stream";
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import csvParser from "csv-parser";
import { CSV_COLUMNS_KEY, CsvColumnMeta } from "../lib/decorators/csv-column.decorator";
import { ImportSpecification, ImportSpecificationExampleFile, ImportSpecificationResult } from "../lib/interfaces/import-specification.interface";


@Injectable()
export class CsvParserService {

  async parse<T extends Record<string, any> = any>(file: Buffer, dto: ClassConstructor<T>): Promise<T[]> {
    if(!file) {
      throw new BadRequestException('Prezentați un fișier CSV.');
    }

    const headers = this._getCsvColumns(dto);
    const rows = await this._runParser(file, headers);
    const result: T[] = [];
    const errors: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      for(let i = 0; i < headers.length; i++) {
        const header = headers[i];
        const value = row[header.propertyKey];
        if(!header.required && value === '') {
          delete row[header.propertyKey];
        }
      }
      const dtoInstance = plainToInstance(dto, row);
      const validationErrors = await validate(dtoInstance, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      if (validationErrors.length > 0) {
        errors.push({
          rowIndex: i + 2, // +2 because CSV has header and is 1-based
          row,
          validationErrors: validationErrors.map(err => ({
            property: err.property,
            constraints: err.constraints,
            messages: [...new Set(Object.values(err.constraints || {}))],
          })),
        });
        continue;
      }
      result.push(dtoInstance);
    }
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Fișierul CSV conține erori de validare.',
        details: errors,
        code: 'CSV_VALIDATION_ERROR',
      });
    }
    return result;
  }

  getImportSpecification(dto: ClassConstructor<any>, exampleFile?: ImportSpecificationExampleFile, result?: ImportSpecificationResult): ImportSpecification {
    const columns = this._getCsvColumns(dto);
    return {
      type: 'csv',
      mimeType: 'text/csv',
      properties: columns.map(column => ({
        name: column.name,
        propertyPath: column.propertyKey,
        entityPropertyPath: column.entityPropertyPath,
        order: column.order,
        required: column.required,
        description: column.description,
        types: column.types,
        anyOf: column.anyOf,
        examples: column.examples,
      })),
      exampleFile,
      result,
    };
  }

  private _getCsvColumns(dto: Function): CsvColumnMeta[] {
    const columns: CsvColumnMeta[] = Reflect.getMetadata(CSV_COLUMNS_KEY, dto) ?? [];
    columns.sort((a, b) => a.order - b.order);
    return columns;
  }

  private _runParser(file: Buffer, headers: CsvColumnMeta[]): Promise<any[]> {
    const rows: any[] = [];

    return new Promise((resolve, reject) => {
      const bufferStream = new PassThrough();
      bufferStream.end(file);

      bufferStream
        .pipe(
          csvParser({
            mapHeaders: ({ header: csvHeader, index }) => {
              const expected = headers[index];

              if(!expected) {
                reject(new BadRequestException(`Lungimea antetului nu coincide cu cea așteptată.`));
                return null;
              }

              if(csvHeader !== expected.name) {
                reject(new BadRequestException(`Eroare pe coloana ${index + 1}: se aștepta "${expected.name}", dar s-a găsit "${csvHeader}".`));
                return null;
              }

              return expected.propertyKey;
            },
          }),
        )
        .on('headers', parsedHeaders => {
          if(parsedHeaders.length !== headers.length) {
            reject(new BadRequestException(`Lungimea antetului nu coincide cu cea așteptată.`));
          }
        })
        .on('data', data => rows.push(data))
        .on('end', () => resolve(rows))
        .on('error', error => {
          reject(
            error instanceof BadRequestException
              ? error
              : new BadRequestException(`A apărut o eroare la procesarea fișierului CSV.`),
          );
        });
    });
  }
  
}
