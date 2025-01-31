// const { Chess } = require('chess.js');
import { connectWebSocket, sendMessage, closeConnection, registerMessageHandler, unregisterMessageHandler } from './ws.js';

const ColorWhite = 1;
const ColorBlack = 2;

var currentGame = {
    game: null,  // Chess.js instance
    board: null, // Chessboard.js instance
    gameId: null,
    matchId: null,
    color: null,
    opponent: {
        id: null,
    }
};



var whiteSquareYellow = '#F5F58D'
var blackSquareYellow = '#BAC949'

var selectedSquare = null;


var moveSound = new Audio('../../assets/sounds/move2.mp3');

var dotStyle = `
    position: absolute;
    width: 30%; /* The dot will be 50% of the square's width */
    height: 30%; /* The dot will be 50% of the square's height */
    background-color: rgba(0, 0, 0, 0.3); /* Semi-transparent black */
    border-radius: 50%; /* Fully round dot */
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
`;

// Function to remove all highlights and dots
function removeDotSquares() {
    $('#board .square-55d63').css('background', '').find('.dot').remove();
    $('#board .square-55d63').find('.circle').remove();
}

function highlightCurrentSquare(square) {
    var $square = $('#board .square-' + square);

    var background = whiteSquareYellow;
    if ($square.hasClass('black-3c85d')) {
        background = blackSquareYellow;
    }

    $square.css('background', background);
}


// Function to handle click on a square
function onSquareClick(square) {
    selectedSquare = square;
    highlightCurrentSquare(square);
    // Get valid moves for the selected square
    var moves = currentGame.game.moves({
        square: square,
        verbose: true
    });

    // If no valid moves, reset selection
    if (moves.length === 0) {
        selectedSquare = null;
        return;
    }

    // Highlight valid move squares
    moves.forEach(move => {
        if (move.san.includes('x')) {
            dotSquare(move.to, true); // Highlight as a threatened (capture) square
        } else {
            dotSquare(move.to, false); // Highlight as a normal valid move
        }
    });
}

function onSquareSelect(destinationSquare) {
    // If no square is selected, ignore the click
    if (!selectedSquare) return;

    if (selectedSquare === destinationSquare) {
        // Deselect the square if it's clicked again
        selectedSquare = null;
        removeDotSquares();
        return;
    }

    const piece = currentGame.game.get(destinationSquare)
    if (piece && piece.color == currentGame.game.turn()) {
        selectedSquare = destinationSquare; // Change selection to the new piece
        removeDotSquares(); // Remove previous highlights
        highlightCurrentSquare(destinationSquare); // Highlight new selection
        var moves = currentGame.game.moves({
            square: destinationSquare,
            verbose: true
        });

        // If no valid moves, reset selection
        if (moves.length === 0) {
            selectedSquare = null;
            return;
        }

        moves.forEach(move => {
            if (move.san.includes('x')) {
                dotSquare(move.to, true); // Highlight as a threatened (capture) square
            } else {
                dotSquare(move.to, false); // Highlight as a normal valid move
            }
        });

        return;
    }

    // Try to make a move
    var move = currentGame.game.move({
        from: selectedSquare,
        to: destinationSquare,
        promotion: 'q' // Always promote to a queen for simplicity
    });

    // If the move is illegal, keep the selection
    if (move === null) {
        selectedSquare = null;
        return;
    }

    // Play the move sound and log the move
    moveSound.play();

    // Update the board position
    currentGame.board.position(currentGame.game.fen());

    // Clear the selection
    selectedSquare = null;

    // Remove all highlights and dots
    removeDotSquares();
}


// Function to add a dot on a square for valid moves
function dotSquare(square, isThreatened) {
    var $square = $('#board .square-' + square);

    if (isThreatened) {
        $square.css('background', 'radial-gradient(circle, rgba(255, 0, 0, 0.6) 100%, rgba(255, 0, 0, 0) )');
    } else {
        // Add the dot for normal valid move square
        var $dot = $('<div class="dot"></div>').attr('style', dotStyle);
        $square.append($dot);
    }
}

