import { IsEmail, IsIn, Length } from "class-validator";

export class ProblemReportDto {

  @IsIn(["data", "feedback", "bug", "question"], { message: "Tip mesaj greșit." })
  type: string;

  @Length(16, 1024, { message: "Lungimea descrierii trebuie să fie între 16 și 1024 de caractere." })
  description: string;

  @IsEmail({}, { message: "Email invalid." })
  email: string;
  
}