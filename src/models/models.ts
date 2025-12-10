import bcrypt from 'bcrypt';
import { config } from '../config/config';
import {
  Sequelize,
  Model,
  DataTypes,
  HasManyGetAssociationsMixin,
  HasManyAddAssociationMixin,
  Association,
  HasManyCountAssociationsMixin,
  HasManyCreateAssociationMixin,
  HasOneCreateAssociationMixin,
  Optional,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  HasOneGetAssociationMixin,
  HasManySetAssociationsMixin,
  HasOneSetAssociationMixin
} from "sequelize";
import { toFixedTruncate } from '../util/util';
import { LogName } from '../lib/types/enums/log-name.enum';
import { LogSeverity } from '../lib/types/enums/log-severity.enum';

export const sequelize = new Sequelize(config.DATABASE_STRING, {
  logging: !config.DISABLE_SEQUELIZE_LOGGING
});

export type DomainType = 'bachelor' | 'master';
export type PaperType = 'bachelor' | 'diploma' | 'master';

interface DomainAttributes {
  id: number;
  name: string;
  type: DomainType;
  paperType: PaperType;
  specializations?: Specialization[]
}

interface DomainCreationAttributes extends Optional<DomainAttributes, "id"> {}

export class Domain extends Model<DomainAttributes, DomainCreationAttributes> implements DomainAttributes {
  public id: number;
  public name: string;
  public type: DomainType;
  public paperType: PaperType;

  public specializations?: Specialization[];

  public studentNumber?: number;
  public students: Student[];

  public static associations: {
    specializations: Association<Domain, Specialization>;
  }

}

interface SpecializationAttributes {
  id: number;
  domainId: number;
  name: string;
  studyYears: string;
}

interface SpecializationCreationAttributes extends Optional<SpecializationAttributes, "id"> {}

export class Specialization extends Model<SpecializationAttributes, SpecializationCreationAttributes> implements SpecializationAttributes {
  id: number;
  domainId: number;
  name: string;
  studyYears: string;

  studentNumber?: number;
  domain?: Domain;
}

interface ActivationTokenAttributes {
  id: number;
  userId: number;
  token: string;
  used: boolean;
}

interface ActivationTokenCreationAttributes extends Optional<ActivationTokenAttributes, "id" | "used"> {}

export class ActivationToken extends Model<ActivationTokenAttributes, ActivationTokenCreationAttributes> implements ActivationTokenAttributes {
  id: number;
  userId: number;
  token: string;
  used: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export type UserType = 'student' | 'teacher' | 'admin' | 'secretary';

interface UserAttributes {
  id: number;
  firstName: string;
  lastName: string;
  title: string | null;
  fullName: string;
  CNP: string;
  email: string;
  password: string;
  validated: boolean;
  type: UserType;
}

interface UserMinAttributes {
  id: number;
  firstName: string;
  lastName: string;
  title: string | null;
  fullName: string;
  email: string;
}

interface UserCreationAttributes extends Optional<UserAttributes, "id" | "fullName" | "validated" | "password" | "CNP" | "title"> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public firstName!: string;
  public lastName!: string;
  public title!: string;
  public fullName!: string;
  public CNP!: string | null;
  public email!: string;
  public password!: string;
  public validated!: boolean;
  public type!: UserType;

  public _impersonatedById?: number;

  public student?: Student;
  public teacher?: Teacher;
  public profile?: Profile;

  public getStudent!: HasOneGetAssociationMixin<Student>;
  public getTeacher!: HasOneGetAssociationMixin<Teacher>;
  public getProfile!: HasOneGetAssociationMixin<Profile>;
  public createProfile!: HasOneCreateAssociationMixin<Profile>;


  public static associations: {
    student: Association<User, Student>;
    teacher: Association<User, Teacher>;
    profile: Association<User, Profile>;
    //activationTokens: Association<User, ActivationToken>;
  };
}

interface ProfileAttributes {
  userId: number;
  bio?: string;
  website?: string;
  picture?: string;
}

export class Profile extends Model<ProfileAttributes, ProfileAttributes> implements ProfileAttributes {
  public userId!: number;
  public bio!: string;
  public website!: string;
  public picture!: string;

  public getUser!: BelongsToGetAssociationMixin<User>;

  public static associations: {
    user: Association<Profile, User>;
  }
}

interface TeacherAttributes {
  id: number;
  userId: number;
}

interface TeacherCreationAttributes extends Optional<TeacherAttributes, "id"> {}

export class Teacher extends Model<TeacherAttributes, TeacherCreationAttributes> implements TeacherAttributes {
  public id!: number;
  public userId!: number;

  public user?: User;
  public offers?: Offer[];
  public papers: Paper[];

  public committeeMember?: CommitteeMember;

  public getPapers!: HasManyGetAssociationsMixin<Paper>;
  public createPaper!: HasManyCreateAssociationMixin<Paper>;

