var SAP_IP = '239.195.255.255';
var SAP_PORT = '9875';

if (!('onprogress' in $.ajaxSettings.xhr())) {
    alert('onprogress not supported (supported since Chrome 7, FF 3.5, Opera 12, IE 10)');
}

function isResponseTypeSupported(responseType) {
    var xhr = new XMLHttpRequest();
    // the XHR2 standard doesn't require open() to be called before setting responseType but FF does
    xhr.open('GET', '/');
    try {
        xhr.responseType = responseType;
    } catch(e) {
        return false;
    }
    return xhr.responseType === responseType;
}
var usingChunkedArrayBuffer = isResponseTypeSupported('moz-chunked-arraybuffer');
if (!usingChunkedArrayBuffer) {
    console.info("If you got an error about moz-chunked-arraybuffer, don't worry about it, that was just a test.");
}

function inet_ntop(buffer) {
    var size = buffer.byteLength;
    if (size != 4 && size != 16) {
        throw 'inet_ntop: unknown address size';
    }
    var isIPv4 = size == 4;
    var data = new (isIPv4 ? Uint8Array : Uint16Array)(buffer);
    var result = [];
    for (var i = 0; i < (isIPv4 ? 4 : 8); i++) {
        result.push(data[i].toString(isIPv4 ? 10 : 16));
    }
    return result.join(isIPv4 ? '.' : ':');
}

// returns number of bytes parsed or -1 if done
function parseSapPackets(buffer, sessions) {
    if (buffer.byteLength < 4 + 4) return 0;
    var header     = new Uint8Array(buffer);
    var flags      = header[0];
    var compressed = !!(flags & 1);
    var encrypted  = !!(flags & 2);
    var deletion   = !!(flags & 4);
    var isIPv4     = !(flags & 16)
    var addrLength = isIPv4 ? 4 : 16;
    var sapVersion = flags >> 5;
    var authLength = header[1];
    if (compressed || encrypted || deletion || sapVersion != 1 || authLength != 0) {
        console.debug('SAP header:', compressed, encrypted, deletion, sapVersion, authLength);
        throw 'parseSapPackets: unsupported SAP packet header';
    }
    var pos = 4 + addrLength;
    if (buffer.byteLength < pos) return 0;
    var source = buffer.slice(4, pos);
    var sdpMime = 'application/sdp\x00'.toArrayBuffer();
    if (buffer.byteLength < pos + sdpMime.byteLength) return 0;
    if (buffer.slice(pos).memcmp(sdpMime, sdpMime.byteLength) != 0) {
        throw 'parseSapPackets: unknown MIME type';
    }
    pos += sdpMime.byteLength;
    var session = {};
    while (1) {
        var eol = buffer.slice(pos).memchr(13);
        if (eol == -1) {
            // rest of data contains no newline and sessions haven't started repeating --> need more data
            return 0;
        }
        var lineBuffer = buffer.slice(pos, pos + eol);
        var line = new Uint8Array(lineBuffer);
        if (line[1] != '='.charCodeAt(0)) {
            break;
        }
        pos += eol + 2;
        
        var lineType = String.fromCharCode(line[0]);
        var lineHandler = ({
            v: function(s) { if (s != '0') throw 'parseSapPackets: unsupported SDP version "' + s + '"'; },
            s: function(s) {
                var matches = s.match(/(.*) \[(.*)\]/);
                session.name = matches ? matches[1] : s;
                session.show = matches ? matches[2] : '';
            },
            i: function(s) { session.description = s; },
            c: function(s) { session.ip   = s.split(' ')[2].split('/')[0]; },
            m: function(s) { session.port = s.split(' ')[1].split('/')[0]; },
            a: null, // attribute
            o: null, // origin
            p: null, // phone number
            t: null, // timing
            u: null, // URI
        })[lineType];
        if (lineHandler) {
            lineHandler(String.fromTypedArray(line.subarray(2)));
        } else {
            if (lineHandler === undefined) {
                console.error('parseSapPackets: unknown line type "%s"', lineType);
            }
        }
    }
    var existing_session = sessions[session.ip];
    session.times_seen = existing_session ? existing_session.times_seen + 1 : 1;
    sessions[session.ip] = session;
    if (session.times_seen >= 3) {
        // a session has been seen three times -> every session should have had a chance to appear at least once
        return -1;
    }
    var rest = parseSapPackets(buffer.slice(pos), sessions);
    return rest == -1 ? -1 : pos + rest;
}

function loadSessions(loadSessionsCallback) {
    var startTime = new Date().getTime();
    var start = 0;
    var sessions = {};
    var unparsedData = new ArrayBuffer(0);
    var ajaxAttr = {
        progress: function(event) {
            try {
                var xhr = event.target;
                var response = xhr.response;
                if (usingChunkedArrayBuffer) {
                    var sapData = unparsedData.append(response);
                } else {
                    if (response.length == 0) {
                        return;
                    }
                    var sapData = response.slice(start).toArrayBuffer();
                }
                var parsedBytes = parseSapPackets(sapData, sessions);
                var doneLoading = parsedBytes == -1;
                if (doneLoading) {
                    xhr.abort();
                    var deltaTime = new Date().getTime() - startTime;
                    var sessionCount = Object.keys(sessions).length;
                    console.log('SAP stream cancelled normally, got %d sessions, took %d ms', sessionCount, deltaTime);
                } else {
                    if (usingChunkedArrayBuffer) {
                        // the response ArrayBuffer is only available during this progress event,
                        // so we need to copy the unparsed end of it for the next call
                        unparsedData = sapData.slice(parsedBytes);
                    } else {
                        start += parsedBytes;
                    }
                }
                loadSessionsCallback(sessions, doneLoading);
            } catch (e) {
                // just in case anything breaks, make sure to cancel the request
                event.target.abort();
                throw e;
            }
        }
    };
    if (usingChunkedArrayBuffer) {
        ajaxAttr.xhrFields = {
            // supported since FF 9
            responseType: 'moz-chunked-arraybuffer'
        };
    } else {
        ajaxAttr.beforeSend = function(xhr) {
            // we need raw data --> disable character decoding
            xhr.overrideMimeType('text/plain; charset=x-user-defined');
        };
    }
    $.ajax('/stream/' + SAP_IP + ':' + SAP_PORT + '/', ajaxAttr);
}
