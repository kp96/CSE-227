var gitapi = require('./lib/gitapi'),
    bugs = JSON.parse(require('fs').readFileSync('./data/security_buglist_large.json')).bugs,
    _ = require('lodash'),
    async = require('async'),
    bugIds = _.slice(_.map(bugs, 'id'), 0, 200);

async.mapLimit(bugIds, 5, function(bugId, cb) {
    gitapi.searchAndProcessBug(bugId, function(err) {
        if (err) {
            console.warn(err);
            return cb(null, false);
        }
        return cb(null, true);
    });
});
