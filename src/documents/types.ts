import { MappedPaper } from "../controllers/paper.controller";
import { SessionSettings, Student, StudentExtraData } from "../models/models";

export interface StudentDocumentGenerationProps {
  student: Student;
  extraData: StudentExtraData;
  paper: MappedPaper;
  sessionSettings: SessionSettings;
  signatureSample?: string;
}