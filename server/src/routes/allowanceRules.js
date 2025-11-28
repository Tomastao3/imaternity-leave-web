import { Router } from 'express';
import allowanceRuleService from '../services/allowanceRuleService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { city } = req.query || {};
    const rules = await allowanceRuleService.listAllowanceRules({ city });
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const created = await allowanceRuleService.createAllowanceRule(req.body || {});
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await allowanceRuleService.updateAllowanceRule(id, req.body || {});
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await allowanceRuleService.deleteAllowanceRule(id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const { rules } = req.body || {};
    const result = await allowanceRuleService.importAllowanceRules(rules);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
