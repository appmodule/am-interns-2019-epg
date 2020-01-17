var mysql = require('mysql')

class Database {
  constructor (config) {
    this.config = config
  }

  query (sql) {
    return new Promise((resolve, reject) => {
      let connection = mysql.createConnection(this.config)
      connection.query(sql, (err, rows) => {
        if (err) return reject(err)
        connection.end()
        resolve(rows)
      })
    })
  }

  // close () {
  //   return new Promise((resolve, reject) => {
  //     this.connection.end(err => {
  //       if (err) return reject(err)
  //       resolve()
  //     })
  //   })
  // }
}

module.exports = Database
