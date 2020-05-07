const db = require('../config/db');
const passport = require('passport');
const { v4: uuidv4 } = require('uuid');
const emailValidator = require('../util/email-validator');
const bcrypt = require('bcryptjs');

// Handle showing student login page on GET
exports.login_get = (req, res, next) => {
    let redirectUrl = req.query.redirectUrl;

    if (!redirectUrl) {
        redirectUrl = req.get('Referrer');
    }
    res.render('studentLogin', {
        redirectUrl: redirectUrl
    });
}

// Handle student login authentication via Passport API on POST
exports.login_post = (req, res, next) => {
    let redirectUrl = req.query.redirectUrl;

    // Lazy login; set redirect url so that user is redirected back to appropriate page
    if (redirectUrl == '' || redirectUrl == undefined) {
        redirectUrl = '/user/dashboard';
    }
    // Proceed with login authentication
    passport.authenticate('student-login', {
        successRedirect: redirectUrl,
        failureRedirect: '/user/login',
        failureFlash: true,
        badRequestMessage: 'Please fill in all fields'
    })(req, res, next);

}

// Handle showing registration page for user on GET
exports.register_get = (req, res, next) => {
    res.render('register');
}

// Handle registration for student on POST
exports.register_post = (req, res, next) => {
    let { email, username, password, confirmPassword, terms, captcha } = req.body;
    let uid = uuidv4();
    ///*
    let regError = [];
    let dataPassedBack = {};

    // Check if required fields are filled
    if (!email || !username || !password || !confirmPassword) {
        regError.push({ message: 'Please fill in all fields' });
    }
    // Check if terms and conditions is checked
    else if (!terms) {
        regError.push({ message: 'Please indicate that you agree to the terms and conditions.' });
    }
    // Check if captcha is checked
    else if (!captcha) {
        regError.push({ message: 'Please indicate that you are not a robot.' });
    }
    // Validate input fields
    else {
        // Check if email is valid (i.e. contains a valid domain and email is <= 40 characters)
        if (!(emailValidator.validate(email)) || email.length > 40) {
            regError.push({ message: 'Invalid email' });
        }
        // Check if password is between 8-20 characters
        if (password.length < 8 || password.length > 20) {
            dataPassedBack.username = username;
            dataPassedBack.email = email;
            regError.push({ message: 'Password must be between 8-20 characters' });
        }
        // Check if passwords match
        if (password !== confirmPassword) {
            dataPassedBack.username = username;
            regError.push({ message: 'Passwords do not match' });
        }
    }

    // Render registration error messages if necessary
    if (regError.length > 0) {
        res.render('register', {
            regError,
            dataPassedBack
        });
    }
    // Input validation passed
    else {
        // Check if username already exists
        db.query("SELECT * FROM users WHERE username = ?", [username], (err, result) => {
            if (err) throw err;

            if (result.length > 0) {
                regError.push({ message: 'Such user already exists. Please log in.' });
                res.render('studentLogin', {
                    regError
                });
            }
            else {
                // Create a hashed password
                bcrypt.genSalt(10, (err, salt) => {
                    if (err) throw err;

                    bcrypt.hash(password, salt, (err, hash) => {
                        if (err) throw err;

                        password = hash;

                        // Insert new user into database
                        db.query("INSERT INTO users (id, email, username, password) VALUES (?, ?, ?, ?)", [uid, email, username, password], (error, result) => {
                            if (err) throw err;

                            req.flash('success', 'Successfully registered, please login.');
                            res.redirect('/user/login');
                        });
                    });
                });
            }
        });
    }
    //*/
}

// Handle student logout on GET
exports.logout = (req, res, next) => {
    req.logout();
    req.flash('success', 'You are logged out');
    res.redirect('/');
}

// Display student's dashboard page on GET
// Retrieve list of sales item listed by the student that is logged in
// Retrieve list of inquiries of their own items and other items
exports.dashboard = (req, res, next) => {
    let loggedInUser = req.user.id;
    let post = [];

    //retrieve posts made by the user
    let sql = "SELECT * from posts where user = ?"

    db.query(sql, loggedInUser, (error, result) => {
        if (error) throw error;

        let posts = result;

        console.log(posts);

        if (posts != undefined) {
            console.log(posts.length);
            for (let i = 0; i < posts.length; i++) {
                post.push(posts[i]);
            }
        }

        res.render('studentDashboard', {
            product: post
        });
    });
}