  public getOffers!: HasManyGetAssociationsMixin<Offer>;
  public getCommittees!: HasManyGetAssociationsMixin<Committee>;
  public countCommittees!: HasManyCountAssociationsMixin;

  public static associations: {
    user: Association<Teacher, User>;
    papers: Association<Teacher, Paper>;
    offers: Association<Teacher, Offer>;
    committees: Association<Teacher, Committee>;
  };
}


export type StudyForm = 'if' | 'id' | 'ifr';
export type FundingForm = 'budget' | 'tax';

interface StudentAttributes {
  id: number;
  userId: number;
  domainId: number;
  specializationId: number;
  group: string;
  promotion: string;
  identificationCode: string; // cod matricol
  studyForm: StudyForm;
  matriculationYear: string;
  fundingForm: FundingForm;
  generalAverage: number;
}

interface StudentCreationAttributes extends Optional<StudentAttributes, "id" | "generalAverage"> {}

export class Student extends Model<StudentAttributes, StudentCreationAttributes> implements StudentAttributes {
  public id: number;
  public userId: number;
  public domainId: number;
  public specializationId: number;
  public group: string;
  public promotion: string;
  public identificationCode: string;
  public studyForm: StudyForm;
  public matriculationYear: string;
  public fundingForm: FundingForm;
  public generalAverage: number;

  public user?: User;
  public paper?: Paper;
  public domain: Domain;
  public specialization: Specialization;
  public topics: Topic[];
  public studentExtraDatum: StudentExtraData;

  public getUser!: BelongsToGetAssociationMixin<User>;
  public setUser!: BelongsToSetAssociationMixin<User, number>;
  public getPaper!: HasOneGetAssociationMixin<Paper>;
  public createPaper!: HasOneCreateAssociationMixin<Paper>;
  public getTopics!: HasManyGetAssociationsMixin<Topic>;

  public getStudentExtraDatum!: HasOneGetAssociationMixin<StudentExtraData>

  public setTopics: HasManySetAssociationsMixin<Topic, number>


  public static associations: {
    user: Association<Student, User>;
    paper: Association<Student, Paper>;
    topics: Association<Student, Topic>;
    domain: Association<Student, Domain>;
    specialization: Association<Student, Specialization>;
  };
}

type CivilState = 'not_married' | 'married' | 'divorced' | 'widow' | 're_married';

interface StudentExtraDataAttributes {
  id: number;
  birthLastName: string;
  parentInitial: string;
  fatherName: string;
  motherName: string;
  civilState: CivilState;
  dateOfBirth: Date;
  citizenship: string;
  ethnicity: string;
  placeOfBirthCountry: string;
  placeOfBirthCounty: string;
  placeOfBirthLocality: string;
  landline: string;
  mobilePhone: string;
  personalEmail: string;
  studentId: number;
}

interface StudentExtraDataCreationAttributes extends Optional<StudentExtraDataAttributes, "id"> {}

export class StudentExtraData extends Model<StudentExtraDataAttributes, StudentExtraDataCreationAttributes>
  implements StudentExtraDataAttributes {
    id: number;
    birthLastName: string;
    parentInitial: string;
    fatherName: string;
    motherName: string;
    civilState: CivilState;
    dateOfBirth: Date;
    citizenship: string;
    ethnicity: string;
    placeOfBirthCountry: string;
    placeOfBirthCounty: string;
    placeOfBirthLocality: string;
    landline: string;
    mobilePhone: string;
    personalEmail: string;
    studentId: number;

    public address: Address;

    public setAddress: HasOneSetAssociationMixin<StudentExtraData, Address>
}

interface AddressAttributes {
  id: number;
  county: string;
  locality: string;
  street: string;
  streetNumber: string;
  building?: string;
  stair?: string;
  floor?: string;
  apartment?: string;
  studentExtraDatumId: string;
}

interface AddressCreationAttributes extends Optional<AddressAttributes, "id"> {}

export class Address extends Model<AddressAttributes, AddressCreationAttributes> implements AddressAttributes {
  id: number;
  county: string;
  locality: string;
  street: string;
  streetNumber: string;
  building?: string;
  stair?: string;
  floor?: string;
  apartment?: string;
  studentExtraDatumId: string;
}



interface TopicAttributes {
  id: number;
  name: string;
}

interface TopicCreationAttributes extends Optional<TopicAttributes, "id"> {}

export class Topic extends Model<TopicAttributes, TopicCreationAttributes> implements TopicAttributes {
  id: number;
  name: string;
}

interface OfferAttributes {
  id: number;
  teacherId: number;
  domainId: number;
  limit: number;
  description?: string;
}

interface OfferCreationAttributes extends Optional<OfferAttributes, "id"> {}

export class Offer extends Model<OfferAttributes, OfferCreationAttributes> implements OfferAttributes {
  id: number;
  teacherId: number;
  domainId: number;
  limit: number;
  description: string;

