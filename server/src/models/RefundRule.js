import { DataTypes } from 'sequelize';
import { sequelize } from '../db/pool.js';

const RefundRule = sequelize.define('RefundRule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  city: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  startMonth: {
    type: DataTypes.STRING(7),
    allowNull: false,
    field: 'start_month'
  },
  endMonth: {
    type: DataTypes.STRING(7),
    allowNull: false,
    field: 'end_month'
  },
  refundDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'refund_description'
  },
  refundAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    field: 'refund_amount'
  },
  directDisplay: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'direct_display'
  },
  singleMonthOnly: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'single_month_only'
  }
}, {
  tableName: 't_refund_rules',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      unique: false,
      fields: ['city', 'start_month', 'end_month']
    }
  ]
});

export default RefundRule;
