import { SessionSettings } from "../models/models";
import { parseDate, stringifyDate } from "../util/util";

export class SessionSettingsDto {
  public sessionName: string;
  public currentPromotion: string;
  public applyStartDate: string;
  public applyEndDate: string;
  public fileSubmissionStartDate: string;
  public fileSubmissionEndDate: string;
  public paperSubmissionEndDate: string;
  public allowGrading: boolean;

  constructor(sessionSettings: SessionSettings) {
    this.sessionName = sessionSettings.sessionName;
    this.currentPromotion = sessionSettings.currentPromotion;
    this.applyStartDate = stringifyDate(parseDate(sessionSettings.applyStartDate));
    this.applyEndDate = stringifyDate(parseDate(sessionSettings.applyEndDate));
    this.fileSubmissionStartDate = stringifyDate(parseDate(sessionSettings.fileSubmissionStartDate));
    this.fileSubmissionEndDate = stringifyDate(parseDate(sessionSettings.fileSubmissionEndDate));
    this.paperSubmissionEndDate = stringifyDate(parseDate(sessionSettings.paperSubmissionEndDate));
    this.allowGrading = sessionSettings.allowGrading;
  }
}