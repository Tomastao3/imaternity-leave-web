import { Router } from 'express';
import holidayService from '../services/holidayService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const year = Number(req.query.year);
    if (Number.isNaN(year)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_YEAR', message: 'year query parameter is required' } });
    }
    const plan = await holidayService.getPlanByYear(year);
    return res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
});

router.get('/years', async (_req, res, next) => {
  try {
    const years = await holidayService.getAvailableYears();
    res.json({ success: true, data: years });
  } catch (error) {
    next(error);
  }
});

router.post('/plan', async (req, res, next) => {
  try {
    const { year, plan } = req.body || {};
    if (!year || Number.isNaN(Number(year))) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_YEAR', message: 'year is required' } });
    }
    const result = await holidayService.replacePlan(year, plan || {});
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/date', async (req, res, next) => {
  try {
    const { year, date, type, name = '', isLegalHoliday = false } = req.body || {};
    if (!year || Number.isNaN(Number(year)) || !date || !type) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PARAMS', message: 'year, date, type are required' } });
    }
    const updatedPlan = await holidayService.addHolidayDate({ year, date, type, name, isLegalHoliday });
    res.json({ success: true, data: updatedPlan });
  } catch (error) {
    next(error);
  }
});

router.patch('/date', async (req, res, next) => {
  try {
    const {
      sourceYear,
      originalDate,
      targetYear,
      newDate,
      type,
      name = '',
      isLegalHoliday = false
    } = req.body || {};

    if (!sourceYear || !originalDate || !targetYear || !newDate || !type) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PARAMS', message: 'Missing required fields' } });
    }

    const updatedPlan = await holidayService.updateHolidayDate({
      sourceYear,
      originalDate,
      targetYear,
      newDate,
      type,
      name,
      isLegalHoliday
    });

    res.json({ success: true, data: updatedPlan });
  } catch (error) {
    next(error);
  }
});

router.delete('/date', async (req, res, next) => {
  try {
    const { year, date } = req.body || {};
    if (!year || Number.isNaN(Number(year)) || !date) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PARAMS', message: 'year and date are required' } });
    }

    const updatedPlan = await holidayService.removeHolidayDate({ year, date });
    res.json({ success: true, data: updatedPlan });
  } catch (error) {
    next(error);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const { holidays } = req.body || {};
    if (!Array.isArray(holidays)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_BODY', message: 'holidays array is required' } });
    }

    const result = await holidayService.importHolidays(holidays);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
