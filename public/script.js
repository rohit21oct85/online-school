$(document).ready(function(){
    $(document).on('click','#joinMeeting', function(){
        const roomId = document.getElementById("room_id").value;
        if(roomId === ''){
            alert("Please enter room id");
        }else{
            window.location.href = '/start-meeting/' + roomId;
        }
    })

    $(document).on('click',"#LeaveMeeting", function(){
        let msg = confirm('do you want to leave meetings...?');
        if(msg){
            window.location.href = '/dashboard';
        }else{
            return false;
        }
    });
    
})
