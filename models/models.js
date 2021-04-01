const Sequelize = require('sequelize');
const bcrypt = require('bcrypt');
const { config } = require('../config/config');

const sequelize = new Sequelize(config.DATABASE_STRING);

const SessionSettings = sequelize.define('sessionSettings', {
  lock: { // table with one row
    type: Sequelize.CHAR,
    primaryKey: true,
    defaultValue: 'X',
    validate: {
      equals: 'X'
    }
  },
  sessionName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  currentPromotion: {
    type: Sequelize.STRING,
    allowNull: false
  },
  applyStartDate: {
    type: Sequelize.DATEONLY,
    allowNull: false
  },
  applyEndDate: {
    type: Sequelize.DATEONLY,
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
    type: Sequelize.DATEONLY,
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
    type: Sequelize.DATEONLY,
    allowNull: false,
    validate: {
      isGreaterThanFileSubmissionStartDate(value) {
        if (new Date(value).getTime() < new Date(this.fileSubmissionStartDate).getTime()) {
          throw new Error('fileSubmissionEndDate must be greater than fileSubmissionStartDate.');
        }
      }
    }
  }
},
{
  timestamps: false,
  defaultScope: {
    attributes: {
      exclude: ['lock']
    }
  }
});

const Domain = sequelize.define('domain', {
  name: {
    type: Sequelize.STRING,
    unique: true,
    allowNull: false
  },
  type: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      isIn: [['bachelor', 'master']],
    }
  }
}, {
  timestamps: false
});

const Specialization = sequelize.define('specialization', {
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  studyYears: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 3
  }
}, {
  timestamps: false
});

Domain.hasMany(Specialization, {
  onDelete: "CASCADE"
});
Specialization.belongsTo(Domain);

Domain.addScope('specializations', {
  include: {
    model: Specialization,
    attributes: {
      include: [
        [sequelize.literal(`(SELECT COUNT(*) FROM students WHERE specializationId = specializations.id)`), 'studentNumber']
      ]
    }
  }
})

const Topic = sequelize.define('topic', {
  name: {
    type: Sequelize.STRING,
    unique: true,
    allowNull: false
  }
},
{
  timestamps: false
});

const ActivationToken = sequelize.define('activationToken', {
  token: {
    type: Sequelize.STRING,
    allowNull: false
  },
  used: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  }
});

const User = sequelize.define('user', {
  firstName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  lastName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  fullName: {
    type: Sequelize.VIRTUAL,
    get() {
      return `${this.firstName} ${this.lastName}`;
    },
  },
  CNP: {
    type: Sequelize.STRING(13),
    allowNull: false
  },
  email: {
    type: Sequelize.STRING,
    unique: true,
    allowNull: false
  },
  password: {
    type: Sequelize.STRING,
    set(value) {
      const salt = bcrypt.genSaltSync();
      this.setDataValue('password', bcrypt.hashSync(value, salt));
    }
  },
  validated: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  type: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      isIn: [['student', 'teacher', 'admin']],
    }
  }
}, {
  timestamps: false
});

User.hasMany(ActivationToken);
ActivationToken.belongsTo(User);

const Student = sequelize.define('student', {
  group: {
    type: Sequelize.STRING,
    allowNull: false
  },
  promotion: {
    type: Sequelize.STRING,
    allowNull: false
  },
  identificationCode: {
    type: Sequelize.STRING,
    allowNull: false
  },
  fundingForm: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      isIn: [['budget', 'tax']],
    }
  },
  matriculationYear: {
    type: Sequelize.STRING,
    allowNull: false
  },
  studyForm: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      isIn: [['if', 'ifr', 'id']],
    }
  }
}, {
  timestamps: false
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


const Teacher = sequelize.define('teacher', {
}, {
  timestamps: false
});

User.hasOne(Teacher, {
  onDelete: "CASCADE"
});
Teacher.belongsTo(User, {
  onDelete: "CASCADE"
});

const Offer = sequelize.define('offer', {
  limit: {
    type: Sequelize.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  }
}, {
  timestamps: false
});

Teacher.hasMany(Offer);
Offer.belongsTo(Teacher);

Offer.belongsToMany(Topic, { through: "OfferTopics", timestamps: false });
Topic.belongsToMany(Offer, { through: "OfferTopics", timestamps: false });

Domain.hasMany(Offer);
Offer.belongsTo(Domain);


const Application = sequelize.define('application', {
  title: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      len: [3, 128]
    }
  },
  description: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      len: [5, 1024]
    }
  },
  usedTechnologies: {
    type: Sequelize.STRING,
    allowNull: true,
    validate: {
      len: [1, 256]
    }
  },
  accepted: {
    type: Sequelize.BOOLEAN
  }
}, {
  timestamps: false
});