  takenPlaces: number;
  teacher?: Teacher;

  topics: Topic[];
  setTopics: HasManySetAssociationsMixin<Topic, number>;

  applications: Application[];

  public static associations: {
    teacher: Association<Offer, Teacher>;
    domain: Association<Offer, Domain>;
    topics: Association<Offer, Topic>;
    applications: Association<Offer, Application>;
  };
}

interface ApplicationAttributes {
  id: number;
  studentId: number;
  offerId: number;
  title: string;
  description: string;
  usedTechnologies: string | null;
  accepted: boolean | null;
}

interface ApplicationCreationAttributes extends Optional<ApplicationAttributes, "id" | "accepted"> {}

export class Application extends Model<ApplicationAttributes, ApplicationCreationAttributes> implements ApplicationAttributes {
  id: number;
  studentId: number;
  offerId: number;
  title: string;
  description: string;
  usedTechnologies: string | null;
  accepted: boolean | null;

  public student: Student;
  public offer: Offer;

  public static associations: {
    student: Association<Application, Student>;
    offer: Association<Application, Offer>;
  }
}

export interface PaperAttributes {
  id: number;
  studentId: number;
  teacherId: number;
  committeeId: number | null;
  type: PaperType;
  title: string;
  description: string;
  isValid: boolean | null;
  gradeAverage: number | null;
  submitted: boolean;
  scheduledGrading: Date | null;
}

interface PaperCreationAttributes extends Optional<PaperAttributes, "id" | "committeeId" | "isValid" | "gradeAverage" | "submitted"> {}

export class Paper extends Model<PaperAttributes, PaperCreationAttributes> implements PaperAttributes {
  public id: number;
  public studentId: number;
  public teacherId: number;
  public committeeId: number | null;
  public type: PaperType;
  public title: string;
  public description: string;
  public isValid: boolean | null;
  public gradeAverage: number | null;
  public submitted: boolean;
  public scheduledGrading: Date | null;

  public readonly createdAt!: Date;

  public student?: Student;
  public teacher?: Teacher;
  public topics?: Topic[];

  public getStudent: HasOneGetAssociationMixin<Student>;
  public setTopics: HasManySetAssociationsMixin<Topic, number>;
  public getCommittee: HasOneGetAssociationMixin<Committee>;
  public getGrades: HasManyGetAssociationsMixin<PaperGrade>;

  public documents?: Document[];
  public committee: Committee;
  public grades?: PaperGrade[];

  public static associations: {
    student: Association<Paper, Student>;
    teacher: Association<Paper, Teacher>;
    documents: Association<Paper, Document>;
    committee: Association<Paper, Committee>;
    grades: Association<Paper, PaperGrade>;
    topics: Association<Paper, Topic>;
  };
}

export type DocumentType = 'generated' | 'signed' | 'copy';
export type UploadPerspective = 'student' | 'teacher' | 'committee' | 'admin';
export type DocumentCategory = 'secretary_files' | 'paper_files';

interface DocumentAttributes {
  id: number;
  paperId: number;
  name: string;
  category: DocumentCategory;
  type: DocumentType;
  mimeType: string;
  uploadedBy: number | null;
  meta?: Record<string, any>;
}

export interface DocumentCreationAttributes extends Optional<DocumentAttributes, "id"> {}

export class Document extends Model<DocumentAttributes, DocumentCreationAttributes> implements DocumentAttributes {
  id: number;
  paperId: number;
  name: string;
  category: DocumentCategory;
  type: DocumentType;
  mimeType: string;
  uploadedBy: number | null;
  meta?: Record<string, any>;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  paper?: Paper;

  public static associations: {
    paper: Association<Document, Paper>;
  }
}


interface DocumentReuploadRequestAttributes {
  id: number;
  paperId: number;
  documentName: string;
  deadline: Date;
  comment: string;
}

export interface DocumentReuploadRequestCreationAttributes extends Optional<DocumentReuploadRequestAttributes, "id"> {}

export class DocumentReuploadRequest extends Model<DocumentReuploadRequestAttributes, DocumentReuploadRequestCreationAttributes> implements DocumentReuploadRequestAttributes {
  id: number;
  paperId: number;
  documentName: string;
  deadline: Date;
  comment: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  paper?: Paper;

  public static associations: {
    paper: Association<Document, Paper>;
  }
}

interface CommitteeAttributes {
  id: number;
  name: string;
  paperPresentationTime: number;
  publicScheduling: boolean;
  finalGrades: boolean;
}

interface CommitteeCreationAttributes extends Optional<CommitteeAttributes, "id" | "finalGrades"> {}

export class Committee extends Model<CommitteeAttributes, CommitteeCreationAttributes> implements CommitteeAttributes {
  id: number;
  name: string;
  paperPresentationTime: number;
  publicScheduling: boolean;
  finalGrades: boolean;

