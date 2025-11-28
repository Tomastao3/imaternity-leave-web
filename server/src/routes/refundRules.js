import { Router } from 'express';
import refundRuleService from '../services/refundRuleService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { city } = req.query || {};
    const rules = await refundRuleService.listRefundRules({ city });
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const created = await refundRuleService.createRefundRule(req.body || {});
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await refundRuleService.updateRefundRule(id, req.body || {});
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await refundRuleService.deleteRefundRule(id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const { rules } = req.body || {};
    const result = await refundRuleService.importRefundRules(rules);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
