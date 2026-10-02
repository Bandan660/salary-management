import { Router } from 'express';
import { uuidParam } from '../../lib/validation';
import { getEmployee } from '../employees/employee.service';
import { AddSalaryBody } from './salary.schemas';
import { addSalaryRecord } from './salary.service';

/** Mounted at /api/employees/:id/salaries */
export const salariesRouter = Router({ mergeParams: true });

salariesRouter.get('/', async (req, res) => {
  const { id } = uuidParam.parse(req.params);
  res.json((await getEmployee(id)).salaryHistory);
});

// Returns the updated employee so the UI can refresh current salary and history in one round trip.
salariesRouter.post('/', async (req, res) => {
  const { id } = uuidParam.parse(req.params);
  res.status(201).json(await addSalaryRecord(id, AddSalaryBody.parse(req.body)));
});
