import { DataTypes } from 'sequelize';
import { sequelize } from '../db/pool.js';

const MaternityRule = sequelize.define('MaternityRule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  city: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  leaveType: {
    type: DataTypes.STRING(64),
    allowNull: false,
    field: 'leave_type'
  },
  miscarriageType: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'miscarriage_type'
  },
  leaveDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'leave_days'
  },
  isExtendable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_extendable'
  },
  hasAllowance: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'has_allowance'
  }
}, {
  tableName: 't_maternity_rules',
  timestamps: false,
  underscored: true
});

export default MaternityRule;
