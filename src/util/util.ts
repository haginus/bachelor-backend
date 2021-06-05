export class ResponseError extends Error {
    code: string;
    message: string;
    httpStatusCode: number;
    constructor(message: string, code?: string, httpStatusCode?: number) {
        super();
        this.code = code || 'BAD_REQUEST';
        this.message = message;
        this.httpStatusCode = httpStatusCode || 400;
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