var XHR = function(method, ad, params) {
    var xhr = new XMLHttpRequest();
    xhr.onload = params.onload || null;
    xhr.open(method, ad);
    if (method == 'POST') {
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    }
    var variables = params.variables || null
            , str = '';
    for (var i in variables) {
        str += i + '=' + encodeURIComponent(variables[i]) + '&';
    }
    xhr.send(str);
}

function init() {
    // Connect to the SocketIO server to retrieve ongoing games.
    socket = io.connect();
    socket.on('participants', function(data) {
        var ul = document.getElementById('lesParticipants');
        ul.innerHTML = '';
        for (p in data.participants) {
            var li = document.createElement('li');
            ul.appendChild(li);
            li.appendChild(document.createTextNode(data.participants[p]));
        }
    });
    socket.on('FinalCountDown', function(data) {
        var ms = data.FinalCountDown;
        console.log("FinalCountDown : " + ms);
//        alert(JSON.stringify(data));
        setCountdown(data);
    });
    socket.on('TerminateGame', function(data) {
        h1 = document.querySelector('body > header > h1');
        h1.innerHTML += ' est terminée !';
//        alert(JSON.stringify(data));
    });
    socket.on('solutions', function(data) {
        console.log("Solutions are :\n" + JSON.stringify(data.solutions));
//        alert(JSON.stringify(data));
        displayWiners(data);
    });
    socket.emit('identification', {login: document.getElementById('login').value
                , idGame: document.getElementById('idGame').value}
    );
}

function drawPlateau(dataPlateau) {
    var plateau = document.getElementById("plateau");
    plateau.innerHTML = "";
    var height = dataPlateau.length;
    var width = dataPlateau[0].length;
    var row = plateau.insertRow(-1);
    row.insertCell(-1);
    for (var x = 0; x < width; x++)
        row.insertCell(-1).innerHTML = String.fromCharCode('A'.charCodeAt(0) + x);
    for (var y = 0; y < height; y++) {
        var row = plateau.insertRow(-1);
        row.insertCell(-1).innerHTML = y + 1;
        for (var x = 0; x < width; x++) {
            var cell = row.insertCell(-1);
            if (dataPlateau[y][x].g)
                cell.style.borderLeft = "2px black solid";
            if (dataPlateau[y][x].d)
                cell.style.borderRight = "2px black solid";
            if (dataPlateau[y][x].h)
                cell.style.borderTop = "2px black solid";
            if (dataPlateau[y][x].b)
                cell.style.borderBottom = "2px black solid";
            cell.oncklick = undefined;
            cell.style.background = "";
        }
    }
}

function getCell(x, y) {
    return document.getElementById("plateau").rows[y + 1].cells[x + 1];
}

function addFunctionOnClick(cell, x, y, func) {
    cell.onclick = function() {
        func(x, y);
    };
}

// drawRobot(x, y, color) affiche un robot de couleur "color" dans la case (x,y) 
// drawRobot(x, y)        efface un robot dans la case (x,y)
function drawRobot(x, y, color) {
    var cell = getCell(x, y);
    if (color === undefined) {
        cell.onclick = undefined;
        cell.style.background = "";
    } else {
        cell.style.background = "url('robot.png') " + color;
        addFunctionOnClick(cell, x, y, selectRobot);
    }
}

// drawTarget(x, y, color) affiche une cible de couleur "color" dans la case (x,y) 
// drawTarget(x, y)        efface une cible dans la case (x,y)
function drawTarget(x, y, color) {
    var cell = getCell(x, y);
    if (color === undefined) {
        cell.style.background = "";
    } else {
        if (cell.style.background !== "" & cell.style.background.substr(0, 3) !== "url")
            cell.style.background = "url('target_next.png') " + color;
        else
            cell.style.background = "url('target.png') " + color;
    }
}

// drawnext(x, y, color) affiche un mouvement possible de couleur "color" dans la case (x,y) 
// drawNext(x, y)        efface un mouvement possible dans la case (x,y)
function drawNext(x, y, color) {
    var cell = getCell(x, y);
    if (color === undefined) {
        cell.style.background = "";
        cell.onclick = undefined;
    } else {
        cell.style.background = color;
        addFunctionOnClick(cell, x, y, moveRobot);
    }
}

var robots;
var startPos;
var proposition = [];
var currentRobot = {};
var nextPositions = [];
var initGame;
var target;
var activateEvent = true;

