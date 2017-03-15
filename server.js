var imgur = require('imgur-search')
var imgurkey = "ed2cf131748caaf";
var pageurl = "http://imgur.com/user/ISpeakStrine/submitted";
var http = require("http");
var url = require('url');
var express = require('express');
var app = express();
var sqlite3 = require("sqlite3").verbose();
var fs = require("fs");
var file = "new.db"; 
var exists = fs.existsSync(file);
console.log("exists=" + exists);
var db = new sqlite3.Database(file);
console.log("db=" + db);

var retObj = { "imgurl":null, "alt":null, "pageurl":null };
var retObjLatest = { "term":null, "stime":null };

var resG;

var ImgurWorker = new imgur(imgurkey);
  console.log("imgurworker=" + ImgurWorker);

db.each("select name from sqlite_master where type='table'", function (err, table) {
        console.log(table);
});


if (false) {
  db.serialize(function() {
    //db.run("DROP TABLE searchres");
    //console.log("DROPPING TABLE!");
    db.run("CREATE TABLE searchres ( ID	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE, term TEXT, stime TEXT)");
    console.log("CREATING TABLE!");
  });
}

function searchTerm(res, term, page) {
      
  ImgurWorker.search(term, "top", page)
      .then(function (result) {
        if (result.length === 0) {
          res.write("No results found....try again.");
          res.end();
          return;
        }
        newRec(term)  // save search term and time in database
        resG = res;
        //console.log(result); 
        result.forEach(procResults);         
        res.end();
  });
  
}

function procResults(elm) {
  //console.log(elm.link + ", " + elm.title + ", " + getPageRef(elm.account_url));
  retObj.imgurl = elm.link;
  retObj.alt = elm.title;
  retObj.pageurl = getPageRef(elm.account_url);
  resG.write(JSON.stringify(retObj));
}

function getPageRef(str) {
  return "http://imgur.com/user/" + str + "/submitted"
  
}

function newRec(term) {
  db.serialize(function() {
    var currentdate = new Date(); 
    var stime =  currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/" 
                + currentdate.getFullYear() + " "  
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();
    console.log("term=" + term);
    console.log("stime=" + stime);
    var stmt = db.prepare("INSERT INTO searchres(term, stime) VALUES(?,?)");
    stmt.run(term, stime);  
    stmt.finalize();
  });
  
  showTable();
}

function showTable() {
  db.serialize(function(url) {
    db.each("SELECT * FROM searchres", function(err, row) {
      console.log(row.ID + ": " + row.term + ": " + row.stime);
    });
  });
}

app.get('/api/latest/imagesearch', function(req, res) {
  
  db.serialize(function(url) {
    db.each("SELECT * FROM searchres", function(err, row) {
      retObjLatest.term = row.term;
      retObjLatest.stime = row.stime;
      res.write(JSON.stringify(retObjLatest));
      console.log(row.ID + ": " + row.term + ": " + row.stime);
    },
      function complete(err, found) {
        res.end();
    });
    
  });
  
});

// https://cpinheir-img-search.glitch.me/api/latest/imagesearch/
// https://cpinheir-img-search.glitch.me/api/imagesearch/lolcats%20funny?offset=1
app.get('/api/imagesearch/:term', function(req, res) {
   console.log("req.parms=" + JSON.stringify(req.params));
   console.log("req.query=" + JSON.stringify(req.query));
   
   searchTerm(res, req.params.term, req.query.offset);
});

app.listen(8080);