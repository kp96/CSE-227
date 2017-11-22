var gitapi = require('./lib/gitapi'),
    bugs = JSON.parse(require('fs').readFileSync('./data/security_buglist_large.json')).bugs,
    _ = require('lodash'),
    async = require('async'),

    buggys = _.map(bugs, 'id');

var allCommits = (require('fs').readFileSync('./data/commits.txt')).toString().split('\n');

var allHashes = _.map(allCommits, function(commit) {
    return commit.split(' ')[0];
});

async.mapLimit(allHashes, 3, gitapi.emulateAPIForCommitHash, function(err) {
    console.log(err);
});