  members: Teacher[];
  papers?: Paper[]
  domains: Domain[];
  activityDays: CommitteeActivityDay[];

  setDomains: HasManySetAssociationsMixin<Committee, Domain>;
  setPapers: HasManySetAssociationsMixin<Paper, number>;
  addPaper: HasManyAddAssociationMixin<Paper, number>;
  addPapers: HasManyAddAssociationMixin<Paper[], number[]>;
  setMembers: HasManySetAssociationsMixin<Committee, Teacher>;

  public static associations: {
    papers: Association<Committee, Paper>;
    domains: Association<Committee, Domain>;
    members: Association<Committee, Teacher>;
  }

}

interface CommitteeActivityDayAttributes {
  id: number;
  location: string;
  startTime: Date | null;
  committeeId: number;
}

export interface CommitteeActivityDayCreationAttributes extends Optional<CommitteeActivityDayAttributes, "id"> {}


export class CommitteeActivityDay extends Model<CommitteeActivityDayAttributes, CommitteeActivityDayCreationAttributes> implements CommitteeActivityDayAttributes {
  id: number;
  location: string;
  startTime: Date | null;
  committeeId: number;
}

type CommitteMemberRole = 'president' | 'secretary' | 'member';

interface CommitteeMemberAttributes {
  committeeId: number;
  teacherId: number;
  role: CommitteMemberRole;
}

export class CommitteeMember extends Model<CommitteeMemberAttributes> implements CommitteeMemberAttributes {
  committeeId: number;
  teacherId: number;
  role: CommitteMemberRole;

  teacher?: Teacher;
  committee?: Committee;
}

interface PaperGradeAttributes {
  paperId: number;
  teacherId: number;
  forPaper: number;
  forPresentation: number;
}

export class PaperGrade extends Model<PaperGradeAttributes> implements PaperGradeAttributes {
  public paperId: number;
  public teacherId: number;
  public forPaper: number;
  public forPresentation: number;

  public teacher?: Teacher;
  public paper?: Paper;
}

export interface SignUpRequestAttributes {
  id: number;
  firstName: string;
  lastName: string;
  CNP: string;
  email: string;
  identificationCode: string;
  matriculationYear: string;
  specializationId: number;
  promotion: string;
  group: string;
  studyForm: StudyForm;
  fundingForm: FundingForm;
}

export interface SignUpRequestCreationAttributes extends Optional<SignUpRequestAttributes, "id"> {}

export class SignUpRequest extends Model<SignUpRequestAttributes, SignUpRequestCreationAttributes> implements SignUpRequestAttributes {
  id: number;
  firstName: string;
  lastName: string;
  CNP: string;
  email: string;
  identificationCode: string;
  matriculationYear: string;
  specializationId: number;
  promotion: string;
  group: string;
  studyForm: StudyForm;
  fundingForm: FundingForm;

  specialization?: Specialization;

  static associations: {
    specialization: Association<SignUpRequest, Specialization>;
  }
}

interface SessionSettingsAttributes {
  lock?: 'X';
  sessionName: string;
  currentPromotion: string;
  applyStartDate: Date;
  applyEndDate: Date;
  fileSubmissionStartDate: Date;
  fileSubmissionEndDate: Date;
  paperSubmissionEndDate: Date;
  allowGrading: boolean;
}

interface SessionSettingsCreationAttributes extends Optional<SessionSettingsAttributes, "lock"> {} 

export class SessionSettings extends Model<SessionSettingsAttributes, SessionSettingsCreationAttributes> implements SessionSettingsAttributes {
  lock?: 'X';
  sessionName: string;
  currentPromotion: string;
  applyStartDate: Date;
  applyEndDate: Date;
  fileSubmissionStartDate: Date;
  fileSubmissionEndDate: Date;
  paperSubmissionEndDate: Date;
  allowGrading: boolean;
}

export interface SignatureAttributes {
  id: number;
  userId: number;
}

interface SignatureCreationAttributes extends Optional<SignatureAttributes, "id"> {}

export class Signature extends Model<SignatureAttributes, SignatureCreationAttributes> implements SignatureAttributes {
  id: number;
  userId: number;
}

export interface LogAttributes {
  id: number;
  name: LogName;
  timestamp: Date;
  severity: LogSeverity;
  byUserId: number | null;
  impersonatedByUserId?: number;
  meta?: Record<string, any>;
  userId?: number;
  studentExtraDataId?: number;
  paperId?: number;
  documentId?: number;
  documentReuploadRequestId?: number;
}

export interface LogCreationAttributes extends Optional<LogAttributes, "id" | "timestamp"> {}

export class Log extends Model<LogAttributes, LogCreationAttributes> implements LogAttributes {
  readonly id: number;
  readonly name: LogName;
  readonly timestamp: Date;
  readonly severity: LogSeverity;
  readonly byUserId: number | null;
  readonly impersonatedByUserId?: number;
  readonly meta?: Record<string, any>;
  readonly userId?: number;
  readonly studentExtraDataId?: number;
  readonly paperId?: number;
  readonly documentId?: number;
  readonly documentReuploadRequestId?: number;

