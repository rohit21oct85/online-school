const express = require('express')
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const passport = require('passport')
const { v4: uuidv4 } = require('uuid')
const {ensureAuthenticated} = require('../config/auth');

// models
const User = require('../models/User')
const Meeting = require('../models/Meeting'); 

router.get('/', (req, res) => {
    res.redirect('login');
})

router.get('/login', (req, res) => {
    res.render('login',{ user: ''});
})


router.get('/register', (req, res) => {
    res.render('register',{ user: ''})
})


router.post('/register', (req, res) => {
    const {name,email,mobile,password,confirm_pass} = req.body
    const errors = []
    if(!name || !email || !mobile || !password || !confirm_pass){
        errors.push({ msg: 'Please fill all the fields'})
    }
    if(password !== confirm_pass){
        errors.push({ msg: 'Password does not match'})
    }

    if(mobile.length < '10' || mobile.length > '10'){
        errors.push({ msg: 'Please enter valid number'})
    }

    if(errors.length > 0)
    {
        res.render('register',{name,email,mobile,password,confirm_pass,errors,user:''})
    }else{
        User.findOne({ email: email})
            .then( user => {
                if(user){
                    errors.push({ msg: 'Email is already registered'})
                    res.render('register',{name,email,mobile,password,confirm_pass,errors,user:''})
                }else{
                    const newUser = new User({
                        name,email,mobile,password
                    })
                    // hash password 
                    bcrypt.genSalt(10, (err, salt) => {
                        bcrypt.hash(newUser.password, salt, (err, hash) => {
                            if(err) throw err;
                            //set hashed password 
                            newUser.password = hash;
                            newUser.save()
                            .then( user => {
                                req.flash('success_msg','You are now logged in and can login');
                                res.redirect('/login');
                            }).catch(err => {
                                console.log(err);
                            })
                        })
                    })
                    // console.log(newUser);
                    // res.send('hello')
                }
            }).catch(err => {
                console.log(err)
                errors.push({ msg: 'Email is already registered'})
                res.render('register',{name,email,mobile,password,confirm_pass,errors,user:''})
            })
    }
})


router.post('/login', (req, res, next) => {
    passport.authenticate('local', { 
        failureRedirect: '/login',
        successRedirect: '/dashboard',
        failureFlash: true 
    })(req,res, next);
});

router.get('/dashboard', ensureAuthenticated, (req, res) => {
    Meeting.find({'room_host': req.user._id}).then( meeting => {
        res.render('dashboard',{user: req.user,meetings: meeting})
    }).catch(err => { console.error(err)})

});

router.get('/my-profile', ensureAuthenticated, (req, res) => {
    res.render('profile',{user: req.user})
});



router.post('/create-meeting',ensureAuthenticated, (req, res) => {
    var room_name = req.body.room_name;
    var room_id = uuidv4();

    var host_id = req.body.user_id;
     const errors = []
    if(!room_name ){
        errors.push({ msg: 'Please fill room name'})
    }
    if(errors.length > 0)
    {
        res.render('host-meeting',{room_name,errors,user:''})
    }else{
        Meeting.findOne({ room_id: room_id})
               .then( meeting => {
                    if(meeting){
                        errors.push({ msg: 'Meeting Already Created'})
                        res.render('register',{room_name,errors,user:''})
                    }else{
                        const newMeeting = new Meeting({
                            room_name: room_name,
                            room_id: room_id,
                            room_host: host_id,
                        });
                        newMeeting.save()
                        .then( user => {
                            req.flash('success_msg','Room Created Successfully');
                            res.redirect('/start-meeting/'+room_id);
                            
                        }).catch(err => {
                            console.log(err);
                        })
                        
                    }
               }).catch(err => {
                   console.log(err)
               })
    }
});


router.get('/start-meeting/:room', ensureAuthenticated, async (req, res) => {
    const room_id = req.params.room;
    let rooms;
    Meeting.findOne({ room_id: room_id}).then(meeting => {
        res.render('room',{roomId: req.params.room, user:req.user, meeting: meeting})
    }).catch(err => { console.log(err.message)});
})

router.get('/delete-meeting/:id', ensureAuthenticated, async (req, res) => {
    const id = req.params.id;
    
    await Meeting.deleteOne({ _id: id}).then(meeting => {
        req.flash('success_msg','Your meeting deleted successfully');
                                
        res.redirect('/dashboard');
    }).catch(err => { console.log(err.message)});
})


router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success','You are logged out');
    res.redirect('/login');
});



module.exports = router;