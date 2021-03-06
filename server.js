
const express = require('express')
const app = express()
const expressLayouts = require('express-ejs-layouts') 
const server = require('http').Server(app)
const io = require('socket.io')(server)
const path = require('path')
const { v4: uuidv4 } = require('uuid')

const mongoose = require('mongoose')
const flash = require('connect-flash')
const session = require('express-session')
const passport = require('passport');

app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')
app.set('layout','layouts/layout')
app.use(expressLayouts)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }))

require('./config/passport')(passport)

// express session 
app.use(session({
    secret: 'kikai-secerate',
    resave: true,
    saveUninitialized: true
}));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  next();
});

app.use(passport.initialize());
app.use(passport.session());

// connect flash session
app.use(flash());

// global vars session
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg')
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.page = '';
    next();
})
//db config
const db = require('./config/keys').MongoURI
mongoose.connect(db, { useNewUrlParser: true,useUnifiedTopology: true})
        .then(()=> console.log('Mongo DB Connected'))
        .catch(err => console.log(err) );

app.use('/', require('./routes/index'))

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> {
    console.log(`Server started at ${PORT}`)
})

var _userConnections =[];

io.on('connection', (socket) => {
    
    console.log(socket.id);

    socket.on('userconnect',(data)=>{
        console.log('userconnect',data.dsiplayName,data.meetingid);

        var other_users = _userConnections.filter(p => p.meeting_id == data.meetingid);

        _userConnections.push({
            connectionId: socket.id,
            user_id: data.dsiplayName,
            meeting_id :data.meetingid
        });

        other_users.forEach(v => {
            socket.to(v.connectionId).emit('informAboutNewConnection',{other_user_id:data.dsiplayName,connId:socket.id});
        });
        
        socket.emit('userconnected',other_users);
        // return other_users;
    });//end of userconnect

    socket.on('exchangeSDP',(data)=>{
        
        socket.to(data.to_connid).emit('exchangeSDP',{message:data.message, from_connid:socket.id});
        
    });//end of exchangeSDP

    socket.on('reset',(data)=>{
        var userObj = _userConnections.find(p => p.connectionId == socket.id);
        if(userObj){
            var meetingid = userObj.meeting_id;
            var list = _userConnections.filter(p => p.meeting_id == meetingid);
            _userConnections = _userConnections.filter(p => p.meeting_id != meetingid);
            
            list.forEach(v => {
                socket.to(v.connectionId).emit('reset');
            });

            socket.emit('reset');
        }
        
    });//end of reset

    socket.on('sendMessage',(msg)=>{
        var userObj = _userConnections.find(p => p.connectionId == socket.id);
        if(userObj){
            console.log(userObj)
            var meetingid = userObj.meeting_id;
            var from = userObj.user_id;
            var list = _userConnections.filter(p => p.meeting_id == meetingid);
            list.forEach(v => {
                socket.to(v.connectionId).emit('showChatMessage',{from:from,message:msg,userID: from,time:getCurrDateTime()});
            });

            socket.emit('showChatMessage',{from:from,message:msg,userID: from,time:getCurrDateTime()});
        }
        
    });//end of reset

    socket.on('disconnect', function() {
        console.log('Got disconnect!');

        var userObj = _userConnections.find(p => p.connectionId == socket.id);
        if(userObj){
            var meetingid = userObj.meeting_id;
        
            _userConnections = _userConnections.filter(p => p.connectionId != socket.id);
            var list = _userConnections.filter(p => p.meeting_id == meetingid);
            
            list.forEach(v => {
                socket.to(v.connectionId).emit('informAboutConnectionEnd',socket.id);
            });
        }
     });
    
})

function getCurrDateTime(){
    let date_ob = new Date();
    let date = ("0" + date_ob.getDate()).slice(-2);
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();
    let hours = date_ob.getHours();
    let minutes = date_ob.getMinutes();
    let seconds = date_ob.getSeconds();
    var dt = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
    return dt;

}

