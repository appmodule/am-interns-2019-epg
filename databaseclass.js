var mysql = require('mysql')

class Database {
  constructor (config) {
    this.connection = mysql.createConnection(config)
  }

  query(sql) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, (err, rows) => {
        if (err) {
          console.log('Query error: ', err)
          return reject(err)
        }
        resolve(rows)
      })
    })
  }

  close() {
    return new Promise((resolve, reject) => {
      this.connection.end(err => {
        if (err) return reject(err)
        console.log('Connection closed')
        resolve()
      })
    })
  }
}

module.exports = Database