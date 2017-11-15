var bugapi = require('./lib/bugapi'),
    async = require('async'),
    bugs = JSON.parse(require('fs').readFileSync('./data/security_buglist_large.json')).bugs,
    _ = require('lodash'),
    bugIds = _.map(bugs, function(bug) {
        return bug.id;
    });

var delay = function(ms, fn) {
    setTimeout(fn, ms);
}
async.mapSeries(bugIds, bugapi.processBug, function(err) {
    if (err) {
        console.error(err);
    }
    console.info('all done successfully');
});
