import { SessionSettings } from "src/common/entities/session-settings.entity";
import { Paper } from "src/papers/entities/paper.entity";
import { Student } from "src/users/entities/user.entity";

export interface StudentDocumentGenerationProps {
  student: Student;
  paper: Paper;
  sessionSettings: SessionSettings;
  signatureSample?: string;
}