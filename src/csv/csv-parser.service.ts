import { BadRequestException, Injectable } from "@nestjs/common";
import { PassThrough } from "stream";
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import csvParser from "csv-parser";


@Injectable()
export class CsvParserService {

  async parse<T extends Record<string, any> = any>(file: Buffer, options: ParseFileOptions<T>): Promise<T[]> {
    const rows = await this._runParser(file, options);
    if(!options.dto) {
      return rows;
    }
    const result: T[] = [];
    const errors: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const dtoInstance = plainToInstance(options.dto, row, {
        enableImplicitConversion: true,
      });
      const validationErrors = await validate(dtoInstance, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      if (validationErrors.length > 0) {
        errors.push({
          rowIndex: i + 2, // +2 because CSV has header and is 1-based
          errors: validationErrors.map(err => Object.values(err.constraints || {})).flat(),
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

  _runParser(file: Buffer, options: ParseFileOptions<any>): Promise<any[]> {
    const rows: any[] = [];
    return new Promise((resolve, reject) => {
      const bufferStream = new PassThrough();
      bufferStream.end(file);
      bufferStream
        .pipe(
          csvParser({
            mapHeaders: ({ header: csvHeader, index }) => {
              const header = options.headers[index];
              if(!header) {
                throw new BadRequestException(`Lungimea antetului nu coincide cu cea așteptată.`);
              }
              const expectedHeader = header[0];
              if (csvHeader != expectedHeader) {
                throw new BadRequestException(`Eroare pe coloana ${index + 1}: se aștepta "${expectedHeader}", dar s-a găsit "${csvHeader}".`);
              }
              return header[1] as string;
            },
          })
        )
        .on('error', (error) => {
          if(error instanceof BadRequestException) {
            reject(error);
          } else {
            reject(new BadRequestException('Eroare la parsarea fișierului CSV.'));
          }
        })
        .on('data', (data) => rows.push(data))
        .on('end', () => {
          resolve(rows);
        });
    });
  }
}

interface ParseFileOptions<T extends Record<string, any> = Record<string, any>> {
  headers: [string, keyof T][];
  dto?: ClassConstructor<T>;
}