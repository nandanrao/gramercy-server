var instaId = require('./instaConfig').instaId
    , Bacon = require('baconjs')
    , _ = require('lodash')
    , router = require('./router')
    , needle = require('needle')
    , Promise = require('bluebird')
    , ig = require('./instaConfig').ig

module.exports = function(session){

  var registerValidationRouter = function(session){
    router.get(session.route, function(req, res, next){
      res.send(req.query['hub.challenge'])
    })
    return Promise.resolve(session)
  }

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

  var registerDisconnect = function(session){
    session.socket.on('disconnect', function(){
      ig.del_subscription({id: session.result.id}, function(err, subscriptions){
        if (err) throw (err)
      })
    })
    return session
  }

  var makeStream = function(session){

      var bus = new Bacon.Bus()

      bus.onError(function(err){
        console.log('ERROR', err)  
      }) 

      router.post(session.route, function(req, res, next){
        bus.push('hit')
        res.status(200).send('OK');
      }) 

      var getUrl = function(){
        return 'https://api.instagram.com/v1/geographies/' + 
        session.location + 
        '/media/recent?client_id=' + 
        instaId;
      }

      var getImages = function(){
        return Bacon.fromNodeCallback(needle.get, getUrl())
        .map(function(res){
          return res.body.data
        }) 
      }

      bus
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

    }

    // RUN!!!!
    registerValidationRouter(session)
      .then(addLocation)
      .then(registerDisconnect)
      .then(makeStream)
}