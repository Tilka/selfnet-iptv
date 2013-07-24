$(function() {
    // TODO
    var delivery_method = 'unicast';
    var file_extension, mime_type;

    function m3u_formatter(sessions) {
        file_extension = 'm3u';
        mime_type = 'audio/x-mpegurl';
        var data = '#EXTM3U\n';
        for (var i in sessions) {
            var session = sessions[i];
            data += '#EXTINF:-1,' + session.name + '\n';
            data += get_url(session, delivery_method, 'absolute') + '\n';
        }
        return data;
    }

    function xspf_formatter(sessions) {
        file_extension = 'xspf';
        mime_type = 'application/xspf+xml';
        var data = '<?xml version="1.0" encoding="UTF-8"?>\n';
        data += '<playlist version="1" xmlns="http://xspf.org/ns/0/">\n';
        data += '<title>SelfStreaming</title>\n';
        data += '<creator>Selfnet</creator>\n';
        data += '<location>' + location.href + '</location>\n';
        data += '<date>' + (new Date).toISOString() + '</date>\n';
        data += '<trackList>\n';
        for (var i in sessions) {
            var session = sessions[i];
            data += '<track><title>' + session.name + '</title>';
            data += '<location>' + get_url(session, delivery_method, 'absolute') + '</location></track>\n';
        }
        data += '</trackList></playlist>';
        return data;
    }

    function generate_playlist(formatter) {
        var progress = $('#progress-span');
        var link = $('#playlist-download-link');
        function progressCallback(sessions, done) {
            link.hide();
            progress.text(Object.keys(sessions).length + ' streams');
            progress.show();
            if (done) {
                var playlist = formatter(sort_sessions(sessions));
                link.attr('download', 'SelfStreaming.' + file_extension);
                link.attr('href', 'data:' + mime_type + ';charset=utf-8,' + encodeURIComponent(playlist));
                link.text('Download ' + file_extension.toUpperCase() + ' playlist');
                link.show();
                progress.hide();
            }
        }

        loadSessions(progressCallback);
    }

    $('#m3u-button').click(function() {
        generate_playlist(m3u_formatter);
    });
    $('#xspf-button').click(function() {
        generate_playlist(xspf_formatter);
    });
});
