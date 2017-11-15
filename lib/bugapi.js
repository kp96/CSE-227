var _ = require('lodash'),
    async = require('async'),
    fsapi = require('./fsapi'),
    config = require('./config').bugzilla,
    fs = require('fs'),
    path = require('path'),
    request = require('request');

var API = {
    _getData: function(url, cb) {
        request.get(url, function(err, res, data) {
            if (err || res.statusCode !== 200) {
                return cb(new Error(`Returned ${err} when getting bugid ${url}`));
            }

            return cb(null, JSON.parse(data));
        });
    },

    _parseAttachment: function(data, cb) {
        var parsedAttachments = _.filter(data, function(attachment) {
            return _.has(attachment, 'is_obsolete') &&
                _.has(attachment, 'is_patch') &&
                !attachment.is_obsolete && attachment.is_patch;
        });

        if (_.size(parsedAttachments) === 0) {
            return cb(new Error(`Attachment ${data} has no patch`));
        }

        return cb(null, parsedAttachments[0]);
    },

    _processAttachments: function(bugId, cb) {
        // var self = this;

        async.waterfall([
            async.apply(API._getData, config.parseAttachmentURL(bugId)),

            function(data, cb) {
                return API._parseAttachment(_.get(data, `bugs.${bugId}`, []), cb);
            },

            function(parsedAttachment, cb) {
                var bug_name = path.join(config.bugsDir, `bug_${bugId}_patch.txt`);

                return fsapi.writeBase64ToFile(bug_name, parsedAttachment.data, cb);
            }
        ], function(err) {
            if (err) {
                console.warn(`Received error for:  ${err}`);
            }
            return cb(null);
        });
    },

    _processBug: function(bugId, cb) {
        // var self = this;

        async.waterfall([
            async.apply(API._getData, config.parseBugURL(bugId)),

            function(bugData, cb) {
                var bug_name = path.join(config.bugsDir, `bug_${bugId}_meta.json`);
                return fs.writeFile(bug_name, JSON.stringify(bugData), cb);
            }
        ], function(err) {
            if (err) {
                console.warn(`Process Bug. Received error for:  ${err}`);
            }
            return cb(null);
        });
    },

    loll: function(data, cb) {
        return cb();
    },

    processBug: function(bugId, cb) {
        // var self = this;
        async.parallel([
            function(cb) {
                return API._processBug(bugId, cb);
            },
            function(cb) {
                return API._processAttachments(bugId, cb);
            }
        ], cb);
    }
};

module.exports = API;
