import {Router } from 'express';
import { validateSession } from '../middlewares/validateSession.js';

import {newStatement,getStatements,getStatementById,updateStatement,deleteStatement,getBalance} from './../controllers/statementsController.js'

const statementsRouter = Router();

statementsRouter.post('/statement', validateSession, newStatement);
statementsRouter.get('/statement', validateSession, getStatements);
statementsRouter.get('/statement/:id', validateSession, getStatementById);
statementsRouter.put('/statement/:id', validateSession, updateStatement);
statementsRouter.delete('/statement/:id', validateSession, deleteStatement);
statementsRouter.get('/balance', validateSession, getBalance);

export default statementsRouter;