  readonly user: User;
  readonly studentExtraData: StudentExtraData;
  readonly paper: Paper;
  readonly document: Document;
  readonly documentReuploadRequest: DocumentReuploadRequest;
}

SessionSettings.init({
  lock: { // table with one row
    type: DataTypes.CHAR,
    primaryKey: true,
    defaultValue: 'X',
    validate: {
      equals: 'X'
    }
  },
  sessionName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Numele sesiunii lipsește.'
      }
    }
  },
  currentPromotion: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Promoția curentă lipsește.'
      }
    }
  },
  applyStartDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  applyEndDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isGreaterThanApplyStartDate(value) {
        if (new Date(value).getTime() < new Date(this.applyStartDate).getTime()) {
          throw new Error('Data încheierii sesiunii de asociere nu poate fi mai devreme de cea a începerii.');
        }
      }
    }
  },
  fileSubmissionStartDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isGreaterThanApplyStartDate(value) {
        if (new Date(value).getTime() < new Date(this.applyStartDate).getTime()) {
          throw new Error('Data începerii depunerilor de documente nu poate fi mai devreme de cea a începerii sesiunii de asociere.');
        }
      }
    }
  },
  fileSubmissionEndDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isGreaterThanFileSubmissionStartDate(value) {
        if (new Date(value).getTime() < new Date(this.fileSubmissionStartDate).getTime()) {
          throw new Error('Data încheierii depunerilor de documente nu poate fi mai devreme de cea a începerii.');
        }
      }
    }
  },
  paperSubmissionEndDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isGreaterThanFileSubmissionStartDate(value) {
        if (new Date(value).getTime() < new Date(this.fileSubmissionStartDate).getTime()) {
          throw new Error('Termenul limită pentru depunerea lucrărilor nu poate fi mai devreme de data începerii depunerilor de documente.');
        }
      }
    }
  },
  allowGrading: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
},
{
  timestamps: false,
  sequelize,
  modelName: "sessionSettings",
  defaultScope: {
    attributes: {
      exclude: ['lock']
    }
  }
});

Domain.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Numele domeniului lipsește.'
      }
    }
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: {
        args: [['bachelor', 'master']],
        msg: 'Tipul domeniului este invalid.'
      },
    }
  },
  paperType: {
    type: DataTypes.STRING,
    allowNull: false,
  }
}, {
  timestamps: false,
  sequelize,
  modelName: "domain"
});

Specialization.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  domainId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: {
      name: 'domainSpecializationNameUnique',
      msg: 'Numele specializării trebuie să fie unic în domeniu.'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      name: 'domainSpecializationNameUnique',
      msg: 'Numele specializării trebuie să fie unic în domeniu.'
    }
  },
  studyYears: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3
  }
}, {
  timestamps: false,
  sequelize,
  modelName: "specialization"
});

Domain.hasMany(Specialization, {
  onDelete: "CASCADE"
});
Specialization.belongsTo(Domain);

Domain.addScope('specializations', {
  include: {
    model: sequelize.model('specialization'),
    attributes: {
      include: [
        [Sequelize.literal(`(SELECT COUNT(*) FROM students WHERE specializationId = specializations.id)`), 'studentNumber']
      ]
    }
  }
})

Topic.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    unique: {
      name: 'uniqueTopicName',
      msg: 'Numele temei trebuie să fie unic.'
    },
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Lipsește numele temei.'
      }
    }
  }
},
{
  timestamps: false,
  sequelize,
  modelName: "topic"
});

ActivationToken.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  sequelize,
  modelName: "activationToken"
});

User.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING
  },
  fullName: {
    type: DataTypes.VIRTUAL,
    get() {
      let title = this.title ? this.title + ' ' : '';
      return `${title}${this.lastName} ${this.firstName}`;
    },
  },
  CNP: {
    type: DataTypes.STRING(13)
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    set(value) {
      const salt = bcrypt.genSaltSync();
      this.setDataValue('password', bcrypt.hashSync(value, salt));
    }
  },
  validated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['student', 'teacher', 'admin', 'secretary']],
    }
  }
}, {
  timestamps: true,
  createdAt: false,
  updatedAt: false,
  paranoid: true,
  sequelize,
  modelName: 'user',
});

User.addScope("min", {
  attributes: ['id', 'title', 'firstName', 'lastName', 'fullName', 'email']
});

User.hasMany(ActivationToken, { onDelete: 'CASCADE' });
ActivationToken.belongsTo(User);

Profile.init({
  userId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  bio: {
    type: DataTypes.STRING,
    allowNull: true
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true
  },
  picture: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: false,
  sequelize,
  modelName: 'profile'
});

