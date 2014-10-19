function GameOfLife(options) {
  options = options || {};
  if(!(this instanceof GameOfLife))
    return new GameOfLife(this.options);
  
  this.options = {
    canvas: options.canvas || document.getElementById('game-of-life'),
    size: options.size || 20,
    fps: options.fps || 30,
    gameOnOverCallback: options.gameOnOverCallback || function() {},
    gameOnStartCallback: options.gameOnStartCallback || function() {}
  };

  this.cells          = createMatrix(this.options.size);
  this.context        = this.options.canvas.getContext('2d');
  this.iteration      = 0;
  this.recordedFrames = [];
  this.isGameRunning  = false;

  function createMatrix(size) {
    var matrix = new Array(size),
    matrixLength = matrix.length;
    for(var i = 0; i < matrixLength; i++) {
      matrix[i] = new Array(size);
    }
    return matrix;
  }

  function drawCell(x, y, color) {
    var multiplier = 1;
    this.context.fillStyle = color;
    this.context.fillRect(
      multiplier * this.options.canvas.width / this.options.size * x,
      multiplier * this.options.canvas.height / this.options.size * y,
      multiplier * this.options.canvas.width / this.options.size - 1,
      multiplier * this.options.canvas.height / this.options.size - 1
    );
  }

  this.fillRandomCells = function(chance) {
    var _this = this;
    this.walkThroughMatrix(this.cells, function(row, col) {
      _this.cells[row][col] = Math.random() * 2 | 0 > 1 ? 1 : 0;
    });
  };

  this.walkThroughMatrix = function(matrix, callback) {
    var matrixLength = matrix.length,
        innerMatrixLength = 0;
    for(var y = 0; y < matrixLength; y++) {
      innerMatrixLength = matrix[y].length;
      for(var x = 0; x < innerMatrixLength; x++) {
        callback.call(null, x, y);
      }
    }
  };

  this.createNextGenCells = function(cells) {
    var _this = this,
        newCells = createMatrix(this.options.size);

    this.walkThroughMatrix(cells, function(x, y) {
      var aliveNeighboursCount = _this.getAliveNeighboursCount(cells, y, x);

      if(cells[y][x]) {
        if(aliveNeighboursCount < 2 || aliveNeighboursCount > 3) {
          newCells[y][x] = 0;
        } else if (aliveNeighboursCount === 2 || aliveNeighboursCount === 3) {
          newCells[y][x] = 1;
        }
      } else {
        newCells[y][x] = aliveNeighboursCount === 3 ? 1 : 0;
      }
    });

    return newCells;
  };

  this.getAliveNeighboursCount = function(cells, row, col) {
    var last = cells.length - 1,
        row_above = row - 1 >= 0 ? row - 1 : last,
        row_below = row + 1 <= last ? row + 1 : 0,
        col_left  = col - 1 >= 0 ? col - 1 : last,
        col_right = col + 1 <= last ? col + 1 : 0;

    var neighbours = [
      cells[row_above][col_left],
      cells[row_above][col],
      cells[row_above][col_right],
      cells[row][col_left],
      cells[row][col_right],
      cells[row_below][col_left],
      cells[row_below][col],
      cells[row_below][col_right]
    ];

    return neighbours.reduce(function(prev, curr) { return prev + curr; });
  };

  this.framesEqual = function(frame1, frame2) {
    // TODO: the name squished, really?
    if(frame1 !== undefined && frame2 !== undefined) {
      return frame1.join('') === frame2.join('');
    }
  };

  this.drawProgress = function() {
    var _this = this;

    this.recordedFrames.unshift(this.cells);
    this.recordedFrames = this.recordedFrames.slice(0, 3);

    if(this.framesEqual(this.recordedFrames[0], this.recordedFrames[2])) {
      this.gameOver();
      return false;
    }

    this.updateIterationItem(this.iteration++);

    // clear canvas
    this.context.clearRect(0, 0, this.options.canvas.width , this.options.canvas.height);

    // draw each cell
    this.walkThroughMatrix(this.cells, function(x, y) {
      drawCell.call(_this, x, y, _this.cells[y][x] ? "#000" : "transparent");
    });

    // get new generation cells
    var newCells = this.createNextGenCells(this.cells);
    this.cells = newCells;
    // rinse & repeat
  };

  // TODO: make callback for each frame move this there
  this.updateIterationItem = function(iteration) {
    document.querySelector('.iterations').innerHTML = "Iteration: " + iteration;
  };

  this.automateProgress = function() {
    var _this    = this,
        fps      = this.options.fps,
        now,
        then     = Date.now(),
        interval = 1000/fps,
        delta;
    console.log(this.isGameRunning);
    function draw() {
      _this.animationFrame = requestAnimationFrame(draw);
      now = Date.now();
      delta = now - then;

      if (delta > interval) {
        then = now - (delta % interval);
          _this.drawProgress();
      }
    }

    draw();
  };

  this.start = function() {
    if(!this.isGameRunning) {
      this.isGameRunning = true;
      this.fillRandomCells(5);
      this.options.gameOnStartCallback.call(null);
      this.automateProgress();
    }
  };

  this.reStart = function() {
    this.iteration = 0;
    this.cells = createMatrix(this.options.size);
    this.recordedFrames = [];
    this.isGameRunning = false;
    this.start();
  };

  this.gameOver = function() {
    this.isGameRunning = false;
    window.cancelAnimationFrame(this.animationFrame);
    this.options.gameOnOverCallback.call(null, this.iteration - 1);
  };
}
