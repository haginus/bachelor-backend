import path from "path";
import fs from "fs";
import { SessionSettings, Teacher } from "../models/models";

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
        "A": 3
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
    return new Date(sessionSettings.applyStartDate).getTime() <= now && now <= inclusiveDate(sessionSettings.applyEndDate).getTime();
}

export function inclusiveDate(dateStr: string | Date) {
    const date = new Date(dateStr);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}