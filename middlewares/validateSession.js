import { ObjectId } from 'mongodb';

import db from './../db.js';

export async function validateSession (req,res,next) {

  try {

    const { authorization } = req.headers;
    
    const token = authorization?.replace('Bearer', '').trim();
      
    if (!token) return res.status(401).send('Invalid token');
  
    const session = await db.collection('sessions').findOne({ token });  
  
    if (!session) return res.status(404).send('Invalid session');  
    
    const registeredUser = await db.collection('users').findOne({_id: new ObjectId (session.userId)});
  
    if (!registeredUser) return res.status(404).send('User not found');

    delete registeredUser.password;

    res.locals.registeredUser = registeredUser;

    next();
    
  } catch (e) {

    console.log(e);

    return res.sendStatus(500);

  } 
  
}