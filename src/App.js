import React from 'react';
import _ from 'lodash';
import './App.css';

const NUM_MINES_SETTINGS = {
  easy: 10,
  medium: 20,
  hard: 30
}
const HEIGHT = 10
const WIDTH = 15;

const GAME_MODE = {
  FLAG: "flag",
  SWEEP: "sweep",
  WON: "won",
  LOST: "lost"
}

const CELL_MODE = {
  FLAGGED: "flagged",
  VISIBLE: "visible",
  HIDDEN: "hidden"
}

class Cell {
  constructor(row, col, isMine) {
    this.row = row;
    this.col = col;
    this.isMine = isMine;
    this.neighboringMines = 0;
    this.mode = CELL_MODE.HIDDEN;
  }

  equals(cell) {
    return cell.row === this.row && cell.col === this.col;
  }
}   

class Minesweeper extends React.Component {
  /***
  A game of Minesweeper revolves around an n x n grid-game.
  * At the start of the game, a number of mines are initialized at random
    coordinates on the grid.
  * Each coordinate i, j (representing the cell grid[i][j] such that i < n && 
    j < n) that does not contain a mine, will indicate to the player how many
    mines are contained in the set of cells bordering grid[i][j]:
    { grid[a][b] | a in (i-1, i+1) && b in (j-1, j+1) }
  * Each turn, the player gets to indicate which co-ordinate they would like to
    play.
      * If the co-ordinate they chose contains a mine, the player loses.
      * If the co-ordinate they chose borders at least 1 mine, the value of
        that cell is revealed to the player.
      * If the co-ordinate they chose borders 0 mines, the entire area of cells
        up until the line of cells with a non 0 value are revealed to the player.
  ***/

  constructor(props) {
    /**
    props: {numMines: ..., width: ..., height: ...}
    Initializes a game of Minesweeper.
    Requires that numMines <= int((gridLength**2) / 2). - i.e. the maximum
        number of mines allowed = half the total number of cells.
    **/
    super(props);
    this.state = this.getNewGame(this.props.numMines);
  }

  // initialize game

  getNewGame(numMines) {
    const mines = this.getRandomMines(numMines);
    const grid = this.getNewGrid(mines);
    return {
      mines: mines,
      grid: grid,
      numVisible: 0,
      mode: GAME_MODE.SWEEP
    }
  }

  getNewGrid(mines) {
    const grid = [];
    for(let i = 0; i < this.props.height; i++) {
      const row = [];
      for(let j = 0; j < this.props.width; j++) {
        row.push( new Cell(i, j, false) );
      }
      grid.push(row);
    }
    // rewrite mine values:
    mines.map((mine) => grid[mine.row][mine.col] = mine);
    // increment borders to update neighboringMines:
    mines.map((mine) => this.incrementMineBorders(grid, mine));
    return grid;
  }

  incrementMineBorders(grid, mine) {
    const rowLower = this.getValidCoordinate(mine.row - 1, this.props.height - 1);
    const rowUpper = this.getValidCoordinate(mine.row + 1, this.props.height - 1);
    const colLower = this.getValidCoordinate(mine.col - 1, this.props.width - 1);
    const colUpper = this.getValidCoordinate(mine.col + 1, this.props.width - 1);
    
    for(let row = rowLower; row <= rowUpper; row++) {
      for(let col = colLower; col <= colUpper; col++) {
        if(!(row === mine.row && col === mine.col)) {
          grid[row][col].neighboringMines += 1;
        }
      }
    }
  }

  getValidCoordinate(num, maxIndex) {
    return Math.min(Math.max(num, 0), maxIndex);
  }

  getRandomMines(numMines) {
    const mines = [];
    const mineAlreadyExists = (newMine) => mines.some((m) => m.equals(newMine));
    for(let i = 0; i < numMines; i++) {
      let newMine = this.getRandomMine(this.props.height - 1, this.props.width - 1);
      while( mineAlreadyExists(newMine) ) {
        newMine = this.getRandomMine(this.props.height - 1, this.props.width - 1);
      }
      mines.push(newMine);
    }
    return mines;
  }

  getRandomMine(maxRowIndex, maxColIndex) {
    const row = _.random(maxRowIndex);
    const col = _.random(maxColIndex);
    return new Cell(row, col, true);
  }

  // change handlers

  handleNewGameClick() {
    this.setState(this.getNewGame(this.props.numMines));
  }

  handleToggleMode() {
    const newMode = this.toggleValue(this.state.mode, GAME_MODE.FLAG, GAME_MODE.SWEEP);
    this.setState({ mode: newMode });
  }

  toggleValue(val, val1, val2) {
    // if val === val1 returns val2 and vice versa
    return val === val1 ? val2 : val1;
  }

  handleCellClick(row, col) {
    switch(this.state.mode) {
      case GAME_MODE.SWEEP: {
        this.updateVisibility(row, col);
        break;
      }
      case GAME_MODE.FLAG: {
        this.flagCell(row, col);
        break;
      }
    }
  }

  flagCell(row, col) {
    // assume that the row, col is hidden currently; only hidden cells can be clicked
    const gridCopy = this.state.grid.slice();
    const newMode = this.toggleValue(gridCopy[row][col].mode, CELL_MODE.FLAGGED, CELL_MODE.HIDDEN);
    gridCopy[row][col].mode = newMode;
    this.setState({ grid: gridCopy });
  }

