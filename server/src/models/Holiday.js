import { DataTypes } from 'sequelize';
import { sequelize } from '../db/pool.js';

const Holiday = sequelize.define('Holiday', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  holidayName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'holiday_name'
  },
  holidayDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'holiday_date'
  },
  holidayType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'holiday',
    field: 'holiday_type'
  },
  isLegalHoliday: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_legal_holiday'
  }
}, {
  tableName: 't_holidays',
  timestamps: false,
  underscored: true
});

export default Holiday;
