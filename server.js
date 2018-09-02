'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var cors = require('cors');
var shortid = require('shortid');
var dns = require('dns');

var app = express();
// This is for the paste-link builder
const projectUrl = 'https://fcc-url-shortener-mckelveygreg.glitch.me';

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 

mongoose.connect(process.env.MONGO_URI, { useMongoClient: true });
mongoose.Promoise = global.Promise;

const Schema = mongoose.Schema;
const URLSchema = new Schema({
  original_url: {
    type: String,
    required: true
  },
  short_url: {type: String },//, default: shortid.generate }, // had to remove the () to make it gen each time
  paste: { type: String } //, default: projectUrl + '/api/shorturl/' + shortid.generate() }
});
const ShortURL = mongoose.model('ShortURL', URLSchema);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({ extended: false }));

// logger
app.use((req,res,next) => {
  const method = req.method;
  const path = req.path;
  const ip = req.ip;
  console.log(`${method} ${path} - ${ip}`);
  next();
});

app.use('/public', express.static(process.cwd() + '/public'));

// Views
app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});
  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

//URL Shortener
app.post('/api/shorturl/new', (req,res, next) => {
  let testURL = req.body.url;
  const httpRegex = /^(http|https)(:\/\/)/;
  const wwwRegex = /(www.)/;
  const slashRegex = /\/.*/

  testURL = testURL.replace(httpRegex, '')
                  .replace(wwwRegex, '')
                  .replace(slashRegex, '');
  
  console.log('resolve this url: ' + testURL);
  dns.resolve(testURL, (err, data) => {
    if(err) {
      res.json({error: 'invalid url', attempted_url: req.body.url})
    } else {
        ShortURL.findOne({original_url: req.body.url}, (err, data) => {
          if (err) return res.send(err);
          if(data) {
            res.json(data); // return address already in database
          } else {
              const short_url = shortid.generate();
              const preparedURL = 'https://www.' + req.body.url
                                    .replace(httpRegex, '')
                                    .replace(wwwRegex, '')
                                    
              const newURL = new ShortURL({
                original_url: preparedURL,
                short_url: short_url,
                paste: projectUrl + '/api/shorturl/' + short_url
              })
              .save()
              .then(url => res.json(url))
              .catch(err => res.send(err));
            }
        });
      }
    });
});

app.get('/api/shorturl/:shorturl', (req,res) => {
  ShortURL.findOne({short_url: req.params.shorturl})
    .exec()
    .then(url => res.redirect(url.original_url))
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});