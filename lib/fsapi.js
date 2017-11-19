var fs = require('fs');

module.exports = {
    writeBase64ToFile: function(src, data, cb) {
        var buffer = new Buffer(data, 'base64');

        return fs.writeFile(src, buffer, cb);
    }
};
