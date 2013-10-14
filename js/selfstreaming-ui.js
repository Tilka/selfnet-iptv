$(function() {
    var delivery_method = location.hash == '#unicast' ? 'unicast' : 'multicast';

    function play(player, session) {
        var stream_url = get_url(session, delivery_method);
        var p = player[0].playlist;
        // FIXME: for some reason, switching to a different multicast stream doesn't work if clear() is called, vlc crashes often
        p.add(stream_url);
        p.next();

        if (!session.name.match(' HD$')) {
            // doesn't seem to be an HD channel, it'll probably look better with deinterlacing
            player[0].video.deinterlace.enable('blend');
        }
    }

    $('#player-container').html('<embed id=player type=application/x-vlc-plugin version=VideoLAN.VLCPlugin.2 toolbar=false width=700 height=400 pluginspage=http://www.videolan.org/vlc/>');

    var vlcPlugin = navigator.plugins['VLC Web Plugin'];
    if (!vlcPlugin) {
        $('#notes').html('Please install/enable the VLC browser plugin.');
    } else {
        var version = $('#player')[0].VersionInfo.split(' ')[0].split('.');
        var major = parseInt(version[0]), minor = parseInt(version[1]);
        if (major * 100 + minor < 201) {
            $('#notes').html('Upgrading to <a href="http://videolan.org">VLC 2.1.0 or newer</a> fixes several crashes in the web plugin.');
        }
    }

    function reloadChannelList(firstTime) {
        function displaySessions(sessions, doneLoading) {
            if (firstTime || doneLoading) {
                var tbody = $('<tbody>')
                var keys = Object.keys(sessions).sort(function(ip1, ip2) {
                    var x = sessions[ip1].name.toLocaleLowerCase(), y = sessions[ip2].name.toLocaleLowerCase();
                    return x > y ? 1 : (x < y ? -1 : 0);
                });
                for (var i in keys) {
                    var ip = keys[i], session = sessions[ip], channel = $('<tr>');
                    var url = get_url(session, delivery_method);
                    var link = $('<a>Link<b>↗</b></a>').attr('href', url).attr('title', 'direct stream link for external players (right-click and copy link address)');
                    channel.append($('<td>').text(session.name));
                    channel.append($('<td>').text(session.show));
                    channel.append($('<td>').text(session.description));
                    channel.append($('<td>').append(link));
                    channel.click(session, function(event) {
                        var player = $('#player');
                        play(player, event.data);
                        if (player[0].scrollIntoViewIfNeeded !== undefined) {
                            player[0].scrollIntoViewIfNeeded();
                        } else {
                            player[0].scrollIntoView();
                        }
                    });
                    tbody.append(channel);
                }
                $('#channel-list tbody').replaceWith(tbody);
                $('#channel-list').show();
            }
        }

        loadSessions(displaySessions);
    }

    setInterval(reloadChannelList, 3 * 60 * 1000);
    reloadChannelList(true);
});
