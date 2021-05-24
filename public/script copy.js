const socket = io.connect('/')
const videoGrid = document.getElementById('video-grid')
const PORT = 3000;
const myPeer = new Peer({host:'peerjs-server.herokuapp.com', secure:true, port:443})

const myVideo = document.createElement('video')

const peers = {}
const otherUsers = [];
let tracks;
let videoTracks;
    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    }).then( stream => {
        tracks = stream.getAudioTracks();
        videoTracks = stream.getVideoTracks();
        addVideoStream(myVideo, stream)
    
        myPeer.on('call', call => {
            call.answer(stream)
            const video = document.createElement('video')
            call.on('stream', userVideoStream => {
                addVideoStream(video, userVideoStream)
            })
        })
        socket.on('shareScreen', screenData => {
            const share = document.createElement('video')
            addVideoStream(share, screenData)
            
        })
        socket.on('user-connected', userId => {
            connectToNewUser(userId, stream)        
        })

        socket.on('user-disconnected', userId => {
            if(peers[userId]) {
            peers[userId].close()
            }
        });
     
        $('html').keydown((e) => {
            let text = e.target.value;
            if(e.which === 13 && text.length !== 0){
                socket.emit('message', text)
                $(".chat_messages").append(`<li class='message meMessage'>Me: ${text}</li>`);
                $("#chat_input").val('');
            }
        })

        socket.on('createMessage', message => {
            console.log('this is message from server ' + message)
            $(".chat_messages").append(`<li class='message meMessage'>User: ${message}</li>`);
        })

        
        
    
})

myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id)
})

function addVideoStream(video, stream){
    video.srcObject = stream
    video.addEventListener('loadedmetadata',() => {
        video.play()
    })
    videoGrid.append(video)
}

function connectToNewUser(userId , stream){
    const call = myPeer.call(userId, stream)
    const video = document.createElement('video')
    otherUsers.push(userId);  
    console.log("Other Users " + otherUsers)
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream)
    })
    call.on('close', () => {
        video.remove();
    })
    peers[userId] = call

}

const scrollToBottom = () => {
    let d = $(".main__chat_window");
    d.scrollBottom(d.prop("scrollHeight"));
}

const muteUnmute = () => {
    const enabled = tracks[0].enabled;
    if(enabled){
        tracks[0].enabled = false;
        setUnMuteButton();
    }else{
        setMuteButton();
        tracks[0].enabled = true;
    }
}

const setMuteButton = () => {
    const html = `
        <i class="fa fa-microphone"></i>
        <span>Mute</span>
    `;
    document.querySelector('.main_mute_button').innerHTML = html;
}

const setUnMuteButton = () => {
    const html = `
        <i class="unmute fa fa-microphone-slash"></i>
        <span class="unmute">UnMute</span>
    `;
    document.querySelector('.main_mute_button').innerHTML = html;
}

const pausePlayVideo = () => {
    const enabled = videoTracks[0].enabled;
    if(enabled){
        videoTracks[0].enabled = false;
        setVideoPauseButton();
    }else{
        setVideoPlayButton();
        videoTracks[0].enabled = true;
    }   
}


const setVideoPauseButton = () => {
    const html = `
        <i class="fas fa-video-slash unmute"></i>
        <span class="unmute">Play Video</span>
    `;
    document.querySelector('.main_video_button').innerHTML = html;
}

const setVideoPlayButton = () => {
    const html = `
        <i class="fas fa-video"></i>
        <span>Stop Video</span>
    `;
    document.querySelector('.main_video_button').innerHTML = html;
}

const LeaveMeeting = () => {
    window.location.href = '/host-meeting';
}

const gdmOptions = {
    video: {
      cursor: "always"
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 44100
    }
  }
const startElem = document.getElementById("startCapture");  
const stopElem = document.getElementById("stopCapture");  
startElem.addEventListener('click', () => {
    $("#startCapture").css({ display: 'none'});
    $("#stopCapture").css({ display: 'flex'});
    startCatpture();
}, false);

stopElem.addEventListener('click', () => {
    $("#startCapture").css({ display: 'flex'});
    $("#stopCapture").css({ display: 'none'});
    stopCatpture();
}, false);
const startCatpture = async (gdmOptions) => {
    try {
        const shareScreenData = await navigator.mediaDevices.getDisplayMedia(gdmOptions);
        const video = document.createElement('video')
        const videoData = new MediaStream(shareScreenData);
        // socket.emit('shareScreen', videoData);
        addVideoStream(video, videoData)
        otherUsers.map( userId => {
           userId.addTrack(videoData)     
        })
    } catch (error) {
        console.log('Error logged !!!' + error)
    }
}
const stopCatpture = async () => {
    await navigator.mediaDevices.getUserMedia({video: true, audio: true}).then( stream => {
        myVideo.srcObject = stream;
    });
}

