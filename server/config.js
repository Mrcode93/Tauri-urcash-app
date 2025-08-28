require('dotenv').config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_here',
  dbPath: process.env.DB_PATH || './database.sqlite3',
  port: process.env.PORT || 39000,
}; 