function drawGame(gameJson) {
//    alert(gameJson);
    if (gameJson === undefined)
        gameJson = initGame;
    else
        initGame = gameJson;
    game = JSON.parse(gameJson);
    robots = game.robots;
    startPos = JSON.parse(JSON.stringify(game.robots)); // deep copy
    drawPlateau(game.board);
    for (var i = 0; i < robots.length; i++) {
        var robot = robots[i];
        drawRobot(robot.column, robot.line, robot.color);
    }
    target = game.target;
    drawTarget(game.target.c, game.target.l, game.target.t);
}

function updateRobots(color, x, y) {
    for (var i = 0; i < robots.length; i++) {
        if (color === robots[i].color) {
            robots[i].column = x;
            robots[i].line = y;
        }
    }
}

function getRobot(c, l) {
    for (var i = 0; i < robots.length; i++) {
        if (c === robots[i].column && l === robots[i].line)
            return robots[i].color;
    }
    return "";
}

function getRobotPosition(color) {
    for (var i = 0; i < robots.length; i++) {
        if (color === robots[i].color)
            return robots[i];
    }
    return "";
}

function selectRobot(x, y) {
    var robot = getRobot(x, y);
    if (robot === "")
        return;
    if (proposition.length !== 0 && proposition[proposition.length - 1].command === "select") {
        proposition.pop();
        var lastSelect;
        for (var i = proposition.length - 1; i >= 0; i--)
            if (proposition[i].command === "select") {
                lastSelect = proposition[i].robot;
                break;
            }
        if (robot !== lastSelect)
            proposition.push({command: "select", robot: robot});
    } else if (robot !== currentRobot.color) {
        proposition.push({command: "select", robot: robot});
    }
    currentRobot.color = robot;
    currentRobot.x = x;
    currentRobot.y = y;
    currentRobot.nextX = x;
    currentRobot.nextY = y;
    sendProposition();
}

function moveRobot(x, y) {
    proposition.push({command: "move", line: y, column: x});
    currentRobot.nextX = x;
    currentRobot.nextY = y;
    activateEvent = false;
    sendProposition();
}

function sendProposition() {
    printProposition();
    if (proposition.length !== 0)
        XHR("POST", "/proposition", {
            variables: {
                login: document.getElementById('login').value,
                idGame: document.getElementById('idGame').value,
                proposition: JSON.stringify(proposition)},
            onload: function() {
                updatePlateau(JSON.parse(this.responseText));
            }});
}

function updatePlateau(answer) {
    if (answer.error !== undefined) {
        error("Requête mal formatée.");
        return;
    }
    activateEvent = false;
    switch (answer.state) {
        case "INVALID_MOVE":
            error("Déplacement impossible : " + answer.details);
            plateau.pop;
            activateEvent = true;
            break;
        case "INVALID_SELECT":
            error("Sélection impossible : " + answer.details);
            plateau.pop;
            activateEvent = true;
            break;
        case "INCOMPLETE":
        case "SUCCESS":
            drawRobot(currentRobot.x, currentRobot.y);
            for (var i = 0; i < nextPositions.length; i++) {
                drawNext(nextPositions[i].c, nextPositions[i].l);
            }
            nextPositions = answer.nextPositions;
            for (var i = 0; i < nextPositions.length; i++) {
                drawNext(nextPositions[i].c, nextPositions[i].l, currentRobot.color);
            }
            drawTarget(target.c, target.l, target.t);
            drawRobot(currentRobot.nextX, currentRobot.nextY, currentRobot.color);
            currentRobot.x = currentRobot.nextX;
            currentRobot.y = currentRobot.nextY;
            updateRobots(currentRobot.color, currentRobot.x, currentRobot.y);
            if (answer.state === "SUCCESS") {
                success("Vous avez Gagné !");
                for (var i = 0; i < proposition.length; i++) {
                    if (proposition[i].command === "move")
                        getCell(proposition[i].column, proposition[i].line).onclick = undefined;
                }
                for (var i = 0; i < robots.length; i++) {
                    getCell(robots[i].column, robots[i].line).onclick = undefined;
                }
                var buttons = document.getElementById("partie").getElementsByTagName("button");
                for (var i = 0; i < buttons.length; i++) {
                    buttons[i].setAttribute("disabled", "true");
                }
            } else {
                activateEvent = true;
            }
            break;
        default:
            error("Erreur interne !");
    }
}