Student.hasMany(Application);
Application.belongsTo(Student, {
  foreignKey: {
    allowNull: false
  }
});

Offer.hasMany(Application);
Application.belongsTo(Offer);


const Paper = sequelize.define('paper', {
  title: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      len: [3, 128]
    }
  },
  description: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      len: [5, 1024]
    }
  },
  type: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      isIn: [['bachelor', 'master']]
    }
  },
  // documents
}, {
  timestamps: false
})

Student.hasOne(Paper);
Paper.belongsTo(Student);

Teacher.hasMany(Paper);
Paper.belongsTo(Teacher);

const Document = sequelize.define('document', {
  name: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      isIn: [[
        'sign_up_form', // Fisa de inscriere
        'identity_card', // Copie CI
        'birth_centificate', // Certificat de nastere
        'bacalaureat_diploma', // Diploma bacalaureat
        'marriage_certificate', // Certificat de casatorie
        'language_certificate', // Certificat de competență lingvistică
        'statutory_declaration', // Declaratie pe proprie raspundere,
        "liquidation_form", // Formular de lichidare
        "bachelor_diploma" // Diplomă de licență
      ]],
    }
  },
  type: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      isIn: [['generated', 'signed', 'copy']]
    }
  },
  mimeType: {
    type: Sequelize.STRING,
    allowNull: false
  }
}, {
  timestamps: true,
  paranoid: true,
  updatedAt: false
})

Paper.hasMany(Document);
Document.belongsTo(Paper);

Paper.addScope('documents', {
  include: [{
    model: Document,
  }]
});

Paper.addScope('teacher', {
  include: [{
    model: Teacher,
    include: [{
      model: User,
      attributes: ['id', 'firstName', 'lastName']
    }]
  }]
});

const StudentExtraData = sequelize.define('studentExtraData', {
  birthLastName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  parentInitial: {
    type: Sequelize.STRING,
    allowNull: false
  },
  fatherName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  motherName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  civilState: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      isIn: [['not_married', 'married', 'divorced', 'widow', 're_married']]
    }
  },
  dateOfBirth: {
    type: Sequelize.DATEONLY,
    allowNull: false
  },
  citizenship: {
    type: Sequelize.STRING,
    allowNull: false
  },
  ethnicity: {
    type: Sequelize.STRING,
    allowNull: false
  },
  placeOfBirthCountry: {
    type: Sequelize.STRING,
    allowNull: false
  },
  placeOfBirthCounty: {
    type: Sequelize.STRING,
    allowNull: false
  },
  placeOfBirthLocality: {
    type: Sequelize.STRING,
    allowNull: false
  },
  landline: {
    type: Sequelize.STRING,
    allowNull: false
  },
  mobilePhone: {
    type: Sequelize.STRING,
    allowNull: false
  },
  personalEmail: {
    type: Sequelize.STRING,
    allowNull: false
  },
},
{
  timestamps: false
});

Student.hasOne(StudentExtraData, {
  onDelete: "CASCADE"
});
StudentExtraData.belongsTo(Student);

const Address = sequelize.define('address', {
  locality: {
    type: Sequelize.STRING,
    allowNull: false
  },
  county: {
    type: Sequelize.STRING,
    allowNull: false
  },
  street: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  streetNumber: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  building: {
    type: Sequelize.STRING,
  },
  stair: {
    type: Sequelize.STRING,
  },
  floor: {
    type: Sequelize.STRING,
  },
  apartment: {
    type: Sequelize.STRING,
  },
},
{
  timestamps: false
});

StudentExtraData.addScope('noKeys', {
  attributes: {
    exclude: ['id', 'studentId']
  },
  include: [{
    model: Address,
    attributes: {
      exclude: ['studentExtraDatumId', 'id']
    }
  }]
})

StudentExtraData.addScope('defaultScope', {
  include: [{
    model: Address
  }]
})

StudentExtraData.hasOne(Address, {
  onDelete: "CASCADE"
});
Address.belongsTo(StudentExtraData);

sequelize.sync()
  .then(() => console.log('Database has synced correctly.'))
  .catch(error => console.log('This error occured', error));

module.exports = { Domain, Specialization, Topic, User, Student, StudentExtraData, Address, Teacher, Offer, Application, Paper, Document,
   ActivationToken, SessionSettings, sequelize };