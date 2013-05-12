$(function() {
    function play(player, session) {
        if ($('input[name=delivery-method]:checked').val() == 'multicast') {
            var stream = 'rtp://@' + session.ip + ':' + session.port;
        } else {
            var stream = '/stream/' + session.ip + ':' + session.port + '/';
        }
        var p = player[0].playlist;
        // FIXME: for some reason, switching to a different multicast stream doesn't work if clear() is called and vlc crashed often
        p.add(stream);
        p.next();

        if (!session.name.match(' HD$')) {
            // doesn't seem to be an HD channel, it'll probably look better with deinterlacing
            player[0].video.deinterlace.enable('blend');
        }
    }

    $('#method-multicast').click();
    //$('#method-unicast').click();

    $('#player-container').html('<embed id=player type=application/x-vlc-plugin version=VideoLAN.VLCPlugin.2 toolbar=false width=700 height=400 pluginspage=http://www.videolan.org/vlc/>');

    var vlcPlugin = navigator.plugins['VLC Web Plugin'];
    if (!vlcPlugin) {
        alert('Please install/enable the VLC browser plugin.');
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
                    channel.append($('<td>').text(session.name));
                    channel.append($('<td>').text(session.show));
                    channel.append($('<td>').text(session.description));
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
