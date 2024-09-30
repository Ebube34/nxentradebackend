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
  const name = req.body.name;

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
        message: "Password was not secured successufully, try again.",
      });
    } else {
      const newUser = new NxentradeUser({
        email: email,
        password: hash,
        confirmationCode: token,
        username: name
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
          html: `<section style="background-color:#ffffff; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif">
            <div style="margin:0 auto;
      padding:20px 0 48px"> 
      <p style="font-size:16px;
      line-height:26px">Hi ${newUser.username}</p>
      <p style="font-size:16px;
      line-height:26px">Welcome to NxenTrade, the marketplace for
                buying and selling cryptocurrencies using local currency at standard rates. Use the button bellow to verify your account.</p>
                <section style="textAlign:center">
                  <a style="padding:12px 12px; background-color:#272E3F;border-radius:3px; color:#fff; font-size:16px; text-decoration:none; text-align:center; display:block" href="https://nxentrade.com/emailverification/${newUser.confirmationCode}">Verify Account</a>
                </section>
     <p style="font-size:16px;
      line-height:26px">Best, <br /> The NxenTrade team.</p>
    
      <hr style="border-width:1px; border-style:dashed; border-color:lightgrey" />
    
      <p style="color:#8898aa;
      font-size:12px">if you did not request this email, you can safely ingnore it. </p>  
      <div>
          <section>   
        `,
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
            .send({ message: "Successful, you can now login." });
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
          html: `<section style="background-color:#ffffff; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif">
            <div style="margin:0 auto;
      padding:20px 0 48px">
      <p style="font-size:16px;
      line-height:26px">Hi there,</p>
      <p style="font-size:16px;
      line-height:26px">Welcome to NxenTrade, the marketplace for
                buying and selling cryptocurrencies at standard rates. Use the button bellow to verify your account.</p>
                <section style="textAlign:center">
                  <a style="padding:12px 12px; background-color:#2563eb;border-radius:3px; color:#fff; font-size:16px; text-decoration:none; text-align:center; display:block" href="https://nxentrade.com/emailverification/${newUser.confirmationCode}">Verify Account</a>
                </section>
     <p style="font-size:16px;
      line-height:26px">Best, <br /> The NxenTrade team.</p>
    
      <hr style="border-width:1px; border-style:dashed; border-color:lightgrey" />
    
      <p style="color:#8898aa;
      font-size:12px">if you did not request this email, you can safely ingnore it. </p>  
      <div>
          <section>   
        `,
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
  const id = req.params.id

  NxentradeUser.findOne({ _id: id })
    .then((user) => {
      res.status(200).send({
        username: user.username
      })
    }).catch((error) => {
      res.status(404).send({
        message: "Error fetching user email.",
        error
      })
    })
});

export default app;
