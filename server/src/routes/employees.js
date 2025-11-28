import { Router } from 'express';
import employeeService from '../services/employeeService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { city } = req.query || {};
    const employees = await employeeService.listEmployees({ city });
    res.json({ success: true, data: employees });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const created = await employeeService.createEmployee(req.body || {});
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await employeeService.updateEmployee(id, req.body || {});
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await employeeService.deleteEmployee(id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const { employees } = req.body || {};
    const result = await employeeService.importEmployees(employees);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
