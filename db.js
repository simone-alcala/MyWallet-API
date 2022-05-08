import { MongoClient} from 'mongodb';
import   dotenv       from 'dotenv';
import   chalk        from 'chalk';

dotenv.config();

let db = null;
try{
  const mongoClient = new MongoClient(process.env.MONGO_URL);
  await mongoClient.connect();
  db = mongoClient.db(process.env.DATABASE);
  console.log(chalk.bold.green('Connected to database.'));
} catch (err) {
  console.log(chalk.bold.red('Unable to connect to database: ') + err)
}
export default db;