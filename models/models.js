const Sequelize = require('sequelize');
const bcrypt = require('bcrypt');
const { config } = require('../config/config');

const sequelize = new Sequelize(config.DATABASE_STRING);

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


sequelize.sync()
  .then(() => console.log('Database has synced correctly.'))
  .catch(error => console.log('This error occured', error));

module.exports = { Domain, Topic, User, Student, Teacher, Offer, Application, ActivationToken, sequelize };