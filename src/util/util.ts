export class ResponseError {
    code: string;
    message: string;
    httpStatusCode: number;
    constructor(message: string, code?: string, httpStatusCode?: number) {
        this.code = code;
        this.message = message;
        this.httpStatusCode = httpStatusCode || 400;
    }
}

export const removeDiacritics = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}