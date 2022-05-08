import joi            from 'joi';
import {stripHtml}    from 'string-strip-html';
import { ObjectId }   from 'mongodb';
import dayjs          from 'dayjs';

import db from './../db.js';

const options = {
  abortEarly:   false, 
  allowUnknown: true, 
  stripUnknown: true,
  convert     : false
}

const sanitize = (text) => {
  if (text !== undefined && text !== null) {
    text.trim();
    return stripHtml(text).result;
  }
  return text;
}

export async function newStatement (req, res){
  try {

    const { authorization } = req.header;
    const token = authorization?.replace('Bearer', '').trim();
    
    if (!token) return res.status(401).send('Invalid token');
    
    const statement = req.body;

    const description = sanitize(statement.description);
    const value       = statement.value;
    const type        = sanitize(statement.type);
    
    const schemaStatement = joi.object({
      description: joi.string().trim().required(),
      value: joi.number().positive().precision(2).required(),
      type: joi.string().valid('I','O').required(),
    });
      
    const validationStatement = schemaStatement.validate({description,value,type},options);

    if (validationStatement.error) 
      return res.status(422).send(validationStatement.error.details.map(detail => detail.message)); 
    
    const session = await db.collection('sessions').findOne({ token });  

    if (!session)
      return res.status(404).send('Invalid session');  
    
    const registeredUser = await db.collection('users').findOne({_id: new ObjectId (session.userId)});

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
}

export async function getStatements (req, res){
  
  try {
    
    const { authorization } = req.header;
    const token = authorization?.replace('Bearer', '').trim();
    
    if (!token) return res.status(401).send('Invalid token');

    const session = await db.collection('sessions').findOne({ token });  

    if (!session)
      return res.status(404).send('Invalid session');  
   
    const registeredUser = await db.collection('users').findOne({_id: new ObjectId (session.userId)});

    if (!registeredUser)
      return res.status(404).send('User not found');
       
    const statements = await db.collection('statements').find({user: registeredUser.email}).toArray();

    statements.reverse();

    return res.status(200).send(statements);

  } catch (e) {
    console.log(e);
    return res.sendStatus(500);
  }

}

export async function getStatementById (req, res){
  try {
    
    const { authorization } = req.header;
    const token = authorization?.replace('Bearer', '').trim();
    
    if (!token) return res.status(401).send('Invalid token');

    const idParam   = req.params;
    const id        = sanitize(idParam.id);

    const schemaId = joi.object({
      id: joi.string().required().trim()
    });

    const validationId = schemaId.validate({id},options);

    if (validationId.error) 
      return res.status(422).send(validationId.error.details.map(detail => detail.message));
      
    const session = await db.collection('sessions').findOne({ token });  

    if (!session)
      return res.status(404).send('Invalid session');  
    
    const registeredUser = await db.collection('users').findOne({_id: new ObjectId (session.userId)});

    if (!registeredUser)
      return res.status(404).send('User not found');
       
    const statement = await db.collection('statements').findOne({_id: new ObjectId (id)});

    if (!statement)
      return res.status(404).send(`Statement ${id} not found`);

    if (statement.user !== registeredUser.email)
      return res.status(409).send('Unauthorized');

    return res.status(200).send(statement);

  } catch (e) {
    console.log(e);
    return res.sendStatus(500);
  }
}

export async function updateStatement (req, res){

  try {
    const { authorization } = req.header;
    const token = authorization?.replace('Bearer', '').trim();
    
    if (!token) return res.status(401).send('Invalid token');

    const idParam   = req.params;
    const statement = req.body;
      
    const id          = sanitize(idParam.id);
    const description = sanitize(statement.description);
    const value       = statement.value;
    const type        = sanitize(statement.type);

    const schemaId = joi.object({
      id: joi.string().required().trim()
    });

    const validationId = schemaId.validate({id},options);

    if (validationId.error) 
      return res.status(422).send(validationId.error.details.map(detail => detail.message));

    const schemaStatement = joi.object({
      description: joi.string().trim().required(),
      value: joi.number().positive().precision(2).required(),
      type: joi.string().valid('I','O').required(),
    });

    const validationStatement = schemaStatement.validate({description,value,type},options);

    if (validationStatement.error) 
      return res.status(422).send(validationStatement.error.details.map(detail => detail.message)); 
    
    const session = await db.collection('sessions').findOne({ token });  

    if (!session)
      return res.status(404).send('Invalid session');  
    
    const registeredUser = await db.collection('users').findOne({_id: new ObjectId (session.userId)});

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

}

export async function deleteStatement (req, res){
 
  try {
    const { authorization } = req.header;
    const token = authorization?.replace('Bearer', '').trim();
    
    if (!token) return res.status(401).send('Invalid token');

    const idParam   = req.params;
    
    const id          = sanitize(idParam.id);

    const schemaId = joi.object({
      id: joi.string().required().trim()
    });

    const validationId = schemaId.validate({id},options);

    if (validationId.error) 
      return res.status(422).send(validationId.error.details.map(detail => detail.message));
 
    const session = await db.collection('sessions').findOne({ token });  

    if (!session)
      return res.status(404).send('Invalid session');  
    
    const registeredUser = await db.collection('users').findOne({_id: new ObjectId (session.userId)});

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

}

export async function getBalance (req, res){

  try {

    const { authorization } = req.header;
    const token = authorization?.replace('Bearer', '').trim();
    
    if (!token) return res.status(401).send('Invalid token');
      
    const session = await db.collection('sessions').findOne({ token });  

    if (!session)
      return res.status(404).send('Invalid session');  
    
    const registeredUser = await db.collection('users').findOne({_id: new ObjectId (session.userId)});

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

}