function onDragStart(source, piece) {
    // Prevent picking up pieces if the game is over
    if (currentGame.game.game_over()) return false;

    if (currentGame.gameId) {
        // Prevent dragging opponent's pieces
        if ((currentGame.color === ColorWhite && piece.search(/^b/) !== -1) ||
            (currentGame.color === ColorBlack && piece.search(/^w/) !== -1)) {
            return false;
        }
    }

    if ((currentGame.color === ColorWhite && piece.search(/^b/) !== -1) ||
        (currentGame.color === ColorBlack && piece.search(/^w/) !== -1)) {
        return false;
    }
}


function onDrop(source, target) {
    removeDotSquares(); // Clear any highlights

    // Check if the move is legal
    var move = currentGame.game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to a queen for simplicity
    });

    // If the move is illegal, return the piece to its original position (snapback)
    if (move === null) {
        return 'snapback';
    }

    // If the move is valid, update the board
    if (currentGame.gameId) {
        sendMove(move.san);
    }
    moveSound.play();

    // Update the board position
    currentGame.board.position(currentGame.game.fen());
}


function onMouseoverSquare(square, piece) {
    var moves = currentGame.game.moves({
        square: square,
        verbose: true
    });

    if (moves.length === 0) return;

    // Highlight the square currently holding the piece

    // Highlight valid move squares with a dot
    if (!selectedSquare) {
        highlightCurrentSquare(square);
        moves.forEach(move => {
            // Check if the move is a capture by looking for 'x' in the SAN
            if (move.san.includes('x')) {
                dotSquare(move.to, true); // Highlight as a threatened (capture) square
            } else {
                dotSquare(move.to, false); // Highlight as a normal valid move
            }
        });
    }
}

function onMouseoutSquare(square, piece) {
    if (!selectedSquare) {
        removeDotSquares();
    }
}


function sendMove(move) {
    const data = {
        game_id: currentGame.gameId,
        player_id: user.ID,
        move: move,
        timestamp: Date.now()
    };

    const jsonData = JSON.stringify(data);

    const base64Data = btoa(jsonData);

    const msg = {
        type: "player_moved",
        data: base64Data
    };

    sendMessage(msg);
}

function onSnapEnd() {
    currentGame.board.position(currentGame.game.fen())
}


// **Initialize the board**
function initializeBoard() {
    currentGame.game = new Chess(); // Create a new game instance

    var config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onMouseoutSquare: onMouseoutSquare,
        onMouseoverSquare: onMouseoverSquare,
        onSnapEnd: onSnapEnd,
        pieceTheme: '../../assets/img/pieces/{piece}.svg',
    }
    currentGame.board = Chessboard('board', config);
}

