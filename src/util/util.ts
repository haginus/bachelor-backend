import path from "path";
import fs from "fs";
import { sequelize, SessionSettings, Teacher } from "../models/models";
import { Op, Sequelize } from "sequelize";

export class ResponseError extends Error {
    httpStatusCode: number;
    constructor(message: string, name?: string, httpStatusCode?: number) {
        super();
        this.name = name || 'BAD_REQUEST';
        this.message = message;
        this.httpStatusCode = httpStatusCode || 400;
    }
}

export class ResponseErrorUnauthorized extends ResponseError {
    constructor(message?: string, name?: string) {
        super(message || 'Nu sunteți autorizat să faceți această acțiune.', name || 'UNAUTHORIZED', 401);
    }
}

export class ResponseErrorForbidden extends ResponseError {
    constructor(message?: string, name?: string) {
        super(message || 'Nu aveți dreptul să faceți să faceți această acțiune.', name || 'FORBIDDEN', 403);
    }
}

export class ResponseErrorInternal extends ResponseError {
    constructor(message?: string, name?: string) {
        super(message || 'A apărut o eroare. Contactați administratorul.', name || 'INTERNAL_ERROR', 500);
    }
}

export const removeDiacritics = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function copyObject<Type = Object>(object: Type): Type {
    return JSON.parse(JSON.stringify(object));
}

/** Pay attention as this function only works with primitive types. */
export function removeDuplicates<Type>(arr: Type[]): Type[] {
    return [...new Set(arr)];
}

export function arrayIntersection<Type>(arr1: Type[], arr2: Type[]) {
    return arr1.filter(value => arr2.includes(value));
}

export function sortMembersByTitle(members: Teacher[]) {
    const sorted = [...members];
    const titleOrder = {
        "P": 0,
        "C": 1,
        "L": 2,
        "A": 3,
        "D": 4,
    }
    return sorted.sort((a, b) => {
        if(a.committeeMember.role == "president") {
            return -100;
        }
        if(a.committeeMember.role == "secretary") {
            return 100;
        }
        const aTitle = a.user.title[0];
        const bTitle = b.user.title[0];
        return titleOrder[aTitle] - titleOrder[bTitle];
    });
}

function ensureDirectoryExists(filePath: string) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
      return true;
    }
    ensureDirectoryExists(dirname);
    fs.mkdirSync(dirname);
}

export function safePath(...args: string[]): string {
    const resultedPath = path.join(...args);
    ensureDirectoryExists(resultedPath);
    return resultedPath;
}

export async function sleep(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

export function capitalizeString(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Split by any of the delimitators in the array.
 */
export function multiSplit(str: string, delimitators: string[]): string[] {
    return delimitators.reduce((prev, current) => prev.flatMap(val => val.split(current)), [str]).filter(s => !!s);
}

export function canApply(sessionSettings: SessionSettings) {
    const now = Date.now();
    return parseDate(sessionSettings.applyStartDate).getTime() <= now && now <= inclusiveDate(sessionSettings.applyEndDate).getTime();
}

export function inclusiveDate(dateStr: string | Date) {
    const date = new Date(dateStr);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export function parseDate(dateStr: string | Date) {
    const date = new Date(dateStr);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function stringifyDate(date: Date) {
    const offset = Math.abs(date.getTimezoneOffset());
    const hourOffset = ('' + Math.floor(offset / 60)).padStart(2, '0');
    const minuteOffset = ('' + offset % 60).padStart(2, '0');
    const sign = date.getTimezoneOffset() > 0 ? '-' : '+';
    const dateStr = `${date.getFullYear()}-${('' + (date.getMonth() + 1)).padStart(2, '0')}-${('' + date.getDate()).padStart(2, '0')}`;
    const timeStr = `${('' + date.getHours()).padStart(2, '0')}:${('' + date.getMinutes()).padStart(2, '0')}:${('' + date.getSeconds()).padStart(2, '0')}`;
    return `${dateStr}T${timeStr}${sign}${hourOffset}:${minuteOffset}`;
}


export function makeNameClause(name: string) {
    const names = name.toLocaleLowerCase().split(' ');
    const orClauses = names.map(name => {
        const likeName = `%${name}%`;
        return {
          [Op.or]: [
            { firstName: Sequelize.where(Sequelize.fn('lower', Sequelize.col('firstName')), 'LIKE', likeName) },
            { lastName: Sequelize.where(Sequelize.fn('lower', Sequelize.col('lastName')), 'LIKE', likeName) },
          ]
        }
    }).splice(0, 3);

    return {
        [Op.or]: orClauses
    }
}

export function toFixedTruncate(number: number, digits: number) {
    let re = new RegExp("(\\d+\\.\\d{" + digits + "})(\\d)");
    let m = number.toString().match(re);
    return m ? parseFloat(m[1]) : number.valueOf();
};

export function arrayMap<T, K extends keyof any>(arr: T[], getKey: (item: T) => K) {
    return arr.reduce((map, val) => {
      map[getKey(val)] = val;
      return map;
    }, {} as Record<K, T>);
}

export function sortArr<T>(arr: T[], compareFns: ((a: T, b: T) => number)[]) {
    arr.sort((a, b) => {
        for(let fn of compareFns) {
            const result = fn(a, b);
            if(result != 0) return result;
        }
        return 0;
    });
    return arr;
}
