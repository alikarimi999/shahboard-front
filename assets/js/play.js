config = {
    position: 'start',
    draggable: true,
    pieceTheme: '../../assets/img/pieces/{piece}.svg',
}
var board = Chessboard('board', config);
$(window).resize(board.resize)