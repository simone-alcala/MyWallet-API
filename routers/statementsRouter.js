import {Router } from 'express';

import {newStatement,getStatements,getStatementById,updateStatement,deleteStatement,getBalance} from './../controllers/statementsController.js'

const statementsRouter = Router();

statementsRouter.post('/statement', newStatement);
statementsRouter.get('/statement',getStatements);
statementsRouter.get('/statement/:id',getStatementById);
statementsRouter.put('/statement/:id',updateStatement);
statementsRouter.delete('/statement/:id',deleteStatement);
statementsRouter.get('/balance',getBalance);

export default statementsRouter;