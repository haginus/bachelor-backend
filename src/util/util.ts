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