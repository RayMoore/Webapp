const http = require('http');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const socketIo = require('socket.io');

// routers
const indexRouter = require('./routes/index');
const messageRouter = require('./routes/message');

// utils
const response = require('../mockgram-utils/utils/response');
const config = require('../config');
const { normalizePort } = require('../mockgram-utils/utils/tools');

// models
const User = require('../mockgram-utils/models/user');

/**
 * config app
 */
const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));

// set up mongoose connection
let mongoUrl = `mongodb://${config.mongoUrl.host}:${config.mongoUrl.port}/${config.mongoUrl.db}`;
mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useCreateIndex: true
}).then(() => {
  console.log('connected correctly to mongodb');
}).catch(err => console.log(err));

app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));

// adding a generic JSON and URL-encoded parser as a top-level middleware, 
// which will parse the bodies of all incoming requests.
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
  extended: false
}));
// parse application/json
app.use(bodyParser.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

// set up routers
app.use('/', indexRouter);
app.use('/message', messageRouter);

// catch 404 and handle response
app.use(function (req, res, next) {
  return res.status(404).json({
    status: response.ERROR.NOT_FOUND.CODE,
    msg: response.ERROR.NOT_FOUND.MSG
  });
});

// catch 500 and handle response
app.use(function (err, req, res, next) {
  return res.status(500).json({
    status: response.ERROR.SERVER_ERROR.CODE,
    msg: response.ERROR.SERVER_ERROR.MSG,
  });
});

/**
 * Get port from environment and store in Express.
 */

let port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

const server = http.createServer(app);
const io = socketIo(server);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);

app.locals.sockets = [];

io.on('connection', socket => {
  socket.on('establish-connection', clientInfo => {
    let token = clientInfo.token;
    let userId = clientInfo.user._id;
    User.findOne({ _id: userId }).exec((err, user) => {
      if (err) return socket.emit('establish-connection-failed', response.ERROR.SOCKET_CONNECTION_FAILED.MSG);
      if (user.loginStatus) {
        let loginToken = user.loginStatus.token;
        let loginSocketId = user.loginStatus.socketId;
        if (loginToken !== token) {
          return socket.emit('establish-connection-failed', response.ERROR.SOCKET_CONNECTION_FAILED.MSG);
        }
        if (loginSocketId && app.locals.sockets[loginSocketId]) {
          app.locals.sockets[loginSocketId].disconnect();
        }
        let newSocketId = socket.id;
        User.updateOne({ _id: userId }, { $set: { 'loginStatus.socketId': newSocketId } }).exec((err, user) => {
          if (err) return socket.emit('establish-connection-failed', response.ERROR.SOCKET_CONNECTION_FAILED.MSG);
          app.locals.sockets[newSocketId] = socket;
          console.log(Object.keys(app.locals.sockets));
          return socket.emit('establish-connection-success', newSocketId);
        })
      }
    })
  });
  socket.on('disconnect', () => {
    let socketId = socket.id;
    if (app.locals.sockets[socketId]) {
      app.locals.sockets[socketId].disconnect();
    }
    delete app.locals.sockets[socketId];
    User.updateOne({ 'loginStatus.socketId': socketId }, { $set: { 'loginStatus.socketId': '' } }).then(() => {
      console.log(Object.keys(app.locals.sockets));
    }).catch(err => {
      console.log(err);
    })
  });

  socket.on('received-message', data => {
    const { userId, messageId } = data;
    User.updateOne({ _id: userId }, { $addToSet: { receivedMessage: messageId } }).then(() => {
      console.log(`user '${userId}' received message: '${messageId}'`);
    })
  })

  socket.on('recalled-message', data => {
    const { userId, messageId } = data;
    User.updateOne({ _id: userId }, { $pull: { receivedMessage: messageId } }).then(() => {
      console.log(`recall message: '${messageId}' from user '${userId}'`);
    })
  })
})



