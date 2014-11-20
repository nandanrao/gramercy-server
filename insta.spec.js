var _ = require('lodash')
var request = require('supertest');
var app = require('./app')

var fakeRes = {
  body: {
    data: [{
      images: {
        standard_resolution: {
          url: undefined
        }
      }
    }]
  }
}

var random = [1,2,3,3,3,4,4,4,4,5,5,5,5,2,2,2]

var responses = _.map(random, function(num){
  var a = _.cloneDeep(fakeRes);
  a.body.data[0].images.standard_resolution.url = num;
  return a
})

var respond = (function(){
  count = 0;
  return {
    once: function(){
      count++
      return responses[count] || count%responses.length
    }
  }
})()

console.log(respond.once().body.data[0].images)

var needleMock = {
  get: function(url, cb){
    process.nextTick(function(){
      cb(null, respond.once())  
    })
  }
}



// ---------------


// var bus = new Bacon.Bus()

// app.post('/insta/cb', function(req, res, next){
//   photoizer.poll();
//   res.status('200');
// })

// bus.skipDuplicates(_.isEqual).onValue(function(val){
//   console.log('hit', val.images.standard_resolution.url)
// })

// var photoizer = (function(){
//   var poll = function(){
//     needle.get('https://api.instagram.com/v1/geographies/' + 
//     location + 
//     '/media/recent?client_id=' + 
//     instaId
//     , function(err, res){
//       bus.push(_.first(res.body.data));
//     })
//   }
//   return {
//     poll: poll
//   }
// })()

