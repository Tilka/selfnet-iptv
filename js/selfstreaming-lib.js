var prototypeExtensions = [
    [String, {
        /*!
         * fromCodePoint: ES6 Unicode Shims 0.1
         * (c) 2012 Steven Levithan <http://slevithan.com/>
         * MIT License
         */
        fromCodePoint: function() {
            var chars = [], point, offset, units, i;
            for (i = 0; i < arguments.length; ++i) {
                point = arguments[i];
                offset = point - 0x10000;
                units = point > 0xffff ? [0xd800 + (offset >> 10), 0xdc00 + (offset & 0x3ff)] : [point];
                chars.push(String.fromCharCode.apply(null, units));
            }
            return chars.join('');
        },
        fromTypedArray: function(array) {
            if (!Uint8Array.isPrototypeOf(array)) {
                array = new Uint8Array(array.buffer.slice(array.byteOffset));
            }
            return decodeURIComponent(escape(String.fromCodePoint.apply(null, array)));
        }
    }],
    [String.prototype, {
        // standard
        startsWith: function(needle, pos) {
            pos = pos === undefined ? 0 : pos;
            return this.substr(pos, needle.length) == needle;
        },
        toArrayBuffer: function() {
            var array = new Uint8Array(this.length);
            for (var i = 0; i < this.length; i++) {
                array[i] = this.charCodeAt(i);
            }
            return array.buffer;
        }
    }],
    [ArrayBuffer.prototype, {
        // standard (here for FF < 12)
        slice: function(start, end) {
            end = end === undefined ? this.byteLength : end;
            var thisArray = new Uint8Array(this);
            var result = new Uint8Array(end - start);
            for (var i = 0; i < result.length; i++) {
                result[i] = thisArray[start + i];
            }
            return result.buffer;
        },
        memchr: function(value, len) {
            var len = len === undefined ? this.byteLength : len;
            var data = new Uint8Array(this);
            for (var i = 0; i < len; i++) {
                if (data[i] == value) {
                    return i;
                }
            }
            return -1;
        },
        memcmp: function(other, len) {
            if (len === undefined) {
                len = this.byteLength;
                if (len != other.byteLength) {
                    return -1;
                }
            }
            var a = new Uint8Array(this), b = new Uint8Array(other);
            for (var i = 0; i < len; i++) {
                if (a[i] != b[i]) {
                    return 1;
                }
            }
            return 0;
        },
        append: function(other) {
            var both = new Uint8Array(this.byteLength + other.byteLength);
            both.set(new Uint8Array(this));
            both.set(new Uint8Array(other), this.byteLength);
            return both.buffer;
        }
    }]
];
for (var i in prototypeExtensions) {
    var ext = prototypeExtensions[i], obj = ext[0], attrs = ext[1];
    for (var attrName in attrs) {
        if (obj[attrName] === undefined) {
            var attr = attrs[attrName];
            obj[attrName] = attr;
        } else {
            console.warn(obj.constructor.name + '.' + attrName + " is already defined! Let's hope it works as expected.");
        }
    }
}
