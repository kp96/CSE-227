var path = require('path');

module.exports = {
    bugzilla: {
        parseAttachmentURL: function(id) {
            return `https://bugzilla.mozilla.org/rest/bug/${id}/attachment`;
        },

        parseBugURL: function(id) {
            return `https://bugzilla.mozilla.org/rest/bug/${id}`;
        },

        parseGitHubURL: function(commitHash) {
            return `https://api.github.com/repos/mozilla/gecko-dev/commits/${commitHash}`;
        },

        bugsDir: path.join(process.cwd(), 'data', 'commit_detail')
    }
};
