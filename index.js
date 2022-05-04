import express,{json} from 'express';
import chalk          from 'chalk';
import cors           from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv         from 'dotenv';
import joi            from 'joi';
import dayjs          from 'dayjs';
import {stripHtml}    from 'string-strip-html';
import bcrypt         from 'bcrypt';

dotenv.config();

let db = '';
const mongoClient = new MongoClient(process.env.MONGO_URI);
const promise = mongoClient.connect();
promise.then ( () => {
  db = mongoClient.db('MyWallet');
  console.log(chalk.bold.green('Connected to database MyWallet'));
});
promise.catch( (err) => {
  console.log(chalk.bold.red('Unable to connect to database: ') + err)
});

const app = express();
app.use(cors());
app.use(json());

const options = {
  abortEarly:   false, 
  allowUnknown: true, 
  stripUnknown: true,
  convert     : false
}

const sanitize = (text) => {
  if (text !== undefined) {
    text.trim();
    return stripHtml(text).result;
  }
  return text;
}

app.post('/sign-up',async(req,res) => { 
 
  try {

    const user = req.body;
    
    const name      = sanitize(user.name);
    const email     = sanitize(user.email);
    const password  = sanitize(user.password);
    const repeat_password  = sanitize(user.repeat_password);

    const schema = joi.object({
      name:     joi.string().trim().required(),
      email:    joi.string().trim().email().required(),
      password: joi.string().required(),
      repeat_password: joi.ref('password')
    }) .with('password', 'repeat_password');;
    
    const validation = schema.validate({name,email,password,repeat_password},options);
    
    if (validation.error) 
      return res.status(422).send(validation.error.details.map(detail => detail.message));
    
    const alreadyRegistered = await db.collection('users').findOne({email});  

    if (alreadyRegistered)
      return res.status(409).send(`Email '${email}' already registered`);
    
    const encryptedPassword = bcrypt.hashSync(password, 10);

    await db.collection('users').insertOne({
      name, email, password: encryptedPassword
    });

    return res.sendStatus(201);

  } catch (e) {
    console.log(e);
    return res.sendStatus(500);
  }

});

app.post('/sign-in',async(req,res) => {

  try {

    const user = req.headers;
    
    const email     = sanitize(user.email);
    const password  = sanitize(user.password);

    const schema = joi.object({
      email:    joi.string().email().required().trim(),
      password: joi.string().required().trim()
    });
    
    const validation = schema.validate({email,password},options);
    
    if (validation.error) 
      return res.status(422).send(validation.error.details.map(detail => detail.message));   
    
    const registeredUser = await db.collection('users').findOne({email});  

    const validatePassword = bcrypt.compareSync(password, registeredUser.password);

    if (!registeredUser || !validatePassword)
      return res.status(401).send('Invalid User and/or Password');
    
    return res.status(200).send({token: registeredUser.password});

  } catch (e) {
    console.log(e);
    return res.sendStatus(500);
  }

});

app.post('/statement',async(req,res) => {

  try {

    const statement = req.body;
    const user      = req.headers;
    
    const description = sanitize(statement.description);
    const value       = statement.value;
    const type        = sanitize(statement.type);
    const token       = sanitize(user.token);

    const schemaUser = joi.object({
      token: joi.string().required().trim()
    });

    const schemaStatement = joi.object({
      description: joi.string().trim().required(),
      value: joi.number().positive().precision(2).required(),
      type: joi.string().valid('I','O').required(),
    });
      
    const validationUser = schemaUser.validate({token},options);
    
    if (validationUser.error) 
      return res.status(422).send(validationUser.error.details.map(detail => detail.message));

    const validationStatement = schemaStatement.validate({description,value,type},options);

    if (validationStatement.error) 
      return res.status(422).send(validationStatement.error.details.map(detail => detail.message)); 
    
    const registeredUser = await db.collection('users').findOne({password: token});  

    if (!registeredUser)
      return res.status(404).send('User not found');
    
    await db.collection('statements').insertOne({
      description, 
      value, 
      type, 
      createDate: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      updateDate: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      user: registeredUser.email
    });

    return res.sendStatus(201);

  } catch (e) {
    console.log(e);
    return res.sendStatus(500);
  }
});

app.get('/statement',async(req,res) => {
  
  try {
    
    const token = req.headers.token;
    
    const schema = joi.object({
      token: joi.string().required().trim()
    });
    
    const validation = schema.validate({token},options);
    
    if (validation.error) 
      return res.status(422).send(validation.error.details.map(detail => detail.message));
   
    const registeredUser = await db.collection('users').findOne({password: token});  

    if (!registeredUser)
      return res.status(404).send('User not found');
       
    const statements = await db.collection('statements').find({user: registeredUser.email}).toArray();

    statements.reverse();

    // const teste2 = dayjs(teste).format('DD/MM/YYYY')

    return res.status(200).send(statements);

  } catch (e) {
    console.log(e);
    return res.sendStatus(500);
  }

});