var keys = [
    {key: 37, command: "move", action: "left"},
    {key: 38, command: "move", action: "up"},
    {key: 39, command: "move", action: "right"},
    {key: 40, command: "move", action: "down"},
    {key: 65, command: "select", action: "blue"}, // A Q
    {key: 90, command: "select", action: "red"}, // Z W
    {key: 69, command: "select", action: "green"}, // E
    {key: 82, command: "select", action: "yellow"}, // R
    {key: 8, command: "deleteLast"}, // Del
    {key: 46, command: "deleteAll"}, // Suppr
];

function getAction(key) {
    for (var i = 0; i < keys.length; i++) {
        if (keys[i].key === key)
            return keys[i];
    }
}

function getNext(dir) {
    for (var i = 0; i < nextPositions.length; i++) {
        if (nextPositions[i].c === currentRobot.x && nextPositions[i].l > currentRobot.y && dir === "down")
            return nextPositions[i];
        if (nextPositions[i].c === currentRobot.x && nextPositions[i].l < currentRobot.y && dir === "up")
            return nextPositions[i];
        if (nextPositions[i].c > currentRobot.x && nextPositions[i].l === currentRobot.y && dir === "right")
            return nextPositions[i];
        if (nextPositions[i].c < currentRobot.x && nextPositions[i].l === currentRobot.y && dir === "left")
            return nextPositions[i];
    }
}

function onKey(event) {
    //alert(event.keyCode);
    var key = getAction(event.keyCode);
    if (key === undefined || !activateEvent)
        return;
    if (key.command === "select") {
        var robot = getRobotPosition(key.action);
        selectRobot(robot.column, robot.line);
    } else if (key.command === "move") {
        var position = getNext(key.action);
        if (position === undefined)
            return;
        moveRobot(position.c, position.l);
    } else if (key.command === "deleteLast") {
        cancelLast();
    } else if (key.command === "deleteAll") {
        deleteProposition();
    }
    if (event.preventDefault)
    {
        event.preventDefault();
    }
}

window.addEventListener('keydown', onKey, false);
//window.addEventListener('keypress', onKey, false);

function printProposition() {
    var prop = document.getElementById("proposition");
    var color;
    prop.innerHTML = "";
    for (var i = 0; i < proposition.length; i++) {
        if (proposition[i].command === "select") {
            if (color === proposition[i].robot)
                continue;
            color = proposition[i].robot;
            var j;
            for (j = 0; startPos[j].color !== proposition[i].robot; j++)
                ;
            prop.innerHTML += "<tr onmouseover='highlightCell(" + startPos[j].column + "," + startPos[j].line + ",\"" + color + "\")' onmouseout='highlightCell(" + startPos[j].column + "," + startPos[j].line + ")' class='select' style='border-color:" + color + "'><td style='border-color:" + color + "'>" + String.fromCharCode('A'.charCodeAt(0) + startPos[j].column) + "</td><td>" + (startPos[j].line + 1) + "</td></tr>";
        } else {
            prop.innerHTML += "<tr onmouseover='highlightCell(" + proposition[i].column + "," + proposition[i].line + ",\"" + color + "\")' onmouseout='highlightCell(" + proposition[i].column + "," + proposition[i].line + ")'><td style='border-color:" + color + "'>" + String.fromCharCode('A'.charCodeAt(0) + proposition[i].column) + "</td><td>" + (proposition[i].line + 1) + "</td></tr>";
        }
    }
    document.getElementById("around_prop").scrollTop = 1000000000;
}

function highlightCell(x, y, color) {
    var cell = getCell(x, y);
    if (color !== undefined) {
        cell.style.outline = "1px solid " + color;
    } else {
        cell.style.outline = "";
    }
}

function deleteProposition() {
    proposition = [];
    printProposition();
    drawGame();
}

function error(text) {
    var div = document.getElementById("teuse");
    div.innerHTML = text;
    div.style.border = "2px solid red";
}

function success(text) {
    var div = document.getElementById("teuse");
    div.innerHTML = text;
    div.style.border = "2px solid green";
}

