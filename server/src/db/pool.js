import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import storageConfig from '../../../src/config/storage.config.json' with { type: 'json' };

dotenv.config({ path: process.env.DOTENV_PATH || undefined });

const pgDefaults = storageConfig?.postgres || {};

const resolvedConfig = {
  host: process.env.PGHOST || pgDefaults.host || 'localhost',
  port: Number(process.env.PGPORT || pgDefaults.port || 5432),
  database: process.env.PGDATABASE || pgDefaults.database || 'maternity_db',
  username: process.env.PGUSER || pgDefaults.user || 'postgres',
  password: process.env.PGPASSWORD || pgDefaults.password || 'postgres'
};

const poolOptions = {
  max: Number(process.env.PGPOOL_MAX || pgDefaults.pool?.max || 10),
  min: Number(process.env.PGPOOL_MIN || pgDefaults.pool?.min || 1),
  idle: Number(process.env.PGPOOL_IDLE || pgDefaults.pool?.idle || 10000),
  acquire: Number(process.env.PGPOOL_ACQUIRE || pgDefaults.pool?.acquire || 30000),
  evict: Number(process.env.PGPOOL_EVICT || pgDefaults.pool?.evict || 1000)
};

const dialectOptions = (() => {
  if (process.env.PGSSLMODE === 'require') {
    return { ssl: { require: true, rejectUnauthorized: false } };
  }
  if (pgDefaults?.ssl?.enabled) {
    return {
      ssl: {
        require: true,
        rejectUnauthorized: pgDefaults.ssl.rejectUnauthorized ?? false
      }
    };
  }
  return {};
})();

const logging = process.env.SEQUELIZE_LOGGING === 'true' ? console.log : false;

let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions,
    pool: poolOptions,
    logging
  });
} else {
  sequelize = new Sequelize(resolvedConfig.database, resolvedConfig.username, resolvedConfig.password, {
    host: resolvedConfig.host,
    port: resolvedConfig.port,
    dialect: 'postgres',
    dialectOptions,
    pool: poolOptions,
    logging
  });
}

export { sequelize };

export async function withTransaction(handler) {
  const transaction = await sequelize.transaction();
  try {
    const result = await handler(sequelize, transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
