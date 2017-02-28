//load env variables
require('dotenv').load();

var express = require('express');
var app = express();
var path = require('path');

//db
var mongoose = require('mongoose');
var User = require('./models/Users');
var Bar = require('./models/Bars');

//auth
var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;
var session = require('express-session');
var crypto = require('crypto');
var OAuth = require('oauth-1.0a');

//parsing information
var bodyParser = require('body-parser');
var async = require('async');

//for scheduling the drop of the db. the whole DB is dropped, instead of just updating the people property, due to keeping the other information in the doc up to date via yelp api.
var schedule = require('node-schedule');

//flash messages
var flash = require('connect-flash');
app.use(flash());

//yelp api request
var request = require('request');

//connect to db
mongoose.connect(process.env.DB_HOST);

//passport setup for user authentication.
app.use(session({secret : process.env.PASSPORTSECRET}));
app.use(passport.initialize());
app.use(passport.session());

var oauth = OAuth({
    consumer: {
        key: process.env.YELP_KEY,
        secret: process.env.YELP_SECRET
    },
    signature_method: 'HMAC-SHA1',
    hash_function: function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    }
});

app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

//passport interaction with facebook auth servers
passport.use(new Strategy({
    clientID: process.env.ID,
    clientSecret: process.env.SECRET,
    callbackURL:  'https://nightlife-jakecasey.c9users.io/login/facebook/callback',
    profileFields: ['email', 'name']
  },
  function(accessToken, refreshToken, profile, done) {
        //find or create a new user
        User.findOne({facebook : profile.id}, function(err, user){
            if(err){ return done(err);}
            if(!user){
                
                var newUser = new User();
                
                newUser.name = profile.name.givenName + ' ' + profile.name.familyName;
                newUser.email = profile.emails[0].value;
                newUser.facebook = profile.id;
                
                newUser.save(function(err){
                    if(err){return err;}
                    console.log('user created!')
                    return done(err, newUser);
                })
            }
                else {
                    console.log('user found!')
                    return done(err, user);
                }
            })
        })
  );

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

//use ejs for view engine and templating 
app.set('view engine', 'ejs');

//allow access to views, client side js and css.
app.set('views', path.join(__dirname, '/views'));
app.use(express.static(__dirname + '/'));


app.get('/', function(req, res){
     var barArray = [];
    
    //this sets the session to false before a user has decided if they're going to a bar or not.
    //this is up here instead of in the callback because I don't want it to be checked all the time, just once on each
    //request.
    if(typeof req.session.going === "undefined"){
            req.session.going = false;
        }
    if(typeof req.session.barID === "undefined"){
        req.session.barID = '';
    }
    //this sets the empty non searched state of the index page.
    if (!req.session.bars){

        res.render('index', {bars : barArray})
    }
    else {
        updateanddisplayBars(req.session.bars, cb);
    }
    
    function updateanddisplayBars(bars, cb){
        async.each(bars, function(barID){
            
            Bar.findById(barID, function(err, bar){
                if(err){return err;}
                
                barArray.push(bar);
                cb(barArray);
                
            });
        })
    };
    
    //bars were being asynchronously pushed to the bar array, causing unpredictable list orders on index page.
    // this function sorts the array of bar objects before displaying on index page.
    function sortbars(bars){
      
        var sorted = bars.sort(function(a,b){
        var  Aname = a.name.toUpperCase();
        var Bname = b.name.toUpperCase();
          
          if (Aname < Bname) {
            return -1;
          }
          if (Aname > Bname) {
            return 1;
          }
          
          return 0;
         
        });
        
        return sorted; 
        
    };
    
    function cb(bars){
        if (barArray.length == req.session.bars.length){
        barArray = sortbars(barArray); 
        res.render('index', {bars : barArray, auth : req.isAuthenticated(), going : req.session.going, barID : req.session.barID, messages : req.flash()});
        }
    }
    
    
});

app.post('/search', function(req, res){
   
   req.session.bars = [];
   
    var city = encodeURIComponent(req.body.city);
    var request_data = {
    url: 'https://api.yelp.com/v2/search?term=bar&radius_filter=20000&location=' + city ,
    method: 'GET'
    };
    //set tokens for oauth 
    var token = {
        key: process.env.YELP_TOKEN_KEY,
        secret: process.env.YELP_TOKEN_SECRET
    }
  
//get list of bars for search query
  request({
    url: request_data.url,
    method: request_data.method,
    headers: oauth.toHeader(oauth.authorize(request_data, token))
}, function(error, response, body) {
    if(error){return error}
    
    var data = JSON.parse(body);
    var bars = [];
  
    function findOrCreateBar(data, cb) { 
        async.each(data.businesses, function(business){
            //find or create bar
            
            Bar.findOne({yelpID : business.id}, function(err, bar){
                if(err){return err;}
                if (!bar){
                        var newBar = new Bar({
                        
                            yelpID : business.id,
                            name : business.name,
                            people : 0,
                            snippetText : business.snippet_text
                            
                        })
                        
                        //save new bar, push to bar array, use callback.
                        newBar.save(function(err){
                    
                            if(err){return err}
                            
                            bars.push(newBar._id);
                            cb(bars);
                        })
                    
                    }
                    else {
                        //if bar is found, push to bar array, use callback.
                        
                        bars.push(bar._id);
                        cb(bars);
                    }
            })
        })
    }


    
    //finds or creates bar, with callback to check when findOrCreate has populated the search.
    findOrCreateBar(data, function(bars){
        if(bars.length == Object.keys(data.businesses).length){
        req.session.bars = bars;
        bars = [];
        res.redirect('/');
        }
    });
    

    
});
    
});

//path for incrementing people on a bar entry.
app.get('/going/:id', function(req, res){
    var barID = req.params.id;
    
    Bar.findOne({_id : barID}, function(err, bar){
       if(err){ return err;}
       bar.increment();
       req.session.going = true;
       req.session.barID = bar._id;
       req.flash('success', 'Have fun tonight!')
       res.redirect('/');
    });
    
    
});
//path for decrement
app.get('/notgoing/:id', function(req, res){
    var barID = req.params.id;
    
    Bar.findOne({_id : barID}, function(err, bar){
       if(err){ return err;}
       bar.decrement();
       req.session.going = false;
       req.session.barID = '';
       req.flash('err', "I'm not going there...")
       res.redirect('/');
    });
    
    
});


//scheduled job to reset all bars to 0 people at 2am
var rule = new schedule.RecurrenceRule();

rule.hour = 2;
rule.minute = 0;

var j = schedule.scheduleJob(rule, function(){
  Bar.collection.drop();
});



//authentication login
app.get('/login', passport.authenticate('facebook', { scope: [ 'email' ] }));


//facebook callback
app.get('/login/facebook/callback', 
    passport.authenticate('facebook', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/');
  });
    
app.get('/logout', function(req, res){
    req.logout();
    //req.flash('success', "You've been logged out successfully.")
    res.redirect('/'); 
    
    
});



// server listening
app.listen(process.env.PORT, function(){
    
    console.log('running');
    
});

module.exports = app;