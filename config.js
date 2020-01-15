var dotenv = require('dotenv')
dotenv.config()
module.exports = {
  xmlFileRead: process.env.XML_TO_READ,
  jsonFileWrite: process.env.JSON_TO_WRITE,
  dbHost: process.env.DB_HOST,
  dbUser: process.env.DB_USER,
  dbPassword: process.env.DB_PASSWORD,
  dbName: process.env.DB_DATABASE,
  imageFolder: process.env.IMAGE_FOLDER,
  imgPrefix: process.env.IMG_PREFIX
}
