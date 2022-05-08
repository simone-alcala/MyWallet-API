import bcrypt         from 'bcrypt';
import joi            from 'joi';
import {stripHtml}    from 'string-strip-html';
import { v4 as uuid } from 'uuid';

import db from './../db.js';

const sanitize = (text) => {
  if (text !== undefined && text !== null) {
    text.trim();
    return stripHtml(text).result;
  }
  return text;
}

const options = {
  abortEarly:   false, 
  allowUnknown: true, 
  stripUnknown: true,
  convert     : false
}

export async function signUp (req, res){
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

}

export async function signIn (req, res){
  try {

    const user = req.body;
    
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

    if (!registeredUser || !bcrypt.compareSync(password, registeredUser.password))
      return res.status(401).send('Invalid User and/or Password');
    
    const token = uuid();
        
		await db.collection('sessions').insertOne({ userId: registeredUser._id,	token	});
   
    return res.status(200).send({ token, name: registeredUser.name});

  } catch (e) {
    console.log(e);
    return res.sendStatus(500);
  }
}