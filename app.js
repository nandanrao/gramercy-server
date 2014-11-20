var express = require('express')
  , app = express()
  , cors = require('cors')
  , ig = require('./instaConfig').ig
  , bodyParser = require('body-parser')
  , createPusher = require('./pusher')
  , router = require('./router')

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: true,
  credentials: true 
}));

// instagram callback router
app.use('/insta/cb', router)

// Start Server
var server = app.listen(4000)
var io = require('socket.io')(server)

// Export app
module.exports = app

// ------------------------------------------

// Delete previous subscriptions on bootup
ig.del_subscription({all:true}, function(err, subscriptions){})

// tunnel url (this should be an ENV variable...)
var grok = 'http://625ff036.ngrok.com';

// startup session for each user on socket connect!
io.on('connection', function(socket){
  socket.on('location', function(position){
    var session = {
      url: grok + '/insta/cb/' + socket.id,
      route: '/' + socket.id,
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      socket: socket
    }
    createPusher(session)
  })
})
