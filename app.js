//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
var GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const { config } = require('dotenv');


const app = express();

app.use(session({
    secret: "Our little Secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: "249299200671-qlhek3lmvfjddide0d8b4pobc83463nl.apps.googleusercontent.com",
    clientSecret: "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",
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render("home");
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }));
    
    app.get('/auth/google/secrets', 
        passport.authenticate('google', { failureRedirect: '/login' }),
        function(req, res) {
          // Successful authentication, redirect home.
          res.redirect('/secrets');
        });

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get('/secrets', async (req, res) => {
  try {
    const usersWithSecret = await User.find({ secret: { $ne: null } });
    res.render('secrets', { usersWithSecret: usersWithSecret });
  } catch (err) {
    console.log(err);
  }
});


app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
      res.render("submit");
  } else {
      res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;

  console.log(req.user.id);

  User.findById(req.user.id)
    .then(function(foundUser){
      if (foundUser) {
        foundUser.secret = submittedSecret;
        return foundUser.save();
      }
    })
    .then(function(){
      res.redirect("/secrets");
    })
    .catch(function(err){
      console.log(err);
    });
});


app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { 
        console.log(err);
       } else{ 
        res.redirect('/');
    }   
    });
  });


app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password)
    .then(function(user){
        passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets");
        })
    }) 
    .catch(function(err){
        console.log(err);
        res.redirect("/register");
    });
});

app.post("/login", function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets"); 
            });
        }
    });
});


app.listen(3000, function(){
    console.log("Server started on 3000 port")
})