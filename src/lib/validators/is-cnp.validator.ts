import { ValidateBy, ValidationOptions } from "class-validator";

export const IS_CNP = 'isCnp';

export function isCnp(value: unknown): boolean {
  try {
    if (typeof value !== 'string') {
      throw new CnpParseError("invalid_structure", "CNP must be a string");
    }
    parseCnp(value);
    return true;
  } catch (e) {
    return false;
  }
}

export function IsCnp(validationOptions?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_CNP,
      validator: {
        validate: (value) => isCnp(value),
        defaultMessage: () => 'CNP-ul este invalid.',
      },
    },
    validationOptions
  );
}

/**
 * https://ro.wikipedia.org/wiki/Cod_numeric_personal
 * @param cnp SYYMMDDJJDDDC
 */
function parseCnp(cnp: string): ParsedCNP {
  const rgx = /^[0-9]{13}$/;
  if (!cnp.match(rgx)) {
    throw new CnpParseError("invalid_structure", "Structura CNP-ului este invalidă.");
  }
  const yearSex = Number(cnp[0]);
  if (!(1 <= yearSex && yearSex <= 8)) {
    throw new CnpParseError("invalid_year_sex", "Cifra de sex/secol din CNP este invalidă.");
  }
  let parsedData: any = {};

  parsedData['gender'] = yearSex % 2 == 0 ? 'male' : 'female';

  let date = '';
  if (yearSex >= 7) {
    parsedData['isResident'] = true;
  } else {
    date = [1, 2].includes(yearSex) ? '19' : [3, 4].includes(yearSex) ? '18' : '20';
  }
  date += cnp.substring(1, 3) + '-' + cnp.substring(3, 5) + '-' + cnp.substring(5, 7); // YYYY-MM-DD
  const dateParsed = Date.parse(date);
  if (isNaN(dateParsed)) {
    throw new CnpParseError("invalid_date", "Data nașterii din CNP este invalidă.");
  } else {
    parsedData['dateBorn'] = dateParsed;
  }

  const county = Number(cnp.substring(7, 9));
  if (!((1 <= county && county <= 48) || [51, 52, 70, 80].includes(county))) {
    throw new CnpParseError("invalid_county", "Codul județului din CNP este invalid.");
  } else {
    parsedData['countyCode'] = county;
  }

  const mockCnp = '279146358279';
  const sum = cnp.split('').slice(0, 12).reduce((acc, digit, index) => {
    return acc + Number(digit) * Number(mockCnp[index]);
  }, 0) % 11;
  const controlDigit = sum == 10 ? 1 : sum;
  if (Number(cnp[12]) != controlDigit) {
    throw new CnpParseError("invalid_control_digit", "Cifra de control din CNP este invalidă.");
  }

  return parsedData;
};

class CnpParseError extends Error {
  code: string;
  override message: string;

  constructor(code: string, message: string) {
    super();
    this.code = code;
    this.message = message;
  }
}

interface ParsedCNP {
  gender: 'male' | 'female';
  countyCode: number;
  dateBorn?: number;
  isResident?: boolean;
}