function cancelLast() {
    if (proposition.length === 0)
        return;
    for (var i = 0; i < nextPositions.length; i++) {
        drawNext(nextPositions[i].c, nextPositions[i].l);
    }
    if (proposition[proposition.length - 1].command === "move") {
        proposition.pop();
        drawRobot(currentRobot.x, currentRobot.y);
        if (proposition.length !== 0 && proposition[proposition.length - 1].command === "move") {
            currentRobot.x = proposition[proposition.length - 1].column;
            currentRobot.y = proposition[proposition.length - 1].line;
        } else {
            var i;
            for (i = 0; startPos[i].color !== currentRobot.color; i++)
                ;
            currentRobot.x = startPos[i].column;
            currentRobot.y = startPos[i].line;
        }
        currentRobot.nextX = currentRobot.x;
        currentRobot.nextY = currentRobot.y;
        drawRobot(currentRobot.x, currentRobot.y, currentRobot.color);
    } else {
        proposition.pop();
        if (proposition.length !== 0) {
            currentRobot.x = proposition[proposition.length - 1].column;
            currentRobot.y = proposition[proposition.length - 1].line;
            currentRobot.nextX = currentRobot.x;
            currentRobot.nextY = currentRobot.y;
            var i;
            for (i = proposition.length - 1; proposition[i].command !== "select"; i--)
                ;
            currentRobot.color = proposition[i].robot;
        }
        //cancelLast();
    }
    sendProposition();
}

function displayWiners(data) {
    var list = document.getElementById("lesParticipants").getElementsByTagName("li");
    for (var i = 0; i < data.solutions.length; i++) {
        for (var j = 0; j < list.length; j++) {
            if (list[j].innerHTML === data.solutions[i].player) {
                var len = 0;
                for (var k = 0; k < data.solutions[i].proposition.length; k++) {
                    if (data.solutions[i].proposition[k].command === "move")
                        len++;
                }
                if (len === 1)
                    list[j].innerHTML += " a gagné en 1 déplacement.";
                else
                    list[j].innerHTML += " a gagné en " + len + " déplacements.";
            }
        }
    }
}

function setCountdown(data) {
    var time = data.FinalCountDown / 1000;
    var interval;
    var timer = document.getElementById("timer");
    function countdown() {
        if (time === 1)
            timer.innerHTML = "Il reste 1 seconde !";
        else if (time === 0) {
            timer.innerHTML = "Partie terminée !";
            clearInterval(interval);
        }
        else
            timer.innerHTML = "Il reste " + time + " secondes !";
        time--;
    }
    countdown();
    interval = setInterval(countdown, 1000);
}



///////////////
//GAMEPAD
/**
 * Copyright 2012 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author mwichary@google.com (Marcin Wichary)
 */

