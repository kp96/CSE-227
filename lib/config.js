var path = require('path');

module.exports = {
    bugzilla: {
        parseAttachmentURL: function(id) {
            return `https://bugzilla.mozilla.org/rest/bug/${id}/attachment`;
        },

        parseBugURL: function(id) {
            return `https://bugzilla.mozilla.org/rest/bug/${id}`;
        },

        bugsDir: path.join(process.cwd(), 'data', 'bug_info')
    }
};
