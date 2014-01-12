/*

This is the unpacked source code of the "fix encoding" bookmarklet,
available at <http://domnit.org/bookmarklets/>.

Version 1.2

2007 Lenny Domnitser, copyright waived
2014 Tillmann Karras:
- export fixEncoding function instead of applying it to the whole document
- don't use list comprehensions
- fix recursively

*/

(function(window) {

var win2byte = {
	'\u20AC': '\x80', '\u201A': '\x82', '\u0192': '\x83', '\u201E': '\x84',
	'\u2026': '\x85', '\u2020': '\x86', '\u2021': '\x87', '\u02C6': '\x88',
	'\u2030': '\x89', '\u0160': '\x8A', '\u2039': '\x8B', '\u0152': '\x8C',
	'\u017D': '\x8E', '\u2018': '\x91', '\u2019': '\x92', '\u201C': '\x93',
	'\u201D': '\x94', '\u2022': '\x95', '\u2013': '\x96', '\u2014': '\x97',
	'\u02DC': '\x98', '\u2122': '\x99', '\u0161': '\x9A', '\u203A': '\x9B',
	'\u0153': '\x9C', '\u017E': '\x9E', '\u0178': '\x9F'
};

function getbyte(s) {
	var b = win2byte[s];
	return b || s;
}

var keys = [];
for (var key in win2byte) {
	keys.push(key);
}
var codes = '(?:[\\x80-\\xBF]|' + keys.join('|') + ')';
var pat = new RegExp('[\\xC2-\\xDF]' + codes +
                    '|[\\xE0-\\xEF]' + codes + '{2}' +
                    '|[\\xF0-\\xF4]' + codes + '{3}', 'g');

function sub(s) {
	var codes = [];
	for (var code in s.substring(1)) {
		codes.push(getbyte(s[1 + parseInt(code)]));
	}
	s = s[0] + codes.join('');
	return decodeURIComponent(escape(s));
}

function fixEncoding(s) {
	var t = s.replace(pat, sub);
	return t == s ? t : fixEncoding(t);
}

window.fixEncoding = fixEncoding;

})(window);
