var request = require('request');
var zlib = require('zlib');

var date = require('date-and-time');

module.exports = {
    get_html: function ( url, callback ) {
        //console.log('GETTING URL HTML :: ' + url );
        var headers = {
            "accept-charset": "ISO-8859-1,utf-8;q=0.7,*;q=0.3",
            "accept-language": "en-US,en;q=0.8",
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.13+ (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2",
            "accept-encoding": "gzip,deflate",
        };
        
        var options = {
            url: url,
            headers: headers,
            timeout: 60000
        };
        try{
            var req = request.get(options);
            req.on('response', function (res) {
                var chunks = [];
                res.on('data', function (chunk) {
                    chunks.push(chunk);
                });
                res.on('end', function () {
                    var buffer = Buffer.concat(chunks);
                    var encoding = res.headers['content-encoding'];
                    if (encoding == 'gzip') {
                        zlib.gunzip(buffer, function (err, decoded) {
                            callback('success', decoded && decoded.toString());
                        });
                    } else if (encoding == 'deflate') {
                        zlib.inflate(buffer, function (err, decoded) {
                            callback('success', decoded && decoded.toString());
                        })
                    } else {
                        callback( 'success', buffer.toString() );
                    }
                });
                res.on('error', function (err) {
                    callback('error', err );
                });
            });
            req.on('error', function (err) {
                callback('error', err );
            });
        }catch(err){
            callback('error', err );
        }
    },
    currentTime: function () {
        return new Date().getTime();
    },
    currentTimestamp: function(){
        return Math.floor(Date.now() / 1000);
    },
    currentDate:function(){
        var now = new Date();
        ret = date.format(now, 'YYYY-M-D');  
        return ret;
    },
    currentDateTimeDay:function(){
        var now = new Date();
        return date.format(now, 'E YYYY-MMM-DD HH:mm:ss A');
    },
    currentIsoDate: function(){
        return new Date();
    }
}