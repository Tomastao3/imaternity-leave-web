import express from 'express';
import cors from 'cors';
import holidaysRouter from './routes/holidays.js';
import maternityRulesRouter from './routes/maternityRules.js';
import allowanceRulesRouter from './routes/allowanceRules.js';
import refundRulesRouter from './routes/refundRules.js';
import employeesRouter from './routes/employees.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.use('/api/holidays', holidaysRouter);
app.use('/api/maternity-rules', maternityRulesRouter);
app.use('/api/allowance-rules', allowanceRulesRouter);
app.use('/api/refund-rules', refundRulesRouter);
app.use('/api/employees', employeesRouter);

app.use((err, _req, res, _next) => {
  console.error('[api] Unhandled error:', err);
  const status = err.status && Number.isInteger(err.status) ? err.status : 500;
  const code = err.code || (status === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR');
  res.status(status).json({ success: false, error: { code, message: err.message || 'Server error' } });
});

export default app;
