var _ = require('lodash'),
    parse = require('parse-diff'),
    async = require('async'),
    path = require('path'),
    request = require('request'),
    config = require('./config').bugzilla,
    fs = require('fs'),
    child_process = require('child_process'),
    GITAPI;

GITAPI = {
    _startProcess: function(cmd, options, cb) {
        var data = {
            id: options.id
        };

        child_process.exec(cmd, options, function(err, sout, serr) {
            if (err || serr) {
                return cb(err ? err : serr);
            }
            data.out = sout;
            return cb(null, data);
        });
    },

    _generateBlameCommand: function(options) {
        var parseLines = _.reduce(options.lines, function(acc, line) {
            return acc + `-L ${line.start},${line.end} `;
        }, '').trim();

        return `git blame ${options.commitHash}^ ${parseLines} -- ${options.file}`;
    },

    _generateShowCommandJSON: function(commitHash) {
        return 'git show --format="%H%n%an%n%ae%n%aI%n%cn%n%ce%n%cI%n%s"' + commitHash;
    },

    _generateDiffCommand: function(commitHash) {
        return `git show --format=%b ${commitHash}`;
    },

    _generateLogCommand: function(str) {
        console.info(`git log --grep="${str}" -i --oneline`);

        return `git log --grep="${str}" --oneline`;
    },

    _generateDiffCommand: function(str) {
        return `git show ${str} --oneline`;
    },

    _getCommitInfoFromGitHub: function(commitHash, cb) {
        request.get({
            url: config.parseGitHubURL(commitHash),
            headers: {
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'kp96',
                'Authorization': 'Basic ' + new Buffer('kp96:2QSzut&7@5@U').toString('base64')
            } }, function(err, res, data) {
            if (err) {
                return cb(err);
            }
            if (res.statusCode !== 200) {
                return cb(new Error(`GitHub returned ${res.statusCode} for ${commitHash}: Reason ${data}`));
            }

            return cb(null, data);
        });
    },

    _parseBlame: function(commitHash, blame) {
        var lines = blame.split('\n');

        return _.map(lines, function(line) {
            var commitId = (line.replace(/\s+/g, ' ').replace(/\(|\)/g, '').split(' '))[0];
            if (commitId.indexOf(commitHash) !== -1) {
                return '';
            }

            return commitId;
        });
    },

    _parseDiff: function(diff) {
        return parse(diff);
    },

    _searchBug: function(bugId, cb) {
        var command = GITAPI._generateLogCommand(`Bug \\b${bugId}\\b`),
            options = {
                id: bugId,
                cwd: 'C:\\Users\\Krishna\\Documents\\gecko-dev'
            };

        return GITAPI._startProcess(command, options, cb);
    },

    _processBug: function(bugId, commitHash, cb) {
        async.waterfall([
            function(cb) {
                var command = GITAPI._generateDiffCommand(commitHash),
                    options = {
                        cwd: 'C:\\Users\\Krishna\\Documents\\gecko-dev'
                    };

                console.info('command', command);
                GITAPI._startProcess(command, options, cb);
            },

            function(data, cb) {
                var diffStr = data.out,
                    files = GITAPI._parseDiff(diffStr.substring(diffStr.indexOf('\n') + 1)),
                    parsedData = _.map(files, function(file) {
                        return {
                            file: file.from,
                            command: GITAPI._generateBlameCommand(
                                {
                                    commitHash: commitHash,
                                    file: file.from,
                                    lines: _.map(file.chunks, function(chunk) {
                                        return {
                                            start: chunk.oldStart,
                                            end: chunk.oldStart + chunk.oldLines
                                        };
                                    })
                                }
                            )
                        };
                    });

                return async.mapLimit(parsedData, 5, function(data, cb) {
                    return GITAPI._startProcess(data.command, {
                        id: data.file,
                        cwd: 'C:\\Users\\Krishna\\Documents\\gecko-dev'
                    }, cb);
                }, cb);
            },

            function(blames, cb) {
                var res = _.reduce(blames, function(acc, blame) {
                    return _.concat(acc, _.compact(_.uniq(GITAPI._parseBlame(commitHash, blame.out))));
                }, []);

                return cb(null, res);
            }
        ], function(err, data) {
            if (err) {
                console.warn(`Enable to process commitHash ${commitHash}`, err);
                return cb(null);
            }

            return GITAPI._getCommitInfoFromGitHub(commitHash, function(err, info) {
                if (err) {
                    console.warn(err);
                    return cb(null);
                }

                data = {
                    bug_id: bugId,
                    commitHash: commitHash,
                    commit_info: JSON.parse(info),
                    blames: data
                };

                var bug_name = path.join(config.bugsDir, `bug_${bugId}_${commitHash}_inducer.json`);

                return fs.writeFile(bug_name, JSON.stringify(data), cb);
            });
        });
    },

    searchAndProcessBug: function(bugId, cb) {
        async.waterfall([
            async.apply(GITAPI._searchBug, bugId),

            function(data) {
                if (_.isEmpty(data.out)) {
                    return cb(new Error(`No matching commit found for ${bugId}`));
                }

                var commitHash = data.out.split(' ')[0];

                return GITAPI._processBug(bugId, commitHash, cb);
            }
        ], cb);
    },

    emulateAPIForCommitHash: function(commitHash, cb) {
        async.parallel([
            function(cb) {
                GITAPI._startProcess(GITAPI._generateShowCommandJSON(commitHash), {
                    id: commitHash,
                    cwd: 'C:\\Users\\Krishna\\Documents\\gecko-dev'
                }, cb);
            },
            function(cb) {
                GITAPI._startProcess(GITAPI._generateDiffCommand(commitHash), {
                    id: commitHash,
                    cwd: 'C:\\Users\\Krishna\\Documents\\gecko-dev'
                }, cb)
            }
        ], function(err, res) {
            if (err) {
                console.error('Error gitdiff', err);
                return cb(null);
            }
            var splits = res[0].out.split('\n'),
            data = {
                sha: JSON.stringify(splits[0]),
                commit: {
                    author: {
                        name: JSON.stringify(splits[1]),
                        email: JSON.stringify(splits[2]),
                        date: JSON.stringify(splits[3])
                    },

                    committer: {
                        name: JSON.stringify(splits[4]),
                        email: JSON.stringify(splits[5]),
                        date: JSON.stringify(splits[6])
                    },

                    message: JSON.stringify(splits[7])
                },
                diff: JSON.stringify(res[1].out)
            };

            fs.writeFile(path.join(config.bugsDir, `${commitHash}.json`), JSON.stringify(data), cb);
        })
    }
};

module.exports = GITAPI;
