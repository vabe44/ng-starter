"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User_1 = require("../entity/User");
const User_2 = require("../models/User");
// const request = require("express-validator");
/**
 * GET /login
 * Login page.
 */
exports.getLogin = (req, res) => {
    if (req.user) {
        return res.redirect("/");
    }
    res.render("account/login", {
        title: "Login",
    });
};
/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    req.assert("email", "Email is not valid").isEmail();
    req.assert("password", "Password cannot be blank").notEmpty();
    req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });
    const errors = req.validationErrors();
    if (errors) {
        req.flash("errors", errors);
        return res.json({ errors });
    }
    const user = yield User_1.User.findOne({ email: req.body.email });
    if (!user) {
        res.status(401).json({ message: "No such user found." });
    }
    if (bcrypt.compareSync(req.body.password, user.password)) {
        // from now on we'll identify the user by the id
        // the id is the only personalized value that goes into our token
        const payload = {
            email: user.email,
            id: user.id,
            username: user.username,
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET);
        res.json({ message: "ok", token });
    }
    else {
        res.status(401).json({ message: "Passwords did not match" });
    }
});
/**
 * GET /logout
 * Log out.
 */
exports.logout = (req, res) => {
    req.logout();
    res.redirect("/");
};
/**
 * GET /signup
 * Signup page.
 */
exports.getSignup = (req, res) => {
    if (req.user) {
        return res.redirect("/");
    }
    res.render("account/signup", {
        title: "Create Account",
    });
};
/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    req.assert("email", "Email is not valid").isEmail();
    req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });
    req.assert("password", "Password must be at least 4 characters long").len({ min: 4 });
    req.assert("confirmPassword", "Passwords do not match").equals(req.body.password);
    req.assert("username", "Username must be at least 4 characters long").len({ min: 4 });
    const errors = req.validationErrors();
    if (errors) {
        req.flash("errors", errors);
        return res.json({ errors });
    }
    const user = new User_1.User();
    user.username = req.body.username;
    user.email = req.body.email;
    user.password = user.hashPassword(req.body.password);
    const alreadyRegistered = yield User_1.User.findOne({ email: req.body.email });
    if (alreadyRegistered) {
        req.flash("errors", { msg: "Account with that email address already exists." });
        return res.json({ message: "Account with that email address already exists." });
    }
    yield user.save();
    if (user.id) {
        const payload = {
            email: user.email,
            id: user.id,
            username: user.username,
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET);
        return res.json({ message: "ok", token });
    }
    else {
        return res.json({ message: "error" });
    }
});
/**
 * GET /account
 * Profile page.
 */
exports.getAccount = (req, res) => {
    res.render("account/profile", {
        title: "Account Management",
    });
};
/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = (req, res, next) => {
    req.assert("email", "Please enter a valid email address.").isEmail();
    req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });
    const errors = req.validationErrors();
    if (errors) {
        req.flash("errors", errors);
        return res.redirect("/account");
    }
    User_2.default.findById(req.user.id, (err, user) => {
        if (err) {
            return next(err);
        }
        user.email = req.body.email || "";
        user.profile.name = req.body.name || "";
        user.profile.gender = req.body.gender || "";
        user.profile.location = req.body.location || "";
        user.profile.website = req.body.website || "";
        user.save((err) => {
            if (err) {
                if (err.code === 11000) {
                    req.flash("errors", { msg: "The email address you have entered is already associated with an account." });
                    return res.redirect("/account");
                }
                return next(err);
            }
            req.flash("success", { msg: "Profile information has been updated." });
            res.redirect("/account");
        });
    });
};
/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = (req, res, next) => {
    req.assert("password", "Password must be at least 4 characters long").len({ min: 4 });
    req.assert("confirmPassword", "Passwords do not match").equals(req.body.password);
    const errors = req.validationErrors();
    if (errors) {
        req.flash("errors", errors);
        return res.redirect("/account");
    }
    User_2.default.findById(req.user.id, (err, user) => {
        if (err) {
            return next(err);
        }
        user.password = req.body.password;
        user.save((err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", { msg: "Password has been changed." });
            res.redirect("/account");
        });
    });
};
/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = (req, res, next) => {
    User_2.default.remove({ _id: req.user.id }, (err) => {
        if (err) {
            return next(err);
        }
        req.logout();
        req.flash("info", { msg: "Your account has been deleted." });
        res.redirect("/");
    });
};
/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
exports.getOauthUnlink = (req, res, next) => {
    const provider = req.params.provider;
    User_2.default.findById(req.user.id, (err, user) => {
        if (err) {
            return next(err);
        }
        user[provider] = undefined;
        user.tokens = user.tokens.filter((token) => token.kind !== provider);
        user.save((err) => {
            if (err) {
                return next(err);
            }
            req.flash("info", { msg: `${provider} account has been unlinked.` });
            res.redirect("/account");
        });
    });
};
/**
 * GET /reset/:token
 * Reset Password page.
 */
