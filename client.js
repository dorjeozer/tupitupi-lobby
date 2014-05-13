$(function(){
	// The URL of your web server (the port is set in app.js)
  function addUser(data){
    users[data.username] = data.username;
    updateUserlist(data.username);
  }

  function removeUser(data){
    $('.userlist-user#'+data.username).remove();
    delete users[data.username];
    if(data.games != null){
      if(data.games['type'] == 'owner'){
        $('.gamelist-game#'+data.games['name']).remove();
        delete games[data.games['name']];
      } else {
        //add stuff if one has only joined a game
      }
    }
  }

  function insertMessage(data) {
    if(data.type == "chat")
      $('#messages').append("<p>"+data.username+":"+data.message+"</p>");
    else if(data.type == "notice" || data.type == "join" || data.type == "part")
      $('#messages').append("<p>"+data.message+"</p>");
  }

  function updateGamelist(gamename) {
    function gameElement(name) {
      return "<p class='gamelist-game' id='"+name+"'>["+numberOfPlayersJoined+"/"+maxPlayersInGame+"] "+name+"</p>"
    }

    var numberOfPlayersJoined;
    if(gamename != null){
      numberOfPlayersJoined = Object.keys(games[gamename].players).length;
      if($('.gamelist-game#'+gamename).length == 1) {
        $('.gamelist-game#'+gamename).empty().append("["+numberOfPlayersJoined+"/"+maxPlayersInGame+"] "+gamename).unbind("click").click(function(){openLounge(gamename)});
      } else if($('.gamelist-game#'+gamename).length == 0){
        $('#gamelist').append(gameElement(gamename)).unbind("click").click(function(){openLounge(gamename)});
      }
    } else {
      for(game in games){
        if($('.gamelist-game#'+game).length == 0){
          numberOfPlayersJoined = Object.keys(games[game].players).length;
          $('#gamelist').append(gameElement(game)).unbind("click").click(function(){openLounge(game)});
        }
      }
    }
  }

  function openLounge(gamename){
    updateLounge(gamename);
    $('#game-lounge').addClass(gamename).show();
  }

  function updateLounge(gamename) {
    updateLoungePlayers(gamename);
    updateLoungeButtons(gamename);
  }

  function updateLoungePlayers(gamename) {
    var numberOfPlayersJoined = Object.keys(games[gamename].players).length;
    $('#joined-players-list > tbody').empty();
    for(player in games[gamename].players){
      if(games[gamename].teamOne[player] != null)
        $('#joined-players-list tbody').append("<tr><td><p>"+player+"</p></td><td><p>Team 1</p></td></tr>");
      else if(games[gamename].teamTwo[player] != null)
        $('#joined-players-list tbody').append("<tr><td><p>"+player+"</p></td><td><p>Team 2</p></td></tr>");
      else
        $('#joined-players-list tbody').append("<tr><td><p>"+player+"</p></td><td><p></p></td></tr>");
    }
    $('#joined-players-count').append("<p>Players joined: "+numberOfPlayersJoined+"/4</p>");
  }

  function updateLoungeButtons(gamename) {
    var numberOfPlayersJoined = Object.keys(games[gamename].players).length
      , numberOfPlayersTeamOne = Object.keys(games[gamename].teamOne).length
      , numberOfPlayersTeamTwo = Object.keys(games[gamename].teamTwo).length;
    console.log("start updating buttons");
    if(games[gamename].players[username] == null && numberOfPlayersJoined < 4)
      $('#join-game-button').show().unbind("click").click(function() {
        $('#join-game-button').hide();
        socket.emit('join game', gamename);
      });
    else if(games[gamename].players[username] != null){
      if(games[gamename].owner != username)
        $('#leave-game-button').show().unbind("click").click(function() {
          $('#leave-game-button').hide();
          socket.emit('leave game', gamename);
        });
      else if(games[gamename].owner == username){
        $('#cancel-game-button').show().unbind("click").click(function() {
          $('cancel-game-button').hide();
          socket.emit('cancel game', gamename);
        });
        if(numberOfPlayersJoined == 4 && numberOfPlayersTeamOne == 2 && numberOfPlayersTeamTwo == 2){
          $('#start-game-button').show().unbind("click").click(function() {
            socket.emit('start game', gamename);
          });
        } else {
          $('#start-game-button').hide();
        }
      }
      $('#team-select tbody').show();
      $('#team-select-menu').unbind("change").change(function() {
        socket.emit('change team', {gamename: gamename, team: parseInt($(this).val())});
      });
    }
  }

  function closeOpenLounges(gamename){
    console.log("closing lounge: "+gamename);
    $('#game-lounge.'+gamename).hide();
    $('#team-select tbody').hide();
    $('#game-lounge').removeClass(gamename);
  }

  function updateUserlist(username) {
    if(username != null){
      if($(".userlist-user#"+username).length == 0)
        $('#userlist').append("<p class='userlist-user' id='"+username+"'>"+username+"</p>");
    } else {
      for(user in users)
        if($(".userlist-user#"+user).length == 0)
          $('#userlist').append("<p class='userlist-user' id='"+user+"'>"+user+"</p>");
    }
  }

  function createGame(gamename){
    socket.emit('create game', gamename);
  }

	var url = 'http://localhost:8080'
    , username = ""
    , users = {}
    , games = {}
    , socket = io.connect(url)
    , maxPlayersInGame;

  $('#connect-button').click(function() {
    if($('#nickname-box').val().length > 0)
      socket.emit('join server', $('#nickname-box').val());
  });

  $('#message-submit').click(function() {
    var message = $('#messagebox').val()
    $('#messagebox').val("");
    socket.emit('send message', {room: 'lobby', message: message}); 
  });

  $('#create-game-button').click(function() {
    $('#create-game-screen').css("display", "block");
    $('#create-game-submit').click(function() {
      var gamename = $('#create-game-name-input').val();
      if(gamename.length > 0)
      createGame(gamename);
    });
  });

  socket.on('nickname taken', function() {
    $('#nickname-error').css("display", "block");
  });

  socket.on('welcome', function(data) {
    username = $('#nickname-box').val();
    $('#login-screen').hide();
    $('#lobby').show();
    users = data.usernames;
    games = data.games;
    maxPlayersInGame = data.maxPlayersInGame;
    updateUserlist(null);
    updateGamelist(null);
  });

  socket.on('new message', function(data) {
    if(data.type == "join"){
      addUser(data);
    } else if (data.type == "part"){
      removeUser(data);
    }
    insertMessage(data);
  });

  socket.on('game started', function(gamename) {
    $('#create-game-screen').hide();
    openLounge(gamename);
  });

  socket.on('update game details', function(gamedata) {
    if(typeof(gamedata) == "object"){
      games[gamedata.name] = gamedata;
      updateGamelist(gamedata.name);
      //update lounge if it's open
      if($('#game-lounge').hasClass(gamedata.name))
        updateLounge(gamedata.name);
    } else { //game removed
      console.log("game "+gamedata+" was removed");
      $('.gamelist-game#'+gamedata).remove();
      delete games[gamedata];
      closeOpenLounges(gamedata);
    }
  });
});
