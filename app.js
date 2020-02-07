const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const constants = require("./constants");

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  name:'sid',
  resave: false,
  saveUninitialized: false,
  secret:'canYouKeepMySecretPlease?',
  cookie: {
    sameSite:true,
    secure: false//todo true
  }
}));

function requireAuthorization(req, res, next) {
  if(req.session.userType != 'signed') {
    req.session.errorMessage = 'Greška! Nemate pristup traženom dokumentu!'
    res.redirect('/login');
  } else {
    next();
  }
}

function requireNOTauthorized(req, res, next) {
  if(req.session.userType == 'signed') {
    res.redirect('/');
  } else {
    next();
  }
}

// GET /login 
app.get('/login', requireNOTauthorized, (req, res, next) => {
  res.render('login', {title: 'Prijavi se', message: req.session.errorMessage});
  req.session.errorMessage = null;
});

// POST /login
app.post('/login', requireNOTauthorized, (req, res, next) => {
  const {username, password} = req.body;
  if(username != null && password != null) {
    const user = constants.USERS_ARRAY.find(user => user.username === username);
    if(user && user.password === password) {
      req.session.userType = 'signed'; 
      req.session.name=`${user.name} ${user.lastName}`;
      return res.redirect('/');
    } else {
      req.session.errorMessage = 'Greška! Korisničko ime i lozinka se ne podudaraju!';
      return res.redirect('/login');
    }
  }
  res.sendStatus(400);
});

// GET / <-- Homepage
app.get('/', requireAuthorization,  (req, res, next) => {
  res.render('index', {
    tite: 'VTS Restaurant',
    data: req.session.name
  });
});

//GET /logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if(err) {
      return res.redirect('/');
    }
    res.clearCookie('sid');
    res.redirect('/login');
  })
});

app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  if(err.name === 'UnauthorizedError') {
    return res.status(403).send('Greska pri autorizaciji ('+err.message+')');
  }
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;