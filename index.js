var createError = require('http-errors')
var express = require('express')
var path = require('path')
var logger = require('morgan')

var bodyParser = require('body-parser')
var events = require('./routes/events').router

var app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
// app.use(express.static(path.join(__dirname, 'public')))
app.use(express.static(__dirname))

app.set('view engine', 'jade')

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
// app.use(express.static(path.join(__dirname, 'public')))
app.use(express.static(__dirname))

app.use('/bds', events)
// const rp = require('request-promise-native')
// var server = '127.0.0.1:3005'
// var parseEvents = {
//   url: `http://${server}/bds/tv/parse`
// }

// rp.post(parseEvents)
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

app.listen(3005, () => {
  console.log('Node app is running on port 3005')
})

module.exports = app