var gamepadSupport = {
// A number of typical buttons recognized by Gamepad API and mapped to
// standard controls. Any extraneous buttons will have larger indexes.
    TYPICAL_BUTTON_COUNT: 16,
    // A number of typical axes recognized by Gamepad API and mapped to
    // standard controls. Any extraneous buttons will have larger indexes.
    TYPICAL_AXIS_COUNT: 4,
    // Whether we’re requestAnimationFrameing like it’s 1999.
    ticking: false,
    // The canonical list of attached gamepads, without “holes” (always
    // starting at [0]) and unified between Firefox and Chrome.
    gamepads: [],
    // Remembers the connected gamepads at the last check; used in Chrome
    // to figure out when gamepads get connected or disconnected, since no
    // events are fired.
    prevRawGamepadTypes: [],
    // Previous timestamps for gamepad state; used in Chrome to not bother with
    // analyzing the polled data if nothing changed (timestamp is the same
    // as last time).
    prevTimestamps: [],
    /**
     * Initialize support for Gamepad API.
     */
    init: function() {
        // As of writing, it seems impossible to detect Gamepad API support
        // in Firefox, hence we need to hardcode it in the third clause.
        // (The preceding two clauses are for Chrome.)
        var gamepadSupportAvailable = !!navigator.webkitGetGamepads ||
                !!navigator.webkitGamepads ||
                (navigator.userAgent.indexOf('Firefox/') != -1);

        if (gamepadSupportAvailable) {
            // Firefox supports the connect/disconnect event, so we attach event
            // handlers to those.

            window.addEventListener('MozGamepadConnected', gamepadSupport.onConnect, false);

            // Since Chrome only supports polling, we initiate polling loop straight
            // away. For Firefox, we will only do it if we get a connect event.
            if (!!navigator.webkitGamepads || !!navigator.webkitGetGamepads) {

                var rawGamepads =
                        (navigator.webkitGetGamepads && navigator.webkitGetGamepads()) ||
                        navigator.webkitGamepads;
                for (var i = 0; i < rawGamepads.length; i++) {
                    if (rawGamepads[i]) {
                        gamepadSupport.gamepads.push(rawGamepads[i]);
                    }

                }
                gamepadSupport.startPolling();
            }
        }
    }, onConnect: function(event) {

        window.addEventListener('MozGamepadButtonDown', gamepadSupport.onButton, false);
        window.addEventListener("MozGamepadAxisMove", gamepadSupport.onAxis, false);

    }, onButton: function(event) {

        if (!activateEvent)
            return;
        var button = event.button;
        switch (button) {
            case 0:
                var robot = getRobotPosition("green");
                selectRobot(robot.column, robot.line);
                break;
            case 1:
                var robot = getRobotPosition("red");
                selectRobot(robot.column, robot.line);
                break;
            case 2:
                var robot = getRobotPosition("blue");
                selectRobot(robot.column, robot.line);
                break;
            case 3:
                var robot = getRobotPosition("yellow");
                selectRobot(robot.column, robot.line);
                break;
            case 6:
                cancelLast();
                break;
            case 7:
                deleteProposition();
                break;
            default:
                break;
        }

    }, onAxis: function(event) {
        var axis = event.axis;
        var value = event.value;

        //alert(axis +" "+value);
        var dir;
        if ((axis == 0 || axis == 5) && value == -1) {
            dir = "left";
        }
        if ((axis == 0 || axis == 5) && value == 1) {
            dir = "right";
        }
        if ((axis == 1 || axis == 6) && value == -1) {
            dir = "up";
        }
        if ((axis == 1 || axis == 6) && value == 1) {
            dir = "down";
        }
        if (dir === undefined || !activateEvent)
            return;
        var position = getNext(dir);
        if (position === undefined)
            return;
        moveRobot(position.c, position.l);

    },
    /**
     * Starts a polling loop to check for gamepad state.
     */
    startPolling: function() {
        // Don’t accidentally start a second loop, man.
        if (!gamepadSupport.ticking) {
            gamepadSupport.ticking = true;
            gamepadSupport.tick();
        }
    },
    /**
     * Stops a polling loop by setting a flag which will prevent the next
     * requestAnimationFrame() from being scheduled.
     */

    //Non utilisée, devrait etre appelée dans chrome quand on a plus de gamepad mais ca empecherais de rejouer si on debranche et rebranche au cours de la partie
    stopPolling: function() {
        gamepadSupport.ticking = false;
    },
    /**
     * A function called with each requestAnimationFrame(). Polls the gamepad
     * status and schedules another poll.
     */
    tick: function() {
        gamepadSupport.pollStatus();
        gamepadSupport.scheduleNextTick();
    },
    scheduleNextTick: function() {
        // Only schedule the next frame if we haven’t decided to stop via
        // stopPolling() before.
        if (gamepadSupport.ticking) {
            if (window.requestAnimationFrame) {
                window.requestAnimationFrame(gamepadSupport.tick);
            } else if (window.mozRequestAnimationFrame) {
                window.mozRequestAnimationFrame(gamepadSupport.tick);
            } else if (window.webkitRequestAnimationFrame) {
                window.webkitRequestAnimationFrame(gamepadSupport.tick);
            }
            // Note lack of setTimeout since all the browsers that support
            // Gamepad API are already supporting requestAnimationFrame().
        }
    },
    /**
     * Checks for the gamepad status. Monitors the necessary data and notices
     * the differences from previous state (buttons for Chrome/Firefox,
     * new connects/disconnects for Chrome). If differences are noticed, asks
     * to update the display accordingly. Should run as close to 60 frames per
     * second as possible.
     */
    pollStatus: function() {
        // Poll to see if gamepads are connected or disconnected. Necessary
        // only on Chrome.
        gamepadSupport.pollGamepads();
        for (var i in gamepadSupport.gamepads) {
            var gamepad = gamepadSupport.gamepads[i];

            // Don’t do anything if the current timestamp is the same as previous
            // one, which means that the state of the gamepad hasn’t changed.
            // This is only supported by Chrome right now, so the first check
            // makes sure we’re not doing anything if the timestamps are empty
            // or undefined.
            if (gamepad.timestamp &&
                    (gamepad.timestamp == gamepadSupport.prevTimestamps[i])) {
                continue;
            }
            gamepadSupport.prevTimestamps[i] = gamepad.timestamp;

            gamepadSupport.updateDisplay(i);
        }
    },
    // This function is called only on Chrome, which does not yet support
    // connection/disconnection events, but requires you to monitor
    // an array for changes.
    pollGamepads: function() {
        // Get the array of gamepads – the first method (function call)
        // is the most modern one, the second is there for compatibility with
        // slightly older versions of Chrome, but it shouldn’t be necessary
        // for long.
        var rawGamepads =
                (navigator.webkitGetGamepads && navigator.webkitGetGamepads()) ||
                navigator.webkitGamepads;

        if (rawGamepads) {
            // We don’t want to use rawGamepads coming straight from the browser,
            // since it can have “holes” (e.g. if you plug two gamepads, and then
            // unplug the first one, the remaining one will be at index [1]).
            gamepadSupport.gamepads = [];

            // We only refresh the display when we detect some gamepads are new
            // or removed; we do it by comparing raw gamepad table entries to
            // “undefined.”
            var gamepadsChanged = false;

            for (var i = 0; i < rawGamepads.length; i++) {

                if (typeof rawGamepads[i] != gamepadSupport.prevRawGamepadTypes[i]) {
                    gamepadsChanged = true;
                    gamepadSupport.prevRawGamepadTypes[i] = typeof rawGamepads[i];
                }

                if (rawGamepads[i]) {
                    gamepadSupport.gamepads.push(rawGamepads[i]);
                }
            }

            // Ask the tester to refresh the visual representations of gamepads
            // on the screen.
            if (gamepadsChanged) {
                //tester.updateGamepads(gamepadSupport.gamepads);
            }
        }
    },

    //appelé quand l'état du gamepad a changé
    updateDisplay: function(gamepadId) {
        if (!activateEvent)
            return;


        var gamepad = gamepadSupport.gamepads[gamepadId];
//recup bouton
        var button;
        if (gamepad.buttons[0])
            button = 0;
        if (gamepad.buttons[1])
            button = 1;
        if (gamepad.buttons[2])
            button = 2;
        if (gamepad.buttons[3])
            button = 3;
        if (gamepad.buttons[8])
            button = 8;
        if (gamepad.buttons[9])
            button = 9;

//traitement bouton
        if (button != undefined && activateEvent) {
            switch (button) {
                case 0:
                    var robot = getRobotPosition("green");
                    selectRobot(robot.column, robot.line);
                    break;
                case 1:
                    var robot = getRobotPosition("red");
                    selectRobot(robot.column, robot.line);
                    break;
                case 2:
                    var robot = getRobotPosition("blue");
                    selectRobot(robot.column, robot.line);
                    break;
                case 3:
                    var robot = getRobotPosition("yellow");
                    selectRobot(robot.column, robot.line);
                    break;
                case 8:
                    cancelLast();
                    break;
                case 9:
                    deleteProposition();
                    break;
                default:
                    break;
            }
        }

        //recup stick
        var axis;
        var value;
        if (gamepad.axes[0] == 1 || gamepad.axes[0] == -1) {
            axis = 0;
            if (gamepad.axes[0] == 1)
                value = 1;
            else
                value = -1;
        }

        if (gamepad.axes[1] == 1 || gamepad.axes[1] == -1) {
            axis = 1;
            if (gamepad.axes[1] == 1)
                value = 1;
            else
                value = -1;
        }

        if (gamepad.axes[5] == 1 || gamepad.axes[5] == -1) {
            axis = 5;
            if (gamepad.axes[5] == 1)
                value = 1;
            else
                value = -1;
        }

        if (gamepad.axes[6] == 1 || gamepad.axes[6] == -1) {
            axis = 6;
            if (gamepad.axes[6] == 1)
                value = 1;
            else
                value = -1;
        }


        //traitement dir
        if (axis != undefined && activateEvent) {
            var dir;
            if ((axis == 0 || axis == 5) && value == -1) {
                dir = "left";
            }
            if ((axis == 0 || axis == 5) && value == 1) {
                dir = "right";
            }
            if ((axis == 1 || axis == 6) && value == -1) {
                dir = "up";
            }
            if ((axis == 1 || axis == 6) && value == 1) {
                dir = "down";
            }
            // if (dir === undefined || !activateEvent)
            //  return;
            var position = getNext(dir);
            if (position === undefined)
                return;
            moveRobot(position.c, position.l);
        }
    }
};

var ipadSupport = {
    init: function() {
        window.addEventListener('orientationchange', ipadSupport.orientationChanged, false);
    },
    orientationChanged: function(event) {
        var dir;
        event.preventDefault();
        switch (window.orientation) {
            case 0:
                dir = "down";
                break;
            case -90:
                dir = "right";
                break;
            case 90:
                dir = "left";
                break;
            case 180:
                dir = "up";
                break;
            default :
                break;

        }
        var position = getNext(dir);
        if (position === undefined)
            return;
        moveRobot(position.c, position.l);
    }
}