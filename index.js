const express = require('express');
const app = express();
var server = require('http').createServer(app);
//var io = require('socket.io')(server);
const path =require('path');
var cron=require('node-cron');

//app.use(express.static(path.join(__dirname, 'public')));

app.get('/',function (req, res,next){
   res.sendFile(__dirname +'/'+'database/main.html' );
  });
   //io.on('connect',function(socket){
  // cron.schedule("*/30 * * * * *", async function(){
   	  category();
 async function category() { 
	var promise=new Promise(async (resolve, reject) => {
      var suRu=  require('./database/router.js');
      var subCategory= await suRu();
});};//});
  server.listen(8080,function(){
    console.log('listening on port 8080');
});




         