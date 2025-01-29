// const { Chess } = require('chess.js');

var board = null
var game = new Chess()

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

var circleStyle = `
    position: absolute;
    width: 80%; /* Circle will be 60% of the square's width */
    height: 80%; /* Circle will be 60% of the square's height */
    border: .6rem solid rgba(128, 128, 128, 0.7); /* Grey color with 50% transparency */
    border-radius: 50%; /* Make it round */
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
    // Remove all highlights and dots
    if (selectedSquare === square) {
        // Deselect the square if it's clicked again
        selectedSquare = null;
        return;
    }
    console.log('Square clicked3:', square, selectedSquare);

    // Highlight the clicked square
    selectedSquare = square;
    highlightCurrentSquare(square);
    // Get valid moves for the selected square
    var moves = game.moves({
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
    console.log('Selected square: ' + selectedSquare);
    // If no square is selected, ignore the click
    if (!selectedSquare) return;

    // Try to make a move
    var move = game.move({
        from: selectedSquare,
        to: destinationSquare,
        promotion: 'q' // Always promote to a queen for simplicity
    });

    // If the move is illegal, keep the selection
    if (move === null) {
        console.log('Illegal move');
        return;
    }

    // Play the move sound and log the move
    moveSound.play();
    console.log(move);

    // Update the board position
    board.position(game.fen());

    // Clear the selection
    selectedSquare = null;

    // Remove all highlights and dots
    removeDotSquares();
}


// Function to add a dot on a square for valid moves
function dotSquare(square, isThreatened) {
    var $square = $('#board .square-' + square);

    if (isThreatened) {
        // Add the circle for threatened square
        var $circle = $('<div class="circle"></div>').attr('style', circleStyle);
        $square.append($circle);
    } else {
        // Add the dot for normal valid move square
        var $dot = $('<div class="dot"></div>').attr('style', dotStyle);
        $square.append($dot);
    }
}

function onDragStart(source, piece) {
    // do not pick up pieces if the game is over
    if (game.game_over()) return false

    // or if it's not that side's turn
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false
    }
}

function onDrop(source, target) {
    removeDotSquares()

    // see if the move is legal
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    })

    // illegal move
    if (move === null) return 'snapback'
    moveSound.play();
    console.log(move)

}

function onMouseoverSquare(square, piece) {
    var moves = game.moves({
        square: square,
        verbose: true
    });

    if (moves.length === 0) return;

    // Highlight the square currently holding the piece
    highlightCurrentSquare(square);

    // Highlight valid move squares with a dot
    moves.forEach(move => {
        // Check if the move is a capture by looking for 'x' in the SAN
        if (move.san.includes('x')) {
            dotSquare(move.to, true); // Highlight as a threatened (capture) square
        } else {
            dotSquare(move.to, false); // Highlight as a normal valid move
        }
    });
}

function onMouseoutSquare(square, piece) {
    removeDotSquares()
}

function onSnapEnd() {
    board.position(game.fen())
}

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
var board = Chessboard('board', config);

// Add click-based event handlers using event delegation
$('#board').on('click', '.square-55d63', function () {
    var square = $(this).attr('data-square'); // Get the square from the clicked element
    console.log('Square clicked:', square, selectedSquare);

    if (!selectedSquare) {
        console.log('Square clicked1:', square, selectedSquare);
        // First click: select the square
        onSquareClick(square);
    } else {
        console.log('Square clicked2:', square, selectedSquare);
        // Second click: try to move
        onSquareSelect(square);
    }
});

$(window).resize(function () {
    board.resize();
});
