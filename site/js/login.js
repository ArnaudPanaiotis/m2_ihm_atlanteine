function init() {
	// Connect to the SocketIO server to retrieve ongoing games.
	socket = io.connect();
	socket.on('gamesList', function(data) {
                var ul = document.getElementById('lesParties');
                ul.innerHTML='';
                for(var p in data.gamesList) {
                    var li = document.createElement('li'); 
                    ul.appendChild( li );
                    li.innerHTML = "<a href='javascript:void(0);' onclick=\"startGame('"+data.gamesList[p]+"')\">"+data.gamesList[p]+"</a>";
                    //li.appendChild( document.createTextNode( data.gamesList[p] ) );
                }
            }
        );
	socket.emit('loginPage');
}

function startGame(gameId) {
    document.getElementById("idGame").value = gameId;
    document.getElementById("nouvellePartie").submit();
}


