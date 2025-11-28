import { DataTypes } from 'sequelize';
import { sequelize } from '../db/pool.js';

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employeeNo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'employee_no'
  },
  employeeName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'employee_name'
  },
  city: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  personalSSMonthly: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'personal_ss_monthly'
  },
  employeeBasicSalary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'employee_basic_salary'
  },
  employeeBaseSalaryCurrent: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    field: 'employee_base_salary_current'
  },
  isDifficultBirth: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_difficult_birth'
  },
  numberOfBabies: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'number_of_babies'
  },
  pregnancyPeriod: {
    type: DataTypes.STRING(32),
    allowNull: false,
    field: 'pregnancy_period'
  }
}, {
  tableName: 't_employees',
  timestamps: false,
  underscored: true
});

export default Employee;
