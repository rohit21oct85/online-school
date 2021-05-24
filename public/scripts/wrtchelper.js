var WrtcHelper = (function () {
	 const iceConfiguration = {
     iceServers: [
         {urls:'stun:stun.l.google.com:19302'},
	 	{urls:'stun:stun1.l.google.com:19302'},
	 	{urls:'stun:stun2.l.google.com:19302'},
	 	{urls:'stun:stun3.l.google.com:19302'},
	 	{urls:'stun:stun4.l.google.com:19302'},
	   ]
	 };

    var _audioTrack;

    var peers_conns = [];
    var peers_con_ids = [];

    var _remoteVideoStreams = [];
    var _remoteAudioStreams = [];

    var _localVideoPlayer;

    var _rtpVideoSenders = [];
    var _rtpAudioSenders = [];

    var _serverFn;

    var VideoStates = { None: 0, Camera: 1, ScreenShare: 2 };
    var _videoState = VideoStates.None;
    var _videoCamSSTrack;
    var _isAudioMute = true;
    var _my_connid = '';
    
    var _mediaRecorder;
    var _recordedChunks = [];


    async function _init(serFn, myconnid) {
        _my_connid = myconnid;
        _serverFn = serFn;
        _localVideoPlayer = document.getElementById('localVideoCtr');
        eventBinding(myconnid);
        console.log("my id "+ myconnid)
        $("#remoteControlls").attr("id","myControlls"+myconnid);
    }

    function eventBinding(myconnid){

        
        $("#btnMuteUnmute").on('click', async function () {

            if (!_audioTrack) {
                await startwithAudio();
            }

            if (!_audioTrack) {
                alert('problem with audio permission')
                return;
            }

            if (_isAudioMute) {
                _audioTrack.enabled = true;
                // $(this).text("Mute");
                $(this).removeClass('btnoff');
                $(this).empty();
                $(this).append( "<i class='fas fa-microphone' title='Mute'></i>" );
                AddUpdateAudioVideoSenders(_audioTrack, _rtpAudioSenders);
            }
            else {
                _audioTrack.enabled = false;
                // $(this).text("Unmute");
                $(this).empty();
                $(this).addClass('btnoff');
                $(this).append( "<i class='fas fa-microphone-slash' title='UnMute'></i>" );
                RemoveAudioVideoSenders(_rtpAudioSenders);
            }
            _isAudioMute = !_isAudioMute;

            console.log(_audioTrack);
        });
        $("#btnStartStopCam").on('click', async function () {

            if (_videoState == VideoStates.Camera) { //Stop case
                await $("#user_indication_me").css({'display':'block'});
                await $("#btnStartReco").css({'display':'none'});
                await ManageVideo(VideoStates.None);

            }
            else {
                await $("#user_indication_me").css({'display':'none'});
                await $("#btnStartReco").css({'display':'block'});
                await ManageVideo(VideoStates.Camera);
            }
            console.log(VideoStates);
        });

        $("#btnStartStopScreenshare").on('click', async function () {

            if (_videoState == VideoStates.ScreenShare) { //Stop case
                await $("#user_indication_me").css({'display':'block'});
                await ManageVideo(VideoStates.None);
            }
            else {
                await $("#user_indication_me").css({'display':'none'});
                
                await ManageVideo(VideoStates.ScreenShare);
            }
        });

        $(document).on('click', "#remoteStartStopScreenshare_"+myconnid, async function () {

            if(_videoState == VideoStates.ScreenShare) { //Stop case
                await $("#user_indication_me").css({'display':'block'});
                await ManageVideo(VideoStates.None);
            }
            else {
                await $("#user_indication_me").css({'display':'none'});
                
                await ManageVideo(VideoStates.ScreenShare);
            }
        });    
        


        $("#btnStartReco").on('click', async function(){
            // $("#btnRecordCam").attr('id','btnStopRecord');
            // $("#btnStopRecord i").addClass('fa-stop').attr('title', 'Stop Recording');
            setupMediaRecorder();
            _mediaRecorder.start(1000);
        });

        $("#btnPauseReco").on('click', function () {
            _mediaRecorder.pause();
        });
        $("#btnResumeReco").on('click', function () {
            _mediaRecorder.resume();
        });
        $("#btnStopReco").on('click', function () {
            _mediaRecorder.stop();
        });

        $(document).on('click', ".function_btn_unmute_audio", async function(e){
            let div = $(this).attr('id');
            $(this).addClass('function_btn_mute_audio');
            $(this).removeClass('function_btn_unmute_audio');
            let other_id = div.split('___')[1];
            _serverFn(JSON.stringify({'unmuteAudio': other_id }), other_id);
        });
        
        $(document).on('click', ".function_btn_mute_audio", async function(e){
            let div = $(this).attr('id');
            $(this).addClass('function_btn_unmute_audio');
            $(this).removeClass('function_btn_mute_audio');
            let other_id = div.split('___')[1];
            _serverFn(JSON.stringify({'muteAudio': other_id }), other_id);
        });

        
        $(document).on('click', ".function_btn_share_screen", async function(e){
            let div = $(this).attr('id');
            $(this).addClass('function_btn_remove_screen');
            $(this).removeClass('function_btn_share_screen');
            let other_id = div.split('___')[1];
            _serverFn(JSON.stringify({'allowShareScreen': other_id }), other_id);
        });
        
        $(document).on('click', ".function_btn_remove_screen", async function(e){
            let div = $(this).attr('id');
            $(this).addClass('function_btn_share_screen');
            $(this).removeClass('function_btn_remove_screen');
            let other_id = div.split('___')[1];
            _serverFn(JSON.stringify({'removeShareScreen': other_id }), other_id);
        });

        

    }

    function setupMediaRecorder() {
        console.log(_remoteVideoStreams);
        console.log(_remoteAudioStreams);
       
        debugger;
        var stream = new MediaStream([_audioTrack]);
        
        if (_videoCamSSTrack && _videoCamSSTrack.readyState === "live") {
           stream.addTrack(_videoCamSSTrack);
        }

        _remoteVideoStreams.forEach(vstream => {
            stream.addTrack(vstream.getVideoStream()[0]);
        })
        
        _remoteAudioStreams.forEach(astream => {
            stream.addTrack(astream.getAudioStream()[0]);
        })

        stream.getTracks().forEach(track => {
            console.log(track);
        })

        _recordedChunks = [];
        
        _mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp8,opus' });
        
        _mediaRecorder.ondataavailable = (e) => {
            console.log(e.data.size);
            if(e.data.size > 0)
                _recordedChunks.push(e.data);
        };
        _mediaRecorder.onstart = async () => {
            console.log('onstart');
            $("#btnStartReco").hide();
            $("#btnPauseReco").show();
            $("#btnStopReco").show();
            $("#downloadRecording").hide();
        };
        _mediaRecorder.onpause = async () => {
            $("#btnPauseReco").hide();
            $("#btnResumeReco").show();
        };
        _mediaRecorder.onresume = async () => {
            $("#btnResumeReco").hide();
            $("#btnPauseReco").show();
            $("#btnStopReco").show();
        };

        _mediaRecorder.onstop = async () => {
            console.log('onstop');
            var blob = new Blob(_recordedChunks, { type: 'video/webm' });
            let url = window.URL.createObjectURL(blob);
            
            // var videoRecPlayer = document.getElementById('videoCtrRec');
            // videoRecPlayer.src = url;
            // videoRecPlayer.play();
            // $(videoRecPlayer).css({'display': 'block'});

            $("#downloadRecording").attr({ href: url, download: 'video.webm' }).show();
            $("#btnStartReco").show();
            $("#btnPauseReco").hide();
            $("#btnStopReco").hide();
            var download = document.getElementById('downloadRecording');
            download.href = url;
            download.download = 'test.weba';
            download.style.display = 'block';
        };
    }

    //Camera or Screen Share or None
    async function ManageVideo(_newVideoState) {

        if (_newVideoState == VideoStates.None) {
            $("#btnStartStopCam").addClass('btnoff').addClass('camera_off');
            $("#btnStartStopCam").find('i').attr("title", "Start Camera");
            
            $("#btnStartStopScreenshare").find('i').attr("title", "Screen Share");
                $("#btnStartStopScreenshare").removeClass('btnoff').removeClass('camera_off');
            _videoState = _newVideoState;

            ClearCurrentVideoCamStream(_rtpVideoSenders);
            return;
        }

        try {
            var vstream = null;

            if (_newVideoState == VideoStates.Camera) {
                vstream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: 720,
                        height: 480
                    },
                    audio: false
                });
            }
            else if (_newVideoState == VideoStates.ScreenShare) {
                vstream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        width: 720,
                        height: 480
                    },
                    audio: false
                });

                vstream.oninactive = e => {
                    ClearCurrentVideoCamStream(_rtpVideoSenders);
                    // $("#btnStartStopScreenshare").text('Screen Share');
                    $("#btnStartStopScreenshare").find('i').attr("title", "Screen Share");
                    $("#btnStartStopScreenshare").removeClass('btnoff').removeClass('camera_off');
                };
            }

            ClearCurrentVideoCamStream(_rtpVideoSenders);

            _videoState = _newVideoState;

            if (_newVideoState == VideoStates.Camera) {
                $("#btnStartStopCam").removeClass('btnoff').removeClass('camera_off');
                $("#btnStartStopCam").find('i').attr("title", "Stop Camera");
                // $("#btnStartStopCam").text('Stop Camera');
                $("#btnStartStopScreenshare").find('i').attr("title", "Screen Share");
                $("#btnStartStopScreenshare").removeClass('btnoff').removeClass('camera_off');
                // $("#btnStartStopScreenshare").text('Screen Share');
            }
            else if (_newVideoState == VideoStates.ScreenShare) {
                // $("#btnStartStopCam").text('Start Camera');
                $("#btnStartStopCam").addClass('btnoff').addClass('camera_off');
                $("#btnStartStopCam").find('i').attr("title", "Start Camera");
                // $("#btnStartStopScreenshare").text('Stop Screen Share');
                $("#btnStartStopScreenshare").addClass('btnoff').addClass('camera_off');
                $("#btnStartStopScreenshare").find('i').attr("title", "Stop Screen Share");
            }

            if (vstream && vstream.getVideoTracks().length > 0) {
                _videoCamSSTrack = vstream.getVideoTracks()[0];

                if (_videoCamSSTrack) {
                    _localVideoPlayer.srcObject = new MediaStream([_videoCamSSTrack]);
                    AddUpdateAudioVideoSenders(_videoCamSSTrack, _rtpVideoSenders);
                }
            }
        } catch (e) {
            console.log(e);
            return;
        }
    }

    function ClearCurrentVideoCamStream(rtpVideoSenders){
        if (_videoCamSSTrack) {
            _videoCamSSTrack.stop();
            _videoCamSSTrack = null;
            _localVideoPlayer.srcObject = null;

            RemoveAudioVideoSenders(rtpVideoSenders);
        }
    }

    async function RemoveAudioVideoSenders(rtpSenders) {
        for (var con_id in peers_con_ids) {
            if (rtpSenders[con_id] && IsConnectionAvailable(peers_conns[con_id])) {
                peers_conns[con_id].removeTrack(rtpSenders[con_id]);
                rtpSenders[con_id] = null;
            }
        }
    }

    async function AddUpdateAudioVideoSenders(track,rtpSenders) {
        for (var con_id in peers_con_ids) {
            if (IsConnectionAvailable(peers_conns[con_id])) {
                if (rtpSenders[con_id] && rtpSenders[con_id].track) {
                    rtpSenders[con_id].replaceTrack(track);
                }
                else {
                    rtpSenders[con_id] = peers_conns[con_id].addTrack(track);
                }
            }
        }
    }

    async function startwithAudio() {

        try {
            var astream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            _audioTrack = astream.getAudioTracks()[0];

            _audioTrack.onmute = function (e) {
                console.log(e);
            }
            _audioTrack.onunmute = function (e) {
                console.log(e);
            }

            _audioTrack.enabled = false;

        } catch (e) {
            console.log(e);
            return;
        }
    }

    async function createConnection(connid) {
        var connection = new RTCPeerConnection(iceConfiguration);
        connection.onicecandidate = function (event) {
            console.log('onicecandidate', event.candidate);
            if (event.candidate) {
                _serverFn(JSON.stringify({ 'iceCandidate': event.candidate }), connid);
            }
        }
        connection.onicecandidateerror = function (event) {
            console.log('onicecandidateerror', event);

        }
        connection.onicegatheringstatechange = function (event) {
            console.log('onicegatheringstatechange', event);
        };
        connection.onnegotiationneeded = async function (event) {
            console.log('onnegotiationneeded', event);
            await _createOffer(connid);
        }
        connection.onconnectionstatechange = function (event) {

            console.log('onconnectionstatechange', event.currentTarget.connectionState)
            if (event.currentTarget.connectionState === "connected") {
                console.log('connected')
            }
            if (event.currentTarget.connectionState === "disconnected") {
                console.log('disconnected');
            }
        }
        // New remote media stream was added

        connection.ontrack = function (event) {

            // event.track.onunmute = () => {
            //     alert('unmuted');
            // };     

            if (!_remoteVideoStreams[connid]){
                
                _remoteVideoStreams[connid] = new MediaStream();
                
            }

            if (!_remoteAudioStreams[connid])
                _remoteAudioStreams[connid] = new MediaStream();

            if (event.track.kind == 'video') {
                _remoteVideoStreams[connid].getVideoTracks().forEach(t => {
                    _remoteVideoStreams[connid].removeTrack(t);
                   
                });
                _remoteVideoStreams[connid].addTrack(event.track);
                //_remoteVideoStreams[connid].getTracks().forEach(t => console.log(t));

                var _remoteVideoPlayer = document.getElementById('v_' + connid);
                var _remoteUser = document.getElementById('u_'+ connid);
                $(_remoteUser).hide();

                _remoteVideoPlayer.srcObject = null;
                _remoteVideoPlayer.srcObject = _remoteVideoStreams[connid];
                _remoteVideoPlayer.load();

                event.track.onmute = function() {
                   console.log(connid + ' muted');
                   console.log(this.muted+ ' muted');
                   console.log(event.track.muted+ ' muted');
                   console.log(this.readyState+ ' muted');
                   console.log('muted',this);
                   console.log('muted',_remoteVideoStreams[connid] );
                   console.log('muted',_remoteVideoPlayer.paused);
                   console.log('muted',_remoteVideoPlayer.readyState );
                   console.log('muted',_remoteVideoPlayer.ended );
                   if(this.muted){
                    _remoteVideoPlayer.srcObject = null;
                    var _remoteUser = document.getElementById('u_'+ connid);
                    $(_remoteUser).css({'display': 'block'});
                   }
                };
            }
            else if (event.track.kind == 'audio') {
                var _remoteAudioPlayer = document.getElementById('a_' + connid)
                _remoteAudioStreams[connid].getVideoTracks().forEach(t => _remoteAudioStreams[connid].removeTrack(t));
                _remoteAudioStreams[connid].addTrack(event.track);
                _remoteAudioPlayer.srcObject = null;
                _remoteAudioPlayer.srcObject = _remoteAudioStreams[connid];
                _remoteAudioPlayer.load();
            }
        };

        peers_con_ids[connid] = connid;
        peers_conns[connid] = connection;

        if (_videoState == VideoStates.Camera || _videoState == VideoStates.ScreenShare) {
            if (_videoCamSSTrack) {
                AddUpdateAudioVideoSenders(_videoCamSSTrack, _rtpVideoSenders);
            }
        }

        return connection;
    }

    async function _createOffer(connid) {

        //await createConnection();
        var connection = peers_conns[connid];
        console.log('connection.signalingState:' + connection.signalingState);
        var offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        //Send offer to Server
        _serverFn(JSON.stringify({ 'offer': connection.localDescription }), connid);
    }
    async function exchangeSDP(message, from_connid) {
        console.log('messag', message);
        message = JSON.parse(message);

        if (message.answer) {
            console.log('answer', message.answer);
            await peers_conns[from_connid].setRemoteDescription(new RTCSessionDescription(message.answer));
            console.log('connection', peers_conns[from_connid]);
        }
        else if (message.offer) {
            console.log('offer', message.offer);

            if (!peers_conns[from_connid]) {
                await createConnection(from_connid);
            }

            await peers_conns[from_connid].setRemoteDescription(new RTCSessionDescription(message.offer));
            var answer = await peers_conns[from_connid].createAnswer();
            await peers_conns[from_connid].setLocalDescription(answer);
            _serverFn(JSON.stringify({ 'answer': answer }), from_connid, _my_connid);
        }
        else if (message.iceCandidate) {
            console.log('iceCandidate', message.iceCandidate);
            if (!peers_conns[from_connid]) {
                await createConnection(from_connid);
            }

            try {
                await peers_conns[from_connid].addIceCandidate(message.iceCandidate);
            } catch (e) {
                console.log(e);
            }
        }
        else if(message.allowShareScreen){
            console.log(message.allowShareScreen);
            const other_id = message.allowShareScreen;
            const shareButton = `
            <button id="remoteStartStopScreenshare_${other_id}" class="btn function_btn"><i class="fas fa-desktop" title="Screen Share"></i></button>
            `;
            await $("#myControlls"+other_id).append(shareButton);
        }
        else if(message.removeShareScreen){
            console.log(message.removeShareScreen);
            const other_id = message.removeShareScreen;
            await $("#myControlls"+other_id).empty();
        }
        
        else if(message.muteAudio){
            console.log(message.muteAudio);
            const connid = message.muteAudio;
            if (_remoteAudioStreams[connid]) {
                _remoteAudioStreams[connid].getTracks().forEach(t => {
                    if (t.stop)
                        t.stop();
                });
                _remoteAudioStreams[connid] = null;
            }
        }

        else if(message.unmuteAudio){
            console.log(message.unmuteAudio);
            const connid = message.unmuteAudio;
            if (!_remoteAudioStreams[connid])
            _remoteAudioStreams[connid] = new MediaStream();

            var _remoteAudioPlayer = document.getElementById('a_' + connid)
            var astream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            _audioTrack = astream.getAudioTracks()[0];
            _remoteAudioStreams[connid].addTrack(_audioTrack);
            _remoteAudioPlayer.srcObject = _audioTrack;
            _remoteAudioPlayer.load();
        }

    }

    function IsConnectionAvailable(connection) {
        if (connection &&
            (connection.connectionState == "new"
                || connection.connectionState == "connecting"
                || connection.connectionState == "connected"
            )) {
            return true;
        }
        else
            return false;
    }
    function closeConnection(connid) {

        peers_con_ids[connid] = null;

        if (peers_conns[connid]) {
            peers_conns[connid].close();
            peers_conns[connid] = null;
        }
        if (_remoteAudioStreams[connid]) {
            _remoteAudioStreams[connid].getTracks().forEach(t => {
                if (t.stop)
                    t.stop();
            });
            _remoteAudioStreams[connid] = null;
        }

        if (_remoteVideoStreams[connid]) {
            _remoteVideoStreams[connid].getTracks().forEach(t => {
                if (t.stop)
                    t.stop();
            });
            _remoteVideoStreams[connid] = null;
        }
    }

    return {
        init: async function (serverFn, my_connid) {
            await _init(serverFn, my_connid);
        },
        ExecuteClientFn: async function (data, from_connid) {
            await exchangeSDP(data, from_connid);
        },
        createNewConnection: async function (connid) {
            await createConnection(connid);
        },
        closeExistingConnection: function (connid) {
            closeConnection(connid);
        }
    }
}());