import { Router } from 'express';
import maternityRuleService from '../services/maternityRuleService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { city } = req.query || {};
    const rules = await maternityRuleService.listRules({ city });
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const rule = await maternityRuleService.createRule(req.body);
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await maternityRuleService.updateRule(id, req.body);
    res.json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await maternityRuleService.deleteRule(id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const { rules } = req.body || {};
    const result = await maternityRuleService.importRules(rules);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
