// Including libraries

var app = require('http').createServer(handler),
	io = require('socket.io').listen(app),
	static = require('node-static'); // for serving files

// This will make all the files in the current folder
// accessible from the web
var fileServer = new static.Server('./');
	
// This is the port for our web server.
// you will need to go to http://localhost:8080 to see it
app.listen(8080);

// If the URL of the socket server is opened in a browser
function handler (request, response) {

	request.addListener('end', function () {
        fileServer.serve(request, response);
    });
}

var usernames = {}
  , games = {}
  , runningGames = {}
  , maxPlayersInGame = 4;

// Listen for incoming connections from clients
io.set('log level', 1);
io.sockets.on('connection', function (socket) {
  function sendNewMessage(username, message, type, room){
    io.sockets.in(room).emit('new message', { username: username, message: message, type: type});
  }

  function removeUserFromGames(username) {
    for(game in games){
      if(username == games[game].owner){
        delete games[game];
        return game;
      } else if(games[game].players[username] != null && username == games[game].players[username].name){
        delete games[game].players[username];
        return game;
      }
    }
    return null;
  }

  function updateGameDetails(gamename) {
    if(games[gamename] != null){
      console.log("sending update for game "+gamename);
      io.sockets.in('lobby').emit('update game details', games[gamename]);
    } else { // game removed
      console.log("sending remove update for game "+gamename);
      io.sockets.in('lobby').emit('update game details', gamename);
    }
  }
  
  var addedUser = false;

  socket.on('join server', function(username) {
    if(usernames[username] == null){
      socket.username = username;
      usernames[username] = username;
      addedUser = true;
      socket.join('lobby');
      socket.emit('welcome', {
        usernames: usernames,
        games: games,
        maxPlayersInGame: maxPlayersInGame
      });
      sendNewMessage(socket.username, socket.username+" has joined the lobby", "join", "lobby");
    } else {
      socket.emit('nickname taken', null);
    }
  });
  
  socket.on('send message', function(data) {
    sendNewMessage(socket.username, data.message, "chat", data.room);
  });

  socket.on('create game', function(gamename) {
    games[gamename] = {
      name: gamename, 
      owner: socket.username,
      teamOne: {},
      teamTwo: {},
      players: {},
    };
    games[gamename].players[socket.username] = {name: socket.username, id: socket.id};
    updateGameDetails(gamename);
    socket.emit('game started', gamename);
  });

  socket.on('cancel game', function(gamename) {
    console.log("game "+gamename+" cancelled");
    delete games[gamename];
    updateGameDetails(gamename);
    sendNewMessage(socket.username, "Game "+gamename+" was cancelled by "+socket.username+".", "notice", "lobby");
  });

  socket.on('join game', function(gamename) {
    var numberOfPlayersJoined = Object.keys(games[gamename].players).length;
    if(numberOfPlayersJoined < maxPlayersInGame){
      games[gamename].players[socket.username] = {name: socket.username, id: socket.id};
      sendNewMessage(socket.username, socket.username+" joined game "+gamename, "notice", "lobby");
      updateGameDetails(gamename);
    }
  });

  socket.on('change team', function(data) {
    var teamOneCount = Object.keys(games[data.gamename].teamOne).length
      , teamTwoCount = Object.keys(games[data.gamename].teamTwo).length;
    if(games[data.gamename].teamOne[socket.username] != null || games[data.gamename].teamTwo[socket.username] != null){
      delete games[data.gamename].teamOne[socket.username];
      delete games[data.gamename].teamTwo[socket.username];
    }
    if(data.team == 1)
      games[data.gamename].teamOne[socket.username] = socket.id;
    else if(data.team == 2)
      games[data.gamename].teamTwo[socket.username] = socket.id;
    updateGameDetails(data.gamename);
  });

  socket.on('start game', function(gamename) {
    runningGames['gamename'] = createTuppi(gamename);
  });

  socket.on('leave game', function(gamename) {
    delete games[gamename].players[socket.username];
    sendNewMessage(socket.username, socket.username+" left game "+gamename, "notice", "lobby");
    updateGameDetails(gamename);
  });

  socket.on('disconnect', function() {
    if(addedUser) {
      delete usernames[socket.username];
      if((removeStatus = removeUserFromGames(socket.username)) != null);
        updateGameDetails(removeStatus);
      sendNewMessage(socket.username, socket.username+" has left the lobby", "part", "lobby");
    }
  });
});
