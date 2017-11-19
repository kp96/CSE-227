var _ = require('lodash'),
    parse = require('parse-diff'),
    async = require('async'),
    path = require('path'),
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

    _generateLogCommand: function(str) {
        console.info(`git log --grep="${str}" -i --oneline`);

        return `git log --grep="${str}" --oneline`;
    },

    _generateDiffCommand: function(str) {
        return `git show ${str} --oneline`;
    },

    _parseBlame: function(blame) {
        var lines = blame.split('\n'),
            data = {},
            header = ['user', 'date', 'time', 'zone', 'lno'];

        _.forEach(lines, function(line) {
            var splits = line.replace(/\s+/g, ' ').replace(/\(|\)/g, '').split(' ');
            if (_.size(splits) < 2) {
                console.warn(`invalid line ${line}`);
                return;
            }
            if (!data[splits[0]]) {
                data[splits[0]] = _.zipObject(header, _.slice(splits, 1));
            }
        });

        return data;
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
                var res = _.map(blames, function(blame) {
                    return {
                        file: blame.id,
                        authors: GITAPI._parseBlame(blame.out)
                    };
                });

                return cb(null, res);
            }
        ], function(err, data) {
            if (err) {
                console.warn(`Enable to process commitHash ${commitHash}`, err);
                return cb(null);
            }
            var bug_name = path.join(config.bugsDir, `bug_${bugId}_inducer.json`);

            return fs.writeFile(bug_name, JSON.stringify(data), cb);
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

                console.info('found', commitHash, 'for', bugId);

                return GITAPI._processBug(bugId, commitHash, cb);
            }
        ], cb);
    }
};

module.exports = GITAPI;
