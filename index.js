
const express = require("express");
const cors = require("cors");
const path = require('path')
require('dotenv/config')

const app = express();
const morgan = require('morgan')

const corsOption = {
   origin: '*', 
   credentials:true,            //access-control-allow-credentials:true
   optionSuccessStatus:200
}

app.use(cors(corsOption))

app.use(function(req, res, next){
   res.header("Access-Control-Allow-Origin", "*");
   // res.header("Access-Control-Allow-Headers", "x-access-token");
   res.header("Access-Control-Allow-Headers", "X-Requested-With");
   
   next();
});


const Sequelize = require("sequelize");

const sequelize = new Sequelize(
   's539_countdownsmp',
   'u539_lZc6mW8ihF',
   '0NSPnwEN!8gan!9B41a.2FiP',
   {
      host: '194.233.84.178',
      dialect: 'mysql'
   }
);

sequelize.authenticate().then(() => {
   console.log('Connection has been established successfully.');
}).catch((error) => {
   console.error('Unable to connect to the database: ', error);
});

app.use(morgan('tiny'))
app.use(cors(corsOption));
// app.use(express.static(__dirname+"/static"));

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Countdown SMP application." });
});

const dataRouter = require('./routes/data-route')
app.use('/data', dataRouter)

// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});