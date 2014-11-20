var ig = require('instagram-node').instagram()

var instaId = 'b7d3fb798edc4f478b5c9e3de061190d';
var instaSecret = '560af6cf2ced451ea5efd41ec009393e';

ig.use({ 
  client_id: instaId,
  client_secret: instaSecret
});

module.exports = {
  ig: ig,
  instaId: instaId
}
