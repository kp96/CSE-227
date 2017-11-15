var fs = require('fs'),
    path = require('path');

module.exports = {
    writeBase64ToFile: function(src, data, cb) {
        var buffer = new Buffer(data, 'base64');

        return fs.writeFile(src, buffer, cb);
    }
}
