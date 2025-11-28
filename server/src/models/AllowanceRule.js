import { DataTypes } from 'sequelize';
import { sequelize } from '../db/pool.js';

const AllowanceRule = sequelize.define('AllowanceRule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  city: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  socialAverageWage: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: 'social_average_wage'
  },
  companyAverageWage: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: 'company_average_wage'
  },
  companyContributionWage: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: 'company_contribution_wage'
  },
  calculationBase: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'calculation_base'
  },
  payoutMethod: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'payout_method'
  },
  maternityPolicy: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'maternity_policy'
  },
  allowancePolicy: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'allowance_policy'
  }
}, {
  tableName: 't_allowance_rules',
  timestamps: false,
  underscored: true
});

export default AllowanceRule;
