import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import cors from "cors";
import dbConnect from "./db/dbConnect.js";
import NxentradeUser from "./db/nxentradeUser.js";

dotenv.config();
const app = express();
dbConnect();
const saltRounds = 6;

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const companyEmail = process.env.nxentradeemail;
const companyPass = process.env.nxentradepassword;

const transport = nodemailer.createTransport({
  host: "mail.privateemail.com",
  port: 465,
  secure: true,
  auth: {
    user: companyEmail,
    pass: companyPass,
  },
});

app.get("/", (req, res, next) => {
  res.json({
    message: "Hey! This is your QuivasFinance application server response!",
  });
  next();
});

app.post("/sign-up", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const token = jwt.sign(
    {
      email: email,
      tokenName: password,
    },
    process.env.nxentradesecret
  );

  bcrypt.hash(password, saltRounds, function (err, hash) {
    if (err) {
      return res.status(400).send({
        message: "Password was not secured successufully, try again",
      });
    } else {
      const newUser = new NxentradeUser({
        email: email,
        password: hash,
        confirmationCode: token,
      });

      newUser.save(function (err) {
        if (err) {
          return res.status(401).send({
            message: "Something went wrong. Please try again.",
          });
        }

        transport.sendMail({
          from: companyEmail,
          to: email,
          subject: "Account Verification",
          html: `<a href=https://nxentrade.com/emailverification/${newUser.confirmationCode}>Verify account</a>`,
        });

        res.status(201).send({
          message: "User created successfully",
          email: email,
        });
      });
    }
  });
});

app.get("/verifying/:token", (req, res) => {
  const confirmationCode = req.params.token;

  NxentradeUser.findOne({ confirmationCode: confirmationCode })
    .then((user) => {
      user.status = "Active";

      user
        .save()
        .then(() => {
          return res
            .status(200)
            .send({ message: "Successful, you can now login" });
        })
        .catch((error) => {
          return res.status(401).send({
            message: "Server is currently down, try again in few minutes.",
            error,
          });
        });
    })
    .catch((err) => {
      return res.status(401).send({
        message: "token has expired or is incorrect.",
        err,
      });
    });
});

app.post("/sign-in", (req, res) => {
  NxentradeUser.findOne({ email: req.body.email })
    .then((user) => {
      if (user.status === "Active") {
        bcrypt
          .compare(req.body.password, user.password)
          .then((passwordCheck) => {
            if (!passwordCheck) {
              return res.status(401).json({
                message: "Incorrect password.",
              });
            } else {
              res.status(200).send({
                message: "Login Successful.",
                userId: user._id,
                email: user.email,
              });
            }
          })
          .catch((errors) => {
            res.status(402).send({
              message: "Incorrect password.",
              errors,
            });
          });
      } else {
        transport.sendMail({
          from: companyEmail,
          to: email,
          subject: "Account Verification",
          html: `<a href=https://nxentrade.com/emailverification/${newUser.confirmationCode}>Verify account</a>`,
        });

        res.status(200).send({
          message:
            "Email verification pending, check your email we sent you a link.",
        });
      }
    })
    .catch((e) => {
      res.status(404).send({
        message: "Email not found.",
        e,
      });
    });
});

app.get("/authenticating/:id", (req, res) => {
  const id = req.params.id;

  NxentradeUser.findOne({ id: id })
    .then((user) => {
      res.status(200).send({
        message: "Successful.",
        email: user.email,
      });
    })
    .catch((err) => {
      res.status(404).send({
        message: "Id not found.",
        err,
      });
    });
});


export default app;
