import bcrypt from 'bcrypt';
import { config } from '../config/config';
import {
  Sequelize,
  Model,
  ModelDefined,
  DataTypes,
  HasManyGetAssociationsMixin,
  HasManyAddAssociationMixin,
  HasManyHasAssociationMixin,
  Association,
  HasManyCountAssociationsMixin,
  HasManyCreateAssociationMixin,
  HasOneCreateAssociationMixin,
  Optional,
  BelongsToCreateAssociationMixin,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  HasOneGetAssociationMixin,
  HasManySetAssociationsMixin,
  HasOneSetAssociationMixin
} from "sequelize";

export const sequelize = new Sequelize(config.DATABASE_STRING);

export type DomainType = 'bachelor' | 'master';

interface DomainAttributes {
  id: number;
  name: string;
  type: DomainType,
  specializations?: Specialization[]
}

interface DomainCreationAttributes extends Optional<DomainAttributes, "id"> {}

export class Domain extends Model<DomainAttributes, DomainCreationAttributes> implements DomainAttributes {
  public id: number;
  public name: string;
  public type: DomainType;

  public specializations?: Specialization[];

  public studentNumber?: number;

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

export type UserType = 'student' | 'teacher' | 'admin';

interface UserAttributes {
  id: number;
  firstName: string;
  lastName: string;
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
  fullName: string;
  email: string;
}

interface UserCreationAttributes extends Optional<UserAttributes, "id" | "fullName" | "validated" | "password" | "CNP"> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public firstName!: string;
  public lastName!: string;
  public fullName!: string;
  public CNP!: string | null;
  public email!: string;
  public password!: string;
  public validated!: boolean;
  public type!: UserType;

  public student?: Student;
  public teacher?: Teacher;

  public getStudent!: HasOneCreateAssociationMixin<Student>;
  public getTeacher!: HasOneCreateAssociationMixin<Teacher>;


  public static associations: {
    student: Association<User, Student>;
    teacher: Association<User, Teacher>;
    //activationTokens: Association<User, ActivationToken>;
  };
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


type StudyForm = 'if' | 'id' | 'ifr';
type FundingForm = 'budget' | 'tax';

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
}

interface StudentCreationAttributes extends Optional<StudentAttributes, "id"> {}

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
  name: number;
}

interface TopicCreationAttributes extends Optional<TopicAttributes, "id"> {}

export class Topic extends Model<TopicAttributes, TopicCreationAttributes> implements TopicAttributes {
  id: number;
  name: number;
}

interface OfferAttributes {
  id: number;
  teacherId: number;
  domainId: number;
  limit: number;
}

interface OfferCreationAttributes extends Optional<OfferAttributes, "id"> {}

export class Offer extends Model<OfferAttributes, OfferCreationAttributes> implements OfferAttributes {
  id: number;
  teacherId: number;
  domainId: number;
  limit: number;

  takenPlaces: number;

  setTopics: HasManySetAssociationsMixin<Topic, number>;

  applications: Application[];
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
}


interface PaperAttributes {
  id: number;
  studentId: number;
  teacherId: number;
  committeeId: number | null;
  type: DomainType;
  title: string;
  description: string;
  isValid: boolean | null;
  gradeAverage: number | null;
}

interface PaperCreationAttributes extends Optional<PaperAttributes, "id" | "committeeId" | "isValid" | "gradeAverage"> {}

export class Paper extends Model<PaperAttributes, PaperCreationAttributes> implements PaperAttributes {
  public id: number;
  public studentId: number;
  public teacherId: number;
  public committeeId: number | null;
  public type: DomainType;
  public title: string;
  public description: string;
  public isValid: boolean | null;
  public gradeAverage: number | null;

  public student?: Student;
  public teacher?: Teacher;

  public documents?: Document[];
  public committee: Committee;
  public grades?: PaperGrade[];

  public static associations: {
    student: Association<Paper, Student>;
    teacher: Association<Paper, Teacher>;
    documents: Association<Paper, Document>;
    committee: Association<Paper, Committee>;
    grades: Association<Paper, PaperGrade>;
  };
}

export type DocumentType = 'generated' | 'signed' | 'copy';
export type UploadPerspective = 'student' | 'teacher' | 'committee';
export type DocumentCategory = 'secretary_files' | 'paper_files';

interface DocumentAttributes {
  id: number;
  paperId: number;
  name: string;
  category: DocumentCategory;
  type: DocumentType;
  mimeType: string;
  uploadedBy: number | null;
}

interface DocumentCreationAttributes extends Optional<DocumentAttributes, "id"> {}

export class Document extends Model<DocumentAttributes, DocumentCreationAttributes> implements DocumentAttributes {
  id: number;
  paperId: number;
  name: string;
  category: DocumentCategory;
  type: DocumentType;
  mimeType: string;
  uploadedBy: number | null;

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
}

interface CommitteeCreationAttributes extends Optional<CommitteeAttributes, "id"> {}