async function findMatch(user) {
    try {
        // Convert the user object to JSON and then to Base64
        const userJson = JSON.stringify(user);
        const userBase64 = btoa(userJson); // Encode JSON as Base64

        const response = await fetch("http://localhost:8082/user/match", {
            method: "GET",
            headers: {
                "X-User-Data": userBase64,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch match data");
        }

        const matchData = await response.json();
        const matchJson = JSON.stringify(matchData);
        const encoder = new TextEncoder();
        const matchBinary = encoder.encode(matchJson); // Convert to Uint8Array
        const matchBase64 = btoa(String.fromCharCode(...matchBinary)); // Convert binary to Base64

        currentGame.matchId = matchData.id;

        const message = {
            id: matchData.id,
            type: "find_match",
            timestamp: Date.now(),
            data: matchBase64
        };

        // Send message over WebSocket
        sendMessage(message);
    } catch (error) {
        console.error("Error finding match:", error);
    }
}

// Example user object
const user = {
    ID: Math.floor(Math.random() * 100001).toString(),
    Level: 0
};


// **Handle 'game_created' event**
function handleGameCreated(base64Data) {
    const decodedData = atob(base64Data);

    let gameData;
    try {
        gameData = JSON.parse(decodedData);
    } catch (error) {
        console.error("Error parsing game data:", error);
        return;
    }

    if (gameData && gameData.game_id && currentGame.matchId === gameData.match_id) {
        if (gameData.player1.id == user.ID) {
            currentGame.color = gameData.player1.color;
            currentGame.opponent.id = gameData.player2.id;
        } else if (gameData.player2.id == user.ID) {
            currentGame.color = gameData.player2.color;
            currentGame.opponent.id = gameData.player1.id;
        }

        // Flip the board based on the player's color
        const orientation = (currentGame.color === ColorWhite) ? 'white' : 'black';


        currentGame.gameId = gameData.game_id;
        currentGame.game.reset();
        currentGame.board.position(currentGame.game.fen());
        console.log("Game Created:", currentGame);

        // Apply the correct orientation
        currentGame.board.orientation(orientation);

        return
    }
    console.log("Invalid game data:", gameData);
}

// **Handle 'move_approved' event**
function handleMoveApproved(base64Data) {
    const decodedData = atob(base64Data);
    const moveData = JSON.parse(decodedData);
    if (moveData.game_id == currentGame.gameId && moveData.player_id == currentGame.opponent.id) {
        const m = currentGame.game.move(moveData.move);
        currentGame.board.position(currentGame.game.fen());
        moveSound.play();
    }
}

// **Handle 'game_ended' event**
function handleGameEnded(base64Data) {
    console.log("Game Ended:", base64Data);
    alert("Game Over!");
}

function handleError(base64Data) {
    // parse base64 data
    const decodedData = atob(base64Data);
    console.error("Error:", decodedData);
}

console.log("Registering message handlers");

registerMessageHandler("game_created", handleGameCreated);
registerMessageHandler("move_approved", handleMoveApproved);
registerMessageHandler("game_ended", handleGameEnded);
registerMessageHandler("err", handleError);


console.log("Connecting WebSocket");

connectWebSocket("ws://localhost:8083/ws", user);

initializeBoard();

// Add event listener to button
document.getElementById("find-match").addEventListener("click", function () {
    findMatch(user);
});


// **Handle cleanup on page unload**
window.addEventListener("beforeunload", () => {
    unregisterMessageHandler("game_created");
    unregisterMessageHandler("move_approved");
    unregisterMessageHandler("game_ended");
});


// $('#board').on('click', '.square-55d63', function (event) {
//     console.log("Square clicked:", event.target); // Log the clicked square

//     // Get the square identifier (e.g., 'e4', 'd5', etc.)
//     var square = $(this).attr('data-square');
//     console.log('Square clicked:', square, selectedSquare);

//     if (!square) return; // Avoid undefined values

//     if (!selectedSquare) {
//         onSquareClick(square); // First click selects the piece
//     } else {
//         onSquareSelect(square); // Second click makes the move
//     }
// });

// $('#board').on('click', '.piece-417db', function (event) {
//     console.log("Piece clicked:", event.target); // Log the clicked piece

//     // Get the square identifier from the parent square of the piece
//     var square = $(this).closest('.square-55d63').attr('data-square');
//     console.log('Piece clicked:', square, selectedSquare);

//     if (!square) return; // Avoid undefined values

//     if (!selectedSquare) {
//         onSquareClick(square); // First click selects the piece
//     } else {
//         onSquareSelect(square); // Second click makes the move
//     }
// });


// Add click-based event handlers using event delegation
$('#board').on('click', '.square-55d63, .piece-417db', function (event) {
    var square = $(this).closest('.square-55d63').attr('data-square');

    if (!square) return; // Avoid undefined values

    if (!selectedSquare) {
        onSquareClick(square);
    } else {
        onSquareSelect(square);
    }
});

$(window).resize(function () {
    currentGame.board.resize();
});

