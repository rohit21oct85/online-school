var MyApp = (function(){

var socket = null;
var socker_url = 'https://online-schools.herokuapp.com/';
var meeting_id = '';
var user_id = '';

function init(uid,mid){
    user_id = uid;
    meeting_id = mid;
    $('#meetingname').text(meeting_id);
    $('#me h2').text(user_id + '(Me)');
    document.title = user_id;

    SignalServerEventBinding();
    EventBinding();
}

function SignalServerEventBinding(){
    // Set up the SignalR connection
    //$.connection.hub.logging = true;

    //_hub = $.connection.webRtcHub;
    //$.connection.hub.url = _hubUrl;

    socket = io.connect(socker_url);

    var serverFn = function (data, to_connid) {
        socket.emit('exchangeSDP',{message:data,to_connid:to_connid});
        //_hub.server.exchangeSDP(data, to_connid);
    };

    socket.on('reset',function () {
        window.location.href = '/dashboard';
    });

    socket.on('exchangeSDP', async function (data) {
        //alert(from_connid);
        await WrtcHelper.ExecuteClientFn(data.message, data.from_connid);
    });

    socket.on('informAboutNewConnection',function (data) {
        AddNewUser(data.other_user_id, data.connId);
        WrtcHelper.createNewConnection(data.connId);
    });

    socket.on('informAboutConnectionEnd',function (connId) {
        $('#' + connId).remove();
        WrtcHelper.closeExistingConnection(connId);
        var count = $("#right_thumbnails_div").children().length;
        $(".num_of_users").text(count);
        if(count == 1){
            $("#me").parent().addClass('col-md-12 p-0');
        }else{
            $("#me").parent().removeClass('col-md-12 p-0');
        }
    });

    socket.on('showChatMessage', function (data) {
        var user_id = $("#userId").val();
        const {message, userId} = data.message;
        if(user_id === userId){
            var div = `
            <div class="msg_div msg_right">
                <div class="user_name">${data.from} Me</div>
                <div class="msg_box">${message}</div>
                <div class="date">Thu</div>
            </div>
            `;
        }else{
            var div = `
            <div class="msg_div">
                <div class="user_name">${data.from}</div>
                <div class="msg_box">${message}</div>
                <div class="date">Thu</div>
            </div>
            `;
        }
        $('#messages').append(div);
    });

    socket.on('connect', () => {
        if(socket.connected){
            WrtcHelper.init(serverFn, socket.id);

            if (user_id != "" && meeting_id != "") {
                
                socket.emit('userconnect',{dsiplayName:user_id, meetingid:meeting_id});
                //_hub.server.connect(user_id, meeting_id)
                
            }
        }
    });

    socket.on('userconnected',function(other_users){
        $('#divUsers .other').remove();
        if(other_users) {
            for (var i = 0; i < other_users.length; i++) {
                AddNewUser(other_users[i].user_id, other_users[i].connectionId);
                WrtcHelper.createNewConnection(other_users[i].connectionId);
            }
        }
        
        $(".toolbox").show();
        $('#messages').show();
        $('#divUsers').show();
    });
}

function EventBinding(){
    $('#btnResetMeeting').on('click', function () {
        let msg = confirm('do you want to end meetings...?');
        if(msg){
            socket.emit('reset');
        }else{
            return false;
        }

    });

    $('#btnsend').on('click', function () {
        let message = $('#msgbox').val();
        let userId = $('#userId').val();
        let data = {message: message, userId: userId}
        if(message.length != 0){
            socket.emit('sendMessage',data);
            $('#msgbox').val('');
        }
    });

    $('#divUsers').on('dblclick', 'video', function () {
        this.requestFullscreen();
    });
}

function AddNewUser(other_user_id, connId) {
    var cuid = localStorage.getItem('user_id');
    var rowner = localStorage.getItem('owner_id');
    var $newDiv = $('#otherTemplate').clone();
    $newDiv = $newDiv.attr('id', connId).addClass('other');
    $newDiv.find('h2').text(other_user_id);
    $newDiv.find('video').attr('id', 'v_' + connId);
    $newDiv.find('audio').attr('id', 'a_' + connId);
    // $newDiv.find('button#audioBtn').attr('id', "aB___"+connId);
    $newDiv.find('button#rsBtn').attr('id', "rsBtn___"+connId);
    $newDiv.find('p').attr('id', 'u_' + connId).text(other_user_id.substring(0,1).toUpperCase());
    $newDiv.show();
    $('#right_thumbnails_div').show();
    $('#divUsers #right_thumbnails_div').append($newDiv);
    var count = $("#right_thumbnails_div").children().length;
    $(".num_of_users").text(count);
    if(cuid !== rowner){
        // $("#aB___"+connId).css({'display': 'none'});
        $("#rsBtn___"+connId).css({'display': 'none'});
    }
    if(count > 1){
        $("#me").parent().removeClass('col-md-12 p-0');
    }
                
}

return {

    _init: function(uid,mid){
        init(uid,mid);
    }

};

}());