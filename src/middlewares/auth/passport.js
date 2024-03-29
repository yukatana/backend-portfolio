// Passport import, initialization, and configuration
const passport = require('passport')
const { loginStrategy, signupStrategy } = require('../../middlewares/auth/passportStrategies')
const LocalStrategy = require('passport-local').Strategy
passport.use('login', new LocalStrategy(loginStrategy))
passport.use('signup', new LocalStrategy(
    {passReqToCallback: true},
    signupStrategy)
)

// Types and User schema to be used by deserialize
const { Types } = require('mongoose')
const User = require('../../databases/mongoDB/models/user')
passport.serializeUser((user, done) => {
    done(null, user._id)
})
passport.deserializeUser(async (id, done) => {
    id = Types.ObjectId(id)
    const user = await User.findById(id)
    done(null, user)
})

// Wrappers for exported strategies
const passportSignup = passport.authenticate('signup',
    {failureRedirect: '/auth/signup/error'})

const passportLogin = passport.authenticate('login',
    {failureRedirect: '/auth/login/error'})

module.exports = {
    passport,
    passportSignup,
    passportLogin
}