export class Committee extends Model<CommitteeAttributes, CommitteeCreationAttributes> implements CommitteeAttributes {
  id: number;
  name: string;

  members: Teacher[];
  papers?: Paper[]

  setDomains: HasManySetAssociationsMixin<Committee, Domain>;
  setPapers: HasManySetAssociationsMixin<Committee, Paper>;
  setMembers: HasManySetAssociationsMixin<Committee, Teacher>;

  public static associations: {
    papers: Association<Committee, Paper>;
    domains: Association<Committee, Domain>;
    members: Association<Committee, Teacher>;
  }

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
    allowNull: false
  },
  currentPromotion: {
    type: DataTypes.STRING,
    allowNull: false
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
          throw new Error('applyEndDate must be greater than applyStartDate.');
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
          throw new Error('fileSubmissionStartDate must be greater than applyStartDate.');
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
          throw new Error('fileSubmissionEndDate must be greater than fileSubmissionStartDate.');
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
          throw new Error('paperSubmissionEndDate must be greater than fileSubmissionStartDate.');
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
    unique: true,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['bachelor', 'master']],
    }
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
    type: DataTypes.INTEGER
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
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
    unique: true,
    allowNull: false
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
  fullName: {
    type: DataTypes.VIRTUAL,
    get() {
      return `${this.firstName} ${this.lastName}`;
    },
  },
  CNP: {
    type: DataTypes.STRING(13)
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
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
      isIn: [['student', 'teacher', 'admin']],
    }
  }
}, {
  timestamps: false,
  sequelize,
  modelName: 'user'
});

User.addScope("min", {
  attributes: ['id', 'firstName', 'lastName', 'fullName', 'email']
});

User.hasMany(ActivationToken);
ActivationToken.belongsTo(User);

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
  }
}, {
  timestamps: false,
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
  modelName: "teacher",
  timestamps: false
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
      min: 0
    }
  }
}, {
  timestamps: false,
  sequelize,
  modelName: "offer"
});

Teacher.hasMany(Offer);
Offer.belongsTo(Teacher);

Offer.belongsToMany(Topic, { through: "OfferTopics", timestamps: false });
Topic.belongsToMany(Offer, { through: "OfferTopics", timestamps: false });

Domain.hasMany(Offer);
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
      len: [3, 128]
    }
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [5, 1024]
    }
  },
  usedTechnologies: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [1, 256]
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

Student.hasMany(Application);
Application.belongsTo(Student, {
  foreignKey: {
    allowNull: false
  }
});

Offer.hasMany(Application);
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
      len: [3, 128]
    }
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [5, 1024]
    }
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['bachelor', 'master']]
    }
  },
  isValid: {
    type: DataTypes.BOOLEAN
  },
  gradeAverage: {
    type: DataTypes.VIRTUAL,
    get() {
      const grades = this.grades;
      if(grades) {
        let sum = 0;
        grades.forEach(grade => {
          sum += (grade.forPaper + grade.forPresentation) / 2;
        });
        return sum / grades.length;
      }
      return null;
    }
  }
  // documents
}, {
  timestamps: false,
  sequelize,
  modelName: "paper"
})

Student.hasOne(Paper);
Paper.belongsTo(Student);

Teacher.hasMany(Paper);
Paper.belongsTo(Teacher);

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
  }
}, {
  timestamps: true,
  paranoid: true,
  updatedAt: false,
  sequelize,
  modelName: "document"
})

Paper.hasMany(Document);
Document.belongsTo(Paper);

User.hasMany(Document, { foreignKey: 'uploadedBy' });
Document.belongsTo(User, { foreignKey: 'uploadedBy' });

Paper.addScope('documents', {
  include: [ sequelize.model("document") ]
});

Paper.addScope('teacher', {
  include: [{
    association: Paper.associations.teacher,
    include: [User.scope('min')]
  }]
});

Paper.addScope('student', {
  include: [{
    association: Paper.associations.student,
    include: [User.scope('min')]
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
    allowNull: false
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
  timestamps: false,
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
      Paper as typeof Model,
      Domain as typeof Model
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
  ]
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
      max: 10
    }
  },
  forPresentation: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10
    }
  }
}, {
  timestamps: false,
  sequelize,
  modelName: "paperGrade",
  defaultScope: {
    include: [{
      model: <typeof Model>Teacher,
      include: [User.scope("min")]
    }]
  }
});

Committee.belongsToMany(Teacher, { through: sequelize.model('committeeMember'), as: 'members' });
Teacher.belongsToMany(Committee, { through: sequelize.model('committeeMember') });

Committee.belongsToMany(Domain, { through: 'committeeDomains', timestamps: false });
Domain.belongsToMany(Committee, { through: 'committeeDomains', timestamps: false });

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

sequelize.sync()
  .then(() => console.log('Database has synced correctly.'))
  .catch(error => console.log('This error occured', error));

