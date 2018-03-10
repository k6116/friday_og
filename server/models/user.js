
const Sequelize = require('sequelize');
const sequelize = require('../db/sequelize').sequelize;


const User = sequelize.define('user',
  {
    id: { type: Sequelize.INTEGER, field: 'EmployeeID', primaryKey: true, autoIncrement: true },
    fullName: { type: Sequelize.STRING, field: 'FullName' },
    userName: { type: Sequelize.STRING, field: 'UserName' },
    email: { type: Sequelize.STRING, field: 'EmailAddress' },
    roleID: { type: Sequelize.INTEGER, field: 'RoleID' },
    loginEnabled: { type: Sequelize.BOOLEAN, field: 'LoginEnabled' },
    forcePasswordReset: { type: Sequelize.BOOLEAN, field: 'ForcePasswordReset' },
    createdBy: { type: Sequelize.INTEGER, field: 'CreatedBy' },
    createdAt: { type: Sequelize.DATEONLY, field: 'CreationDate' },
    updatedBy: { type: Sequelize.INTEGER, field: 'LastUpdatedBy' },
    updatedAt: { type: Sequelize.DATEONLY, field: 'LastUpdateDate' }
  },
  {
    schema: 'accesscontrol',
    tableName: 'Employees',
    timestamps: false
  }
);


module.exports = User