exports.getReset = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect("/");
    }
    User_2.default
        .findOne({ passwordResetToken: req.params.token })
        .where("passwordResetExpires").gt(Date.now())
        .exec((err, user) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.flash("errors", { msg: "Password reset token is invalid or has expired." });
            return res.redirect("/forgot");
        }
        res.render("account/reset", {
            title: "Password Reset",
        });
    });
};
/**
 * POST /reset/:token
 * Process the reset password request.
 */
exports.postReset = (req, res, next) => {
    req.assert("password", "Password must be at least 4 characters long.").len({ min: 4 });
    req.assert("confirm", "Passwords must match.").equals(req.body.password);
    const errors = req.validationErrors();
    if (errors) {
        req.flash("errors", errors);
        return res.redirect("back");
    }
    async.waterfall([
        // tslint:disable-next-line:ban-types
        function resetPassword(done) {
            User_2.default
                .findOne({ passwordResetToken: req.params.token })
                .where("passwordResetExpires").gt(Date.now())
                .exec((err, user) => {
                if (err) {
                    return next(err);
                }
                if (!user) {
                    req.flash("errors", { msg: "Password reset token is invalid or has expired." });
                    return res.redirect("back");
                }
                user.password = req.body.password;
                user.passwordResetToken = undefined;
                user.passwordResetExpires = undefined;
                user.save((err) => {
                    if (err) {
                        return next(err);
                    }
                    req.logIn(user, (err) => {
                        done(err, user);
                    });
                });
            });
        },
        // tslint:disable-next-line:ban-types
        function sendResetPasswordEmail(user, done) {
            const transporter = nodemailer.createTransport({
                auth: {
                    pass: process.env.SENDGRID_PASSWORD,
                    user: process.env.SENDGRID_USER,
                },
                service: "SendGrid",
            });
            const mailOptions = {
                from: "express-ts@starter.com",
                subject: "Your password has been changed",
                text: `Hello,\n\nThis is a confirmation that the password for \
        your account ${user.email} has just been changed.\n`,
                to: user.email,
            };
            transporter.sendMail(mailOptions, (err) => {
                req.flash("success", { msg: "Success! Your password has been changed." });
                done(err);
            });
        },
    ], (err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
};
/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getForgot = (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect("/");
    }
    res.render("account/forgot", {
        title: "Forgot Password",
    });
};
/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postForgot = (req, res, next) => {
    req.assert("email", "Please enter a valid email address.").isEmail();
    req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });
    const errors = req.validationErrors();
    if (errors) {
        req.flash("errors", errors);
        return res.redirect("/forgot");
    }
    async.waterfall([
        // tslint:disable-next-line:ban-types
        function createRandomToken(done) {
            crypto.randomBytes(16, (err, buf) => {
                const token = buf.toString("hex");
                done(err, token);
            });
        },
        // tslint:disable-next-line:ban-types
        function setRandomToken(token, done) {
            User_2.default.findOne({ email: req.body.email }, (err, user) => {
                if (err) {
                    return done(err);
                }
                if (!user) {
                    req.flash("errors", { msg: "Account with that email address does not exist." });
                    return res.redirect("/forgot");
                }
                user.passwordResetToken = token;
                user.passwordResetExpires = Date.now() + 3600000; // 1 hour
                user.save((err) => {
                    done(err, token, user);
                });
            });
        },
        // tslint:disable-next-line:ban-types
        function sendForgotPasswordEmail(token, user, done) {
            const transporter = nodemailer.createTransport({
                auth: {
                    pass: process.env.SENDGRID_PASSWORD,
                    user: process.env.SENDGRID_USER,
                },
                service: "SendGrid",
            });
            const mailOptions = {
                from: "hackathon@starter.com",
                subject: "Reset your password on Hackathon Starter",
                text: `You are receiving this email because you (or someone else) \
        have requested the reset of the password for your account.\n\n
          Please click on the following link, or paste this into your browser to complete the process:\n\n
          http://${req.headers.host}/reset/${token}\n\n
          If you did not request this, please ignore this email and your password will remain unchanged.\n`,
                to: user.email,
            };
            transporter.sendMail(mailOptions, (err) => {
                req.flash("info", { msg: `An e-mail has been sent to ${user.email} with further instructions.` });
                done(err);
            });
        },
    ], (err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/forgot");
    });
};
//# sourceMappingURL=user.js.map