User.hasOne(Profile, {
  onDelete: "CASCADE"
});
Profile.belongsTo(User, {
  onDelete: "CASCADE"
});

User.addScope("profile", {
  include: [ sequelize.model("profile") ]
});

Student.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
  },
  domainId: {
    type: DataTypes.INTEGER,
  },
  specializationId: {
    type: DataTypes.INTEGER,
  },
  group: {
    type: DataTypes.STRING,
    allowNull: false
  },
  promotion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  identificationCode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fundingForm: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['budget', 'tax']],
    }
  },
  matriculationYear: {
    type: DataTypes.STRING,
    allowNull: false
  },
  studyForm: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['if', 'ifr', 'id']],
    }
  },
  generalAverage: {
    type: DataTypes.DOUBLE,
  },
}, {
  timestamps: true,
  createdAt: false,
  updatedAt: false,
  paranoid: true,
  sequelize,
  modelName: "student"
});

User.hasOne(Student, {
  onDelete: "CASCADE"
});
Student.belongsTo(User, {
  onDelete: "CASCADE"
});

Domain.hasMany(Student);
Student.belongsTo(Domain);

Specialization.hasMany(Student);
Student.belongsTo(Specialization);

Student.belongsToMany(Topic, { through: "StudentTopics", timestamps: false });
Topic.belongsToMany(Student, { through: "StudentTopics", timestamps: false });


Teacher.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
  },
}, {
  sequelize,
  timestamps: true,
  createdAt: false,
  updatedAt: false,
  paranoid: true,
  modelName: "teacher",
});

User.hasOne(Teacher, {
  onDelete: "CASCADE"
});
Teacher.belongsTo(User, {
  onDelete: "CASCADE"
});

Offer.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  teacherId: {
    type: DataTypes.INTEGER,
  },
  domainId: {
    type: DataTypes.INTEGER,
  },
  limit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      isInt: true
    }
  },
  description: {
    type: DataTypes.STRING(1024),
    allowNull: true,
  }
}, {
  timestamps: false,
  sequelize,
  modelName: "offer",
  defaultScope: {
    include: {
      model: Topic,
      through: {
        attributes: []
      }
    }
  }
});

Teacher.hasMany(Offer, { onDelete: 'CASCADE' });
Offer.belongsTo(Teacher);

Offer.belongsToMany(Topic, { through: "OfferTopics", timestamps: false });
Topic.belongsToMany(Offer, { through: "OfferTopics", timestamps: false });

Domain.hasMany(Offer, { onDelete: 'CASCADE' });
Offer.belongsTo(Domain);


Application.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  studentId: {
    type: DataTypes.INTEGER,
  },
  offerId: {
    type: DataTypes.INTEGER,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [3, 256],
        msg: 'Lungimea titlului trebuie să fie între 3 și 256 de caractere.'
      },
    },
    
  },
  description: {
    type: DataTypes.STRING(1024),
    allowNull: false,
    validate: {
      len: {
        args: [64, 1024],
        msg: 'Lungimea descrierii trebuie să fie între 64 și 1024 de caractere.'
      }
    }
  },
  usedTechnologies: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: {
        args: [1, 256],
        msg: 'Lungimea tehnologiilor folosite trebuie să fie între 1 și 256 de caractere.'
      }
    }
  },
  accepted: {
    type: DataTypes.BOOLEAN
  }
}, {
  timestamps: false,
  sequelize,
  modelName: "application"
});

Student.hasMany(Application, { onDelete: 'CASCADE' });
Application.belongsTo(Student, {
  foreignKey: {
    allowNull: false
  }
});

Offer.hasMany(Application, { onDelete: 'CASCADE' });
Application.belongsTo(Offer);


Paper.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  studentId: {
    type: DataTypes.INTEGER,
  },
  teacherId: {
    type: DataTypes.INTEGER,
  },
  committeeId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 256]
    }
  },
  description: {
    type: DataTypes.STRING(1024),
    allowNull: false,
    validate: {
      len: [5, 1024]
    }
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isValid: {
    type: DataTypes.BOOLEAN
  },
  submitted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  scheduledGrading: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  gradeAverage: {
    type: DataTypes.VIRTUAL,
    get() {
      const grades = this.grades;
      if(grades?.length) {
        let sum = 0;
        grades.forEach(grade => {
          sum += (grade.forPaper + grade.forPresentation) / 2;
        });
        return toFixedTruncate(sum / grades.length, 2);
      }
      return null;
    }
  }
}, {
  timestamps: true,
  updatedAt: false,
  paranoid: true,
  sequelize,
  modelName: "paper",
  hooks: {
    beforeSave(instance) {
      if(!instance.committeeId) {
        instance.scheduledGrading = null;
      }
    },
  }
});

Student.hasOne(Paper, { onDelete: 'CASCADE' });
Paper.belongsTo(Student);

Teacher.hasMany(Paper);
Paper.belongsTo(Teacher);

