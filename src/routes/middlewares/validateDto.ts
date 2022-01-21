import { ClassConstructor, plainToClass, plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { NextFunction, Request, Response } from "express";

export default function (dtoCls: ClassConstructor<any>, bodyOrQuery: 'body' | 'query' = 'body') {
  return async function (req: Request, res: Response, next: NextFunction) {
    const dto = plainToInstance(dtoCls, req[bodyOrQuery]);
    const validationErrors = await validate(dto);
    if (validationErrors.length > 0) {
      next(validationErrors[0]);
    } else {
      req[bodyOrQuery] = dto;
      next();
    }
  }
}