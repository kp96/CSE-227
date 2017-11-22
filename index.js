var gitapi = require('./lib/gitapi'),
    bugs = JSON.parse(require('fs').readFileSync('./data/security_buglist_large.json')).bugs,
    _ = require('lodash'),
    async = require('async'),

    buggys = _.map(bugs, 'id');

var bugIds = _.slice(buggys, _.indexOf(buggys, 202198), 2000);

console.log(_.indexOf(buggys, 315871));

async.mapLimit(bugIds, 3, function(bugId, cb) {
    gitapi.searchAndProcessBug(bugId, function(err) {
        if (err) {
            console.warn(err);
            return cb(null, false);
        }
        return cb(null, true);
    });
});
