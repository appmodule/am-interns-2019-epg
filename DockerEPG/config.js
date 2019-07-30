var dotenv = require('dotenv');
dotenv.config();
module.exports = {
  xmlFileRead: process.env.XML_TO_READ,
  jsonFileWrite: process.env.JSON_TO_WRITE,
  db_host: process.env.DB_HOST,
  db_user: process.env.DB_USER,
  db_password: process.env.DB_PASSWORD,
  db_name: process.env.DB_DATABASE,
  image_folder: process.env.IMAGE_FOLDER
};