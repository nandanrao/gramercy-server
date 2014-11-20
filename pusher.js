var instaId = require('./instaConfig').instaId
    , Bacon = require('baconjs')
    , _ = require('lodash')
    , router = require('./router')
    , needle = require('needle')
    , Promise = require('bluebird')
    , ig = require('./instaConfig').ig

module.exports = function(session){
  
  // Instagram makes a get request to this router when you 
  // register a realtime channel
  var createValidationRouter = function(session){
    router.get(session.route, function(req, res, next){
      res.send(req.query['hub.challenge'])
    })
    return Promise.resolve(session)
  }

  // Creates an instagram 'location' object from a Lat/Lng
  var addLocation = function(session){
    return new Promise(function(resolve, reject){
      ig.add_geography_subscription(session.lat, session.lng, 5000, session.url, function(err, result, remaining, limit){
        if (err){
          reject(err)
          return
        }
        session.result = result;
        session.location = result.object_id.toString();
        resolve(session)
      });
    });
  };

  // What to do when a client disconnects
  var registerDisconnect = function(session){
    session.socket.on('disconnect', function(){
      ig.del_subscription({id: session.result.id}, function(err, subscriptions){
        if (err) throw (err)
      })
    })
    return session
  }

  // Creates url to make GET request to instagram for this location
  var createGetUrl = function(){
    return 'https://api.instagram.com/v1/geographies/' + 
    session.location + 
    '/media/recent?client_id=' + 
    instaId;
  }

  // Creates a stream from the instagram GET url
  var getImages = function(){
    return Bacon.fromNodeCallback(needle.get, createGetUrl())
    .map(function(res){
      return res.body.data
    }) 
  }

  // Creates our router to recieve post notifications on new images
  var createPostRouter = function(session){
    session.stream = new Bacon.Bus()
    router.post(session.route, function(req, res, next){
      session.stream.push('hit')
      res.status(200).send('OK');
    })
    return Promise.resolve(session)
  } 

  // Run shit
  createValidationRouter(session)
    .then(addLocation)
    .then(registerDisconnect)
    .then(createPostRouter)
    .then(function(session){
      // Error handler goes here...
      session.stream.onError(function(err){
        console.log('ERROR', err)  
      })
      // Begin FRP magic
      session.stream         
        .bufferingThrottle(2000) 
        .flatMap(getImages)
        .map(function(arr){
          return _.map(arr, function(el){
            return el.images.standard_resolution.url
          })
        })
        .diff(0, function(a,b){
          return _.difference(b,a)
        })
        .flatMap(Bacon.fromArray)
        .bufferingThrottle(2000)
        .onValue(function(val){
          session.socket.emit('pic', val)
        }) 
    })
}