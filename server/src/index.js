import app from './app.js';
import { sequelize } from './db/pool.js';
import Holiday from './models/Holiday.js';
import MaternityRule from './models/MaternityRule.js';
import AllowanceRule from './models/AllowanceRule.js';
import RefundRule from './models/RefundRule.js';
import Employee from './models/Employee.js';

async function startServer() {
  try {
    await sequelize.authenticate();
    await Holiday.sync({ alter: true });
    await MaternityRule.sync({ alter: true });
    await AllowanceRule.sync({ alter: true });
    await RefundRule.sync({ alter: true });
    await Employee.sync({ alter: true });

    const port = Number(process.env.PORT || 3001);
    app.listen(port, () => {
      console.log(`[server] Listening on port ${port}`);
    });
  } catch (error) {
    console.error('[server] Failed to start:', error);
    process.exit(1);
  }
}

startServer();