app.put('/statement/:id',async(req,res) => {

  try {

    const idParam   = req.params;
    const statement = req.body;
    const user      = req.headers;
      
    const id          = sanitize(idParam.id);
    const description = sanitize(statement.description);
    const value       = statement.value;
    const type        = sanitize(statement.type);
    const token       = sanitize(user.token);

    const schemaId = joi.object({
      id: joi.string().required().trim()
    });

    const validationId = schemaId.validate({id},options);

    if (validationId.error) 
      return res.status(422).send(validationId.error.details.map(detail => detail.message));

    const schemaUser = joi.object({
      token: joi.string().required().trim()
    });

    const schemaStatement = joi.object({
      description: joi.string().trim().required(),
      value: joi.number().positive().precision(2).required(),
      type: joi.string().valid('I','O').required(),
    });
      
    const validationUser = schemaUser.validate({token},options);
    
    if (validationUser.error) 
      return res.status(422).send(validationUser.error.details.map(detail => detail.message));

    const validationStatement = schemaStatement.validate({description,value,type},options);

    if (validationStatement.error) 
      return res.status(422).send(validationStatement.error.details.map(detail => detail.message)); 
    
    const registeredUser = await db.collection('users').findOne({password: token});  

    if (!registeredUser)
      return res.status(404).send('User not found');

    const registeredStatement = await db.collection('statements').findOne({_id: new ObjectId (id)});  

    if (!registeredStatement)
      return res.status(404).send(`Statement ${id} not found`);

    if (registeredStatement.user !== registeredUser.email)
      return res.status(409).send('Unauthorized');

    if (registeredStatement.type !== type)
      return res.status(401).send('Conflict on statement type');
    
    await db.collection('statements').updateOne( 
      {_id: new ObjectId(id)} , { 
        $set: { 
          description, 
          value, 
          updateDate: dayjs().format('YYYY-MM-DD HH:mm:ss') }}); 

    return res.sendStatus(200);

  } catch (e) {
    console.log(e);
    return res.sendStatus(500);
  }

});

app.delete('/statement/:id',async(req,res) => {
  
  try {

    const idParam   = req.params;
    const user      = req.headers;
      
    const id          = sanitize(idParam.id);
    const token       = sanitize(user.token);

    const schemaId = joi.object({
      id: joi.string().required().trim()
    });

    const validationId = schemaId.validate({id},options);

    if (validationId.error) 
      return res.status(422).send(validationId.error.details.map(detail => detail.message));

    const schemaUser = joi.object({
      token: joi.string().required().trim()
    });
     
    const validationUser = schemaUser.validate({token},options);
    
    if (validationUser.error) 
      return res.status(422).send(validationUser.error.details.map(detail => detail.message));
    
    const registeredUser = await db.collection('users').findOne({password: token});  

    if (!registeredUser)
      return res.status(404).send('User not found');

    const registeredStatement = await db.collection('statements').findOne({_id: new ObjectId (id)});  

    if (!registeredStatement)
      return res.status(404).send(`Statement ${id} not found`);

    if (registeredStatement.user !== registeredUser.email)
      return res.status(409).send('Unauthorized');
   
    const deletedStatement = await db.collection('statements').deleteOne( {_id: new ObjectId(id)} );    

    if ( deletedStatement.deletedCount === 1){
      return res.sendStatus(200);
    } else {
      return res.status(422).send(`Unable to delete statement ${id}`);
    }

  } catch (e) {
    console.log(e);
    return res.sendStatus(500);
  }

});

app.get('/balance',async(req,res) => {
  
  try {

    const token = req.headers.token;
    
    const schema = joi.object({
      token: joi.string().required().trim()
    });
    
    const validation = schema.validate({token},options);
    
    if (validation.error) 
      return res.status(422).send(validation.error.details.map(detail => detail.message));
   
    const registeredUser = await db.collection('users').findOne({password: token});  

    if (!registeredUser)
      return res.status(404).send('User not found');
    
    const statements = await db.collection('statements').find({user: registeredUser.email}).toArray();

    let balance = 0;

    statements.forEach(statement => {
      statement.type === 'I' ? balance += statement.value : balance -= statement.value;
    });

    balance = parseFloat(balance.toFixed(2));
    
    return res.status(200).send({ balance: balance });

  } catch (e) {
    console.log(e);
    return res.sendStatus(500);
  }

});

app.listen(5000, () => 
  console.log(chalk.bold.green('Server running on port 5000'))
);