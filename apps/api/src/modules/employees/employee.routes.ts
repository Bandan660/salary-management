import { Router } from 'express';
import { uuidParam } from '../../lib/validation';
import { CreateEmployeeBody, ListEmployeesQuery, UpdateEmployeeBody } from './employee.schemas';
import { createEmployee, getEmployee, listEmployees, setEmployeeStatus, updateEmployee } from './employee.service';

/** Thin HTTP layer: validate input, call the service, send JSON. Express 5 forwards async errors. */
export const employeesRouter = Router();

employeesRouter.get('/', async (req, res) => {
  res.json(await listEmployees(ListEmployeesQuery.parse(req.query)));
});

employeesRouter.post('/', async (req, res) => {
  res.status(201).json(await createEmployee(CreateEmployeeBody.parse(req.body)));
});

employeesRouter.get('/:id', async (req, res) => {
  const { id } = uuidParam.parse(req.params);
  res.json(await getEmployee(id));
});

employeesRouter.patch('/:id', async (req, res) => {
  const { id } = uuidParam.parse(req.params);
  res.json(await updateEmployee(id, UpdateEmployeeBody.parse(req.body)));
});

// Soft delete: deactivated employees keep their salary history.
employeesRouter.post('/:id/deactivate', async (req, res) => {
  const { id } = uuidParam.parse(req.params);
  res.json(await setEmployeeStatus(id, 'INACTIVE'));
});

employeesRouter.post('/:id/reactivate', async (req, res) => {
  const { id } = uuidParam.parse(req.params);
  res.json(await setEmployeeStatus(id, 'ACTIVE'));
});