Paper.belongsToMany(Topic, { through: "paperTopics", timestamps: false });
Topic.belongsToMany(Paper, { through: "paperTopics", timestamps: false });

Document.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  paperId: {
    type: DataTypes.INTEGER,
  },
  uploadedBy: {
    type: DataTypes.INTEGER,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['generated', 'signed', 'copy']]
    }
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  meta: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true,
  paranoid: true,
  updatedAt: false,
  sequelize,
  modelName: "document"
})

Paper.hasMany(Document, { onDelete: 'CASCADE' });
Document.belongsTo(Paper);

User.hasMany(Document, { foreignKey: 'uploadedBy' });
Document.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploadedByUser' });

DocumentReuploadRequest.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  paperId: {
    type: DataTypes.INTEGER,
  },
  documentName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  comment: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  deadline: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  }
}, {
  timestamps: true,
  paranoid: true,
  sequelize,
  modelName: "documentReuploadRequest"
});

Paper.hasMany(DocumentReuploadRequest, { onDelete: 'CASCADE' });
Document.belongsTo(Paper);

Paper.addScope('documents', {
  include: [ sequelize.model("document") ]
});

Paper.addScope('documentsPaperFiles', {
  include: [{ 
    model: sequelize.model("document"),
    required: false,
    where: { category: 'paper_files' }
  }]
});

Paper.addScope('documentReuploadRequests', {
  include: [ sequelize.model("documentReuploadRequest") ]
});

Paper.addScope('topics', {
  include: [{
    association: Paper.associations.topics,
    through: { attributes: [] }
  }]
});

Paper.addScope('teacher', {
  include: [{
    association: Paper.associations.teacher,
    include: [User.scope(['min', 'profile'])]
  }]
});

Paper.addScope('student', {
  include: [{
    association: Paper.associations.student,
    include: [User.scope(['min', 'profile'])]
  }]
});

StudentExtraData.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  studentId: {
    type: DataTypes.INTEGER,
  },
  birthLastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  parentInitial: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      is: /^[A-ZĂÎȘȚ]\.( [A-ZĂÎȘȚ]\.){0,2}$/
    }
  },
  fatherName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  motherName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  civilState: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['not_married', 'married', 'divorced', 'widow', 're_married']]
    }
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  citizenship: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ethnicity: {
    type: DataTypes.STRING,
    allowNull: false
  },
  placeOfBirthCountry: {
    type: DataTypes.STRING,
    allowNull: false
  },
  placeOfBirthCounty: {
    type: DataTypes.STRING,
    allowNull: false
  },
  placeOfBirthLocality: {
    type: DataTypes.STRING,
    allowNull: false
  },
  landline: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mobilePhone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  personalEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
},
{
  timestamps: true,
  createdAt: false,
  updatedAt: false,
  paranoid: true,
  sequelize,
  modelName: "studentExtraData"
});

Student.hasOne(StudentExtraData, {
  onDelete: "CASCADE"
});
StudentExtraData.belongsTo(Student);

Address.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  studentExtraDatumId: {
    type: DataTypes.INTEGER,
  },
  locality: {
    type: DataTypes.STRING,
    allowNull: false
  },
  county: {
    type: DataTypes.STRING,
    allowNull: false
  },
  street: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  streetNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  building: {
    type: DataTypes.STRING,
  },
  stair: {
    type: DataTypes.STRING,
  },
  floor: {
    type: DataTypes.STRING,
  },
  apartment: {
    type: DataTypes.STRING,
  },
},
{
  timestamps: false,
  sequelize,
  modelName: "address"
});

StudentExtraData.addScope('noKeys', {
  attributes: {
    exclude: ['id', 'studentId']
  },
  include: [{
    model: sequelize.model('address'),
    attributes: {
      exclude: ['studentExtraDatumId', 'id']
    }
  }]
})

StudentExtraData.addScope('defaultScope', {
  include: [{
    model: sequelize.model('address')
  }]
})

StudentExtraData.hasOne(Address, {
  onDelete: "CASCADE"
});
Address.belongsTo(StudentExtraData);

Committee.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  finalGrades: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  paperPresentationTime: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 15,
    validate: {
      min: 1,
      max: 120,
      isInt: true
    }
  },
  publicScheduling: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
}, {
  timestamps: false,
  sequelize,
  modelName: "committee",
  defaultScope: { 
    include: [
      {
        model: Teacher.scope('defaultScope'),
        as: 'members',
        include: [User.scope("min")]
      },
      Paper,
      {
        model: Domain,
        include: [Specialization]
      },
      {
        model: CommitteeActivityDay,
        as: 'activityDays',
      }
    ] 
  }
});

Committee.addScope("min", {
  include: [
    {
      model: Teacher.scope('defaultScope'),
      as: 'members',
      include: [User.scope("min")]
    },
    {
      model: CommitteeActivityDay,
      as: 'activityDays',
    }
  ]
});

