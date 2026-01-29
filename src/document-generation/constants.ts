import { CivilState } from "src/lib/enums/civil-state.enum";
import { DomainType } from "src/lib/enums/domain-type.enum";
import { FundingForm } from "src/lib/enums/funding-form.enum";
import { PaperType } from "src/lib/enums/paper-type.enum";
import { StudyForm } from "src/lib/enums/study-form.enum";
import { UserType } from "src/lib/enums/user-type.enum";

export const CIVIL_STATES: Record<CivilState, string> = {
  [CivilState.NotMarried]: 'Necăsătorit',
  [CivilState.Married]: 'Căsătorit',
  [CivilState.Divorced]: 'Divorțat',
  [CivilState.Widow]: 'Văduv',
  [CivilState.ReMarried]: 'Recăsătorit',
};

export const DOMAIN_TYPES: Record<DomainType, string> = {
  [DomainType.Bachelor]: "licență",
  [DomainType.Master]: "master"
}

export const FUNDING_FORMS: Record<FundingForm, string> = {
  [FundingForm.Budget]: "buget",
  [FundingForm.Tax]: "taxă"
}

export const STUDY_FORMS: Record<StudyForm, string> = {
  [StudyForm.IF]: "Învățământ cu frecvență",
  [StudyForm.IFR]: "Învățământ cu frecvență redusă",
  [StudyForm.ID]: "Învățământ la distanță"
}

export const USER_TYPES: Record<UserType, string> = {
  [UserType.Student]: "student",
  [UserType.Teacher]: "profesor",
  [UserType.Secretary]: "secretar",
  [UserType.Admin]: "administrator"
}

export const PAPER_TYPES: Record<PaperType, string> = {
  [PaperType.Bachelor]: "licență",
  [PaperType.Diploma]: "diplomă",
  [PaperType.Master]: "disertație",
}

export const NUMBERS = {
  1: "unu",
  2: "doi",
  3: "trei",
  4: "patru",
  5: "cinci",
  6: "șase",
  7: "șapte",
  8: "opt",
  9: "nouă",
  10: "zece",
}