  updateVisibility(row, col) {
    // ignore if error
    const moveIsValid = this.isValidCoordinate(row, col) 
                        && this.state.grid[row][col].mode === CELL_MODE.HIDDEN;
    if(!moveIsValid) { return; }

    const gridCopy = this.state.grid.slice();
    gridCopy[row][col].mode = CELL_MODE.VISIBLE;
    this.setState(
      (prevState, props) => ({ grid: gridCopy, numVisible: prevState.numVisible + 1 }),
      this.checkGameOver
    );

    // recurse on neighbors
    if(this.state.grid[row][col].neighboringMines === 0) {
      this.updateVisibility(row - 1, col);
      this.updateVisibility(row + 1, col);
      this.updateVisibility(row, col - 1);
      this.updateVisibility(row, col + 1);
    }
  }

  isValidCoordinate(row, col) {
    return 0 <= row && row < this.props.height && 0 <= col && col < this.props.width;
  }

  checkGameOver() {
    const hasLost = this.state.mines.some((mine) => mine.mode === CELL_MODE.VISIBLE);
    const hasWon = (this.props.numCells - this.props.numMines) === this.state.numVisible;
    if(hasLost) {
      this.setState({ mode: GAME_MODE.LOST });
      this.turnAllCellsVisible();
    } 
    else if(hasWon) {
      this.setState({ mode: GAME_MODE.WON });
      this.turnAllCellsVisible();
    }
  }

  turnAllCellsVisible() {
    const gridCopy = this.state.grid.slice();
    for(let row = 0; row < this.props.height; row++) {
      gridCopy[row].map(val => val.mode = CELL_MODE.VISIBLE);
    }
    this.setState({ grid: gridCopy, numVisible: this.props.numCells });
  }

  render() {
    return (
      <div className="card minesweeper-card text-center">
        <div className="card-body">
          <h1 className="card-title">Minesweeper</h1>
          { this.renderGrid() }
        </div>
        <div className="card-footer">
          { this.renderControlPanel() }
        </div>
      </div>
    )
  }

  renderControlPanel() {
    let contents;
    switch(this.state.mode) {
      case GAME_MODE.SWEEP: {
        contents = (
          <div className="container">
            <h4 className="text-success">Sweep Mode</h4>
            <div className="btn-group" role="group" aria-label="Control Panel">
              { this.renderResetButton("New Game") }
              { this.renderToggleButton("Toggle Flag Mode") }
            </div>
          </div>
        );
        break;
      }
      case GAME_MODE.FLAG: {
        contents = (
          <div className="container">
            <h4 className="text-info">Flag Mode</h4>
            <div className="btn-group" role="group" aria-label="Control Panel">
              { this.renderResetButton("New Game") }
              { this.renderToggleButton("Toggle Sweep Mode") }
            </div>
          </div>
        );
        break;
      }
      case GAME_MODE.WON: {
        contents = (
          <div className="container">
            <h4 className="text-won">You Won!</h4>
            { this.renderResetButton("Play Again") }
          </div>
        );
        break;
      }
      case GAME_MODE.LOST: {
        contents = (
          <div className="container">
            <h4 className="text-lost">You Lost...</h4>
            { this.renderResetButton("Play Again") }
          </div>
        );
        break;
      }
    }

    return (
      <div className="container control-container">
      { contents }
      </div>
    )
  }

  renderResetButton(text) {
    return (
      <button className="btn btn-success new-game-button" 
              onClick={() => this.handleNewGameClick()}>
        { text }
      </button>
    );
  }

  renderToggleButton(text) {
    return (
      <button className="btn btn-info toggle-button"
              onClick={() => this.handleToggleMode()}>
        { text }
      </button>
    );
  }

  renderGrid() {
    const gridElements = [];
    for(let row = 0; row < this.props.height; row++) {
      for(let col = 0; col < this.props.width; col++) {
        gridElements.push(this.renderCell(row, col));
      }
    }
    return (
      <div className="container">
        <div className="grid-container">
          { gridElements }
        </div>
      </div>
    );
  }

  renderCell(row, col) {
    const cellData = this.state.grid[row][col];
    const cName = "cell " + this.getCellImageName(cellData);
    const cellEnabled = this.cellIsEnabled(cellData);
    
    if(!cellEnabled) {
      return <button key={ "cell" + row + "_" + col } 
                     disabled
                     className={ cName }></button>;
    } else {
      return <button key={ "cell" + row + "_" + col } 
                   onClick={ () => this.handleCellClick(row, col) }
                   className={ cName }></button>;
    }
  }

  cellIsEnabled(cellData) {
    if(this.state.mode === GAME_MODE.SWEEP) {
      return cellData.mode === CELL_MODE.HIDDEN;
    } else if(this.state.mode === GAME_MODE.FLAG) {
      return [CELL_MODE.HIDDEN, CELL_MODE.FLAGGED].includes(cellData.mode);
    }
    return false;
  }

  getCellImageName(cellData) {
    if(cellData.mode === CELL_MODE.HIDDEN) {
      return "hidden";
    } else if(cellData.mode === CELL_MODE.FLAGGED) {
      return "flagged";
    } else if(cellData.isMine && this.state.mode === GAME_MODE.WON) {
      return "mine-unhit";
    } else if(cellData.isMine && this.state.mode === GAME_MODE.LOST) {
      return "mine-hit";
    } else {
      switch(cellData.neighboringMines) {
        case 0: return "zero";
        case 1: return "one";
        case 2: return "two";
        case 3: return "three";
        case 4: return "four";
        case 5: return "five";
        case 6: return "six";
        case 7: return "seven";
        case 8: return "eight";
      }
    }
    throw "This should never happen!";
  }
}

class App extends React.Component {
  render() {
    return (
      <div className="container text-center">
        <div className="row">
          <div className="col-lg-2 col-md-1" />
          <div className="col-lg-8 col-md-10 app-container">
            <Minesweeper numMines={ NUM_MINES_SETTINGS.medium }
                         numCells={ HEIGHT * WIDTH }
                         height={ HEIGHT }
                         width={ WIDTH } />
          </div>
        </div>
      </div>
    )
  }
}

export default App;