CommitteeActivityDay.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  committeeId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
}, {
  timestamps: false,
  sequelize,
  modelName: "committeeActivityDay",
});

CommitteeMember.init({
  committeeId: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  teacherId: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['president', 'secretary', 'member']]
    }
  }
},{
  timestamps: false,
  sequelize,
  modelName: "committeeMember"
});

PaperGrade.init({
  paperId: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  teacherId: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  forPaper: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10,
      isInt: true
    }
  },
  forPresentation: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10,
      isInt: true
    }
  }
}, {
  timestamps: false,
  sequelize,
  modelName: "paperGrade",
  defaultScope: {
    include: [{
      model: Teacher,
      include: [User.scope("min")]
    }]
  }
});

PaperGrade.addScope("min", { include: [] });

Committee.belongsToMany(Teacher, { through: sequelize.model('committeeMember'), as: 'members' });
Teacher.belongsToMany(Committee, { through: sequelize.model('committeeMember') });

Committee.belongsToMany(Domain, { through: 'committeeDomains', timestamps: false });
Domain.belongsToMany(Committee, { through: 'committeeDomains', timestamps: false });

Committee.hasMany(CommitteeActivityDay, { as: 'activityDays' });
CommitteeActivityDay.belongsTo(Committee);

Committee.hasMany(Paper);
Paper.belongsTo(Committee);

Paper.addScope('committee', {
  include: [ Committee.scope("min") ]
});

Paper.hasMany(PaperGrade, { as: 'grades'} );
PaperGrade.belongsTo(Paper);

Teacher.hasMany(PaperGrade, { as: 'givenGrades'} );
PaperGrade.belongsTo(Teacher);

Paper.addScope('grades', {
  include: [{
    association: Paper.associations.grades
  }]
});

Paper.addScope('gradesMin', {
  include: [{
    model: PaperGrade.scope('min'),
    as: 'grades'
  }]
});

SignUpRequest.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  CNP: {
    type: DataTypes.STRING,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  identificationCode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  matriculationYear: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  specializationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  promotion: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  group: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  studyForm: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['if', 'ifr', 'id']],
    }
  },
  fundingForm: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['budget', 'tax']],
    }
  },
}, {
  timestamps: false,
  sequelize,
  modelName: "signUpRequest",
  defaultScope: {
    include: [{
      model: Specialization,
      include: [Domain]
    }]
  }
});

Specialization.hasMany(SignUpRequest);
SignUpRequest.belongsTo(Specialization);

Signature.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
  },
}, {
  timestamps: true,
  paranoid: true,
  sequelize,
  modelName: 'signature'
});

User.hasOne(Signature, { onDelete: "CASCADE" });
Signature.belongsTo(User, { onDelete: "CASCADE" });

Log.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  severity: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  byUserId: {
    type: DataTypes.INTEGER,
  },
  impersonatedByUserId: {
    type: DataTypes.INTEGER,
  },
  meta: {
    type: DataTypes.JSON,
  },
  userId: {
    type: DataTypes.INTEGER,
  },
  studentExtraDataId: {
    type: DataTypes.INTEGER,
  },
  paperId: {
    type: DataTypes.INTEGER,
  },
  documentId: {
    type: DataTypes.INTEGER,
  },
  documentReuploadRequestId: {
    type: DataTypes.INTEGER,
  }
}, {
  timestamps: true,
  createdAt: 'timestamp',
  updatedAt: false,
  sequelize,
  modelName: "log"
});

Log.belongsTo(User, { constraints: false, foreignKey: 'byUserId', as: 'byUser' });
Log.belongsTo(User, { constraints: false, foreignKey: 'impersonatedByUserId', as: 'impersonatedByUser' });
Log.belongsTo(User, { constraints: false, foreignKey: 'userId' });
Log.belongsTo(StudentExtraData, { constraints: false, foreignKey: 'studentExtraDataId', as: 'studentExtraData' });
Log.belongsTo(Paper, { constraints: false, foreignKey: 'paperId' });
Log.belongsTo(Document, { constraints: false, foreignKey: 'documentId' });
Log.belongsTo(DocumentReuploadRequest, { constraints: false, foreignKey: 'documentReuploadRequestId' });

sequelize.sync()
  .then(() => {
    SessionSettings.findOrCreate(
      {
        where: { lock: 'X' },
        defaults: { 
          lock: 'X',
          sessionName: 'Sesiune nouă',
          applyStartDate: new Date(),
          applyEndDate: new Date(),
          fileSubmissionStartDate: new Date(),
          fileSubmissionEndDate: new Date(),
          paperSubmissionEndDate: new Date(),
          allowGrading: false,
          currentPromotion: new Date().getFullYear().toString()
      }
    }).then(() => {
      console.log('Database has synced correctly.');
    });
  })
  .catch(error => console.log('This error occured', error));
