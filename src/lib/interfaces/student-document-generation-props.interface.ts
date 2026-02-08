import { SessionSettings } from "../../common/entities/session-settings.entity";
import { Paper } from "../../papers/entities/paper.entity";
import { Student } from "../../users/entities/user.entity";

export interface StudentDocumentGenerationProps {
  student: Student;
  paper: Paper;
  sessionSettings: SessionSettings;
  signatureSample?: string;
}