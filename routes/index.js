'use strict';
const http = require('http');
const fs = require('fs');
const express = require('express');
const router = express.Router();
const path = require('path');
const upload = require('express-fileupload');
const ocrSpaceApi = require('ocr-space-api');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

router.use(upload()); //configure middleware

//global variables
var filename;
var textToBeSend;
var textNew;
var eingabe="";
var ausgabe="";
var language="";

router.get('/', function (req, res) {
    filename = "Placeholder.PNG";
    res.render('index_neu', { title: 'VisionTranslator', msg: '' });
});

router.post('/upload', function (req, res) {
    if (req.files) {
    	console.log('\nAusgewaehltes Bild: \n', req.files);
        var file = req.files.upfile;
        filename = file.name;
        var path = './upload/';
        file.mv(path + filename, function (err) {
            if (err) {
                console.log(err);
                res.send("error occured");
            }
            else {
                console.log("\nDatei hochgeladen.");
                sendOCR(callbackOCR);
                function callbackOCR() {
                    identify(callbackIdentify);
                    function callbackIdentify() {
                        translate(callbackTranslate);
                        function callbackTranslate() {
                            res.render('index_neu', { title: 'VisionTranslator', eingabe: eingabe, language: language, ausgabe: ausgabe });
                        }
                    }
                }
            }
        });
    }
    else {
        res.send('No Files selected.');
        console.log('No Files selected');
    }
});

function translate(callback) {
    var uebergabe = eingabe.replace(" ", "%20");
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "https://watson-api-explorer.mybluemix.net/language-translator/api/v2/translate?text=" + uebergabe + "&source="+language+"&target=en", false);
    xhttp.setRequestHeader("Accept", "application/json");
    xhttp.send();
    var obj = JSON.parse(xhttp.responseText);
    console.log('\nWatson-API Language Translater response: \n', xhttp.responseText);
    console.log('\nUebersetzung: ', obj.translations[0].translation);
    ausgabe = obj.translations[0].translation;
    callback();
}

function identify(callback) {
    var uebergabe = eingabe.replace(" ", "%20");
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "https://watson-api-explorer.mybluemix.net/language-translator/api/v2/identify?text=" + uebergabe, false);
    xhttp.setRequestHeader("Accept", "application/json");
    xhttp.send();
    var obj = JSON.parse(xhttp.responseText);
    console.log('\nWatson-API Language Identifier response: \n', xhttp.responseText);
    console.log('\n Sprache (mit hoechster Wahrscheinlichkeit): ',obj.languages[0].language);
    language = obj.languages[0].language;
    callback();
}

function sendOCR(callback) {
    var options = {
        apikey: '2cd7b08ac288957',
        imageFormat: 'image/png'
    };

    // Image file to upload 
    const imageFilePath = "./upload/" + filename;

    // Run and wait the result 
    ocrSpaceApi.parseImageFromLocalFile(imageFilePath, options)
        .then(function (parsedResult) {
            //paresResult aus JSON extrahieren
            var tmp = JSON.stringify(parsedResult);
            console.log('\nOCR-API response: \n', parsedResult);
            tmp = tmp.replace(/(?:\\[rn])+/g, '');
            tmp = tmp.substring(15);
            eingabe = tmp.substring(0, tmp.indexOf("\""));

            console.log('\nerkannter Text: ', eingabe);
            callback();
        }).catch(function (err) {
            console.log('ERROR:', err);
        });
};

router.get('/image', function (req, res) {
    const path = 'upload/'+filename;
    const file = fs.createReadStream(path);
    res.writeHead(200, { 'Content-type': 'image/png' });
    file.pipe(res);
});

module.exports = router;
