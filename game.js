function GameOfLife(options) {
  options = options || {};
  if(!(this instanceof GameOfLife))
    return new GameOfLife(this.options);
  
  this.options = {
    canvas: options.canvas || document.getElementById('game-of-life'),
    size: options.size || 20,
    fps: options.fps || 30,
    crazyColors: false,
    gameOnInitCallback: options.gameOnInitCallback || function() {},
    gameOnOverCallback: options.gameOnOverCallback || function() {},
    gameOnStartCallback: options.gameOnStartCallback || function() {},
    gameOnDrawCallback: options.gameOnDrawCallback || function() {},
    gameOnSavePatternCallback: options.gameOnSavePatternCallback || function() {},
    gameOnLoadPatternCallback: options.gameOnLoadPatternCallback || function() {}
  };

  _this = this;

  function drawCell(x, y, color) {
    this.context.fillStyle = color;
    this.context.lineWidth = 5;
    this.context.strokeStyle = '#003300';
    this.context.stroke();

    this.context.fillRect(
      this.options.canvas.width / this.options.size * x,
      this.options.canvas.height / this.options.size * y,
      this.options.canvas.width / this.options.size - 4,
      this.options.canvas.height / this.options.size - 4
    );
  }

  this.createMatrix = function(size) {
    var matrix = new Array(size),
    matrixLength = matrix.length;
    for(var i = 0; i < matrixLength; i++) {
      matrix[i] = new Array(size);
    }
    
    this.walkThroughMatrix(matrix, function(row, col) {
      matrix[row][col] = 0;
    });

    return matrix;
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
        newCells = this.createMatrix(this.options.size);

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
    if(frame1 !== undefined && frame2 !== undefined) {
      return frame1.join('') === frame2.join('');
    }
  };

  this.ageToColor = function(age) {
    if(age === 0) {
      return "#fff";
    }
    age *= 1000;
    age >>>= 0;
    var b = age & 0xFF,
        g = (age * 1000 & 0xFF00) >>> 8,
        r = (age & 0xFF0000) >>> 16,
        a = ( (age & 0xFF000000) >>> 24 ) / 255 ;

    return "rgba(" + [r, g, b, 0.25].join(",") + ")";
  };

  this.drawProgress = function(forced) {
    var _this = this;

    // record frame
    this.recordedFrames.unshift(this.cells);
    this.recordedFrames = this.recordedFrames.slice(0, 3);

    // check if first and third frame of last recorded frames are equal
    if(!forced && this.framesEqual(this.recordedFrames[0], this.recordedFrames[2])) {
      this.gameOver();
      return false;
    }

    this.options.gameOnDrawCallback.call(null, this.iteration++);

    // clear canvas
    this.context.clearRect(0, 0, this.options.canvas.width , this.options.canvas.height);

    // draw each cell and update their age
    this.walkThroughMatrix(this.cells, function(x, y) {
      // TODO: honestly, I don't know why do I have to check for iteration no. here
      if(_this.iteration > 1 && _this.cells[y][x] === 1) {
        _this.cellsAge[y][x]++;
      }

      var agedCellColor;
      if(_this.options.crazyColors) {
        agedCellColor = _this.ageToColor(_this.cellsAge[y][x]);
      } else {
        agedCellColor = "#fff";
      }

      drawCell.call(_this, x, y, _this.cells[y][x] ? "#000" : agedCellColor);
    });

    // get new generation cells
    var newCells = this.createNextGenCells(this.cells);
    this.cells = newCells;
    // rinse & repeat
  };

  this.automateProgress = function() {
    var _this    = this,
        fps      = this.options.fps,
        now,
        then     = Date.now(),
        interval = 1000/fps,
        delta;

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
      this.options.gameOnStartCallback.call(null);
      this.automateProgress();
    }
  };

  this.reStart = function() {
    this.iteration      = 0;
    this.cellsAge       = this.cells.slice(0);
    this.recordedFrames = [];
    this.isGameRunning  = false;
    this.start();
  };

  this.gameOver = function() {
    this.isGameRunning = false;
    window.cancelAnimationFrame(this.animationFrame);
    this.options.gameOnOverCallback.call(null, this.iteration - 1);
  };

  this.showCrazyColors = function() {
    this.options.crazyColors = true;
  };

  this.hideCrazyColors = function() {
    this.options.crazyColors = false;
  };

  this.clearCanvas = function() {
    var _this = this;
    this.iteration = 0;
    this.recorderFrames = [];
    this.cells = this.createMatrix(this.options.size);
    this.walkThroughMatrix(this.cells, function(x, y) {
      drawCell.call(_this, x, y, "#fff");
    });
  };

  this.savePattern = function() {
    var nameSpace = 'gameOfLife',
        localItem = window.localStorage.getItem(nameSpace) || false,
        data      = [];

    savedItems = localItem ? JSON.parse(localItem) : false;

    if(savedItems && savedItems.length > 0) {
      data = {
        id: savedItems.length + 1,
        pattern: this.cells
      };
      savedItems.push(data);
      window.localStorage.setItem(nameSpace, JSON.stringify(savedItems));

      // shoot callback
      this.options.gameOnSavePatternCallback.call(null, data);
    } else {
      data = [{ id: 1, pattern: this.cells }];
      window.localStorage.setItem(nameSpace, JSON.stringify(data));
    }
  };

  this.loadPattern = function(id) {
    var namespace   = 'gameOfLife',
        localItem   = window.localStorage.getItem(namespace) || false,
        loadedCells;

    savedItems = localItem ? JSON.parse(localItem) : false;

    if(savedItems && savedItems.length > 0) {
      loadedPattern = savedItems.filter(function(obj) {
        return obj.id === parseInt(id, 10);
      })[0];
    }

    this.cells = loadedPattern.pattern;
    this.drawProgress(true);

    // shoot callback
    this.options.gameOnLoadPatternCallback.call(null, loadedPattern);

    return loadedPattern;
  };

  function init() {
    _this               = this;
    this.context        = this.options.canvas.getContext('2d');
    this.cells          = this.createMatrix(this.options.size);
    this.cellSize       = this.options.canvas.width / this.options.size;
    this.iteration      = 0;
    this.recordedFrames = [];
    this.isGameRunning  = false;
    this.cellsAge       = this.cells;

    var mouseDownFlag = false,
        previousGridItem = 0;

    this.options.canvas.addEventListener('mousedown', function() {
      mouseDownFlag = true;
      mouseHandler('click');
    }, false);

    this.options.canvas.addEventListener('mousemove', function() {
      if(mouseDownFlag) {
        mouseHandler('drag');
      }
    }, false);

    this.options.canvas.addEventListener('mouseup', function() {
      mouseDownFlag = false;
    }, false);

    function mouseHandler(type) {
      // TODO: this is too complicated, should be more readable
      var clickedCell = getMousePos(event);

      if(type === 'click') {
        _this.cells[clickedCell.y][clickedCell.x] = _this.cells[clickedCell.y][clickedCell.x] === 1 ? 0 : 1;
        drawCellWrapper(clickedCell.x, clickedCell.y, _this.cells[clickedCell.y][clickedCell.x] === 1 ? "#000" : "#fff");
      } else if(type === 'drag') {
        var currentGridItem = {x: clickedCell.x, y: clickedCell.y};
        if(previousGridItem !== currentGridItem) {
          previousGridItem = {x: clickedCell.x, y: clickedCell.y};

          if(_this.cells[clickedCell.y][clickedCell.x] !== 1) {
            _this.cells[clickedCell.y][clickedCell.x] = _this.cells[clickedCell.y][clickedCell.x] === 1 ? 0 : 1;
          }

          drawCellWrapper(clickedCell.x, clickedCell.y, _this.cells[clickedCell.y][clickedCell.x] === 1 ? "#000" : "#fff");
        }
      }
    }

    function drawCellWrapper(x, y, color) {
      drawCell.call(_this, x, y, color);
    }

    function getMousePos(event) {
      var rect = _this.options.canvas.getBoundingClientRect();
      return {
        y: Math.floor((event.clientY - rect.top) / (rect.bottom-rect.top) * _this.options.canvas.height / _this.cellSize),
        x: Math.floor((event.clientX - rect.left) / (rect.right-rect.left) * _this.options.canvas.width / _this.cellSize)
      };
    }

    // draw first items so that the grid will be visible
    this.walkThroughMatrix(this.cells, function(x, y) {
      drawCell.call(_this, x, y, "#fff");
    });

    // shoot callback
    this.options.gameOnInitCallback.call(null);
  }

  init.call(this);
}
