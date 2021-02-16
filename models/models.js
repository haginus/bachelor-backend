const Sequelize = require('sequelize');
const bcrypt = require('bcrypt');
const { config } = require('../config/config');

// create a sequelize instance with our local postgres database information.
var sequelize = new Sequelize(config.DATABASE_STRING);

// setup User model and its fields.
var User = sequelize.define('user', {
  firstName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  lastName: {
    type: Sequelize.STRING,
    allowNull: false
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
    allowNull: false
  },
  validated: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  }
}, {
  hooks: {
    beforeCreate: (user) => {
      const salt = bcrypt.genSaltSync();
      user.password = bcrypt.hashSync(user.password, salt);
    }
  },
  instanceMethods: {
    validPassword: function (password) {
      return bcrypt.compareSync(password, this.password);
    }
  }
});

var Topic = sequelize.define('topic', {
    name: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false
    }
  });


User.belongsToMany(Topic, {through: "UserTopics", timestamps: false});
Topic.belongsToMany(User, {through: "UserTopics", timestamps: false});

// create all the defined tables in the specified database.
sequelize.sync({ alter: true })
  .then(() => console.log('users table has been successfully created, if one doesn\'t exist'))
  .catch(error => console.log('This error occured', error));

// export User model for use in other files.
module.exports = {User, Topic};