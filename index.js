import express,{json} from 'express';
import chalk          from 'chalk';
import cors           from 'cors';
import dotenv         from 'dotenv';

dotenv.config();

import authRouter from './routers/authRouter.js';
import statementsRouter from './routers/statementsRouter.js';
                                        
const app = express();
app.use(cors());
app.use(json());

app.use(authRouter);
app.use(statementsRouter);


app.listen(process.env.PORT, () => 
  console.log(chalk.bold.green('Server running on port 5000'))
);