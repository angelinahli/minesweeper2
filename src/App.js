import React from 'react';
import _ from 'lodash';
import './App.css';

const DEFAULT_NUM_MINES = 10
const DEFAULT_HEIGHT = 10
const DEFAULT_WIDTH = 15;

class Cell {
  constructor(row, col, neighboringMines, isMine) {
    this.row = row;
    this.col = col;
    this.neighboringMines = neighboringMines;
    this.isMine = isMine;
    this.isVisible = false;
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
    this.state = this.getInitState();
  }

  // initialize game

  getInitState() {
    const mines = this.getRandomMines();
    const grid = this.getNewGrid(mines);
    return {
      mines: mines,
      grid: grid,
      numVisible: 0,
      gameOver: false,
      won: false
    }
  }

  getNewGrid(mines) {
    const grid = [];
    for(let i = 0; i < this.props.height; i++) {
      const row = [];
      for(let j = 0; j < this.props.width; j++) {
        row.push( new Cell(i, j, 0, false) );
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
    const getValidCoord = (num, maxIndex) => Math.min(Math.max(num, 0), maxIndex);
    const rowLower = getValidCoord(mine.row - 1, this.props.height - 1);
    const rowUpper = getValidCoord(mine.row + 1, this.props.height - 1);
    const colLower = getValidCoord(mine.col - 1, this.props.width - 1);
    const colUpper = getValidCoord(mine.col + 1, this.props.width - 1);
    for(let row = rowLower; row <= rowUpper; row++) {
      for(let col = colLower; col <= colUpper; col++) {
        if(!grid[row][col].isMine) {
          grid[row][col].neighboringMines += 1;
        }
      }
    }
  }

  getRandomMines() {
    const mines = [];
    const mineAlreadyExists = (mine) => mines.some((m) => m.equals(mine));
    for(let i = 0; i < this.props.numMines; i++) {
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
    return new Cell(row, col, "X", true);
  }

  // change handlers

  handleNewGameClick() {
    this.setState(this.getInitState());
  }

  handleCellClick(row, col) {
    if(this.state.gameOver) { return; }
    this.updateVisibility(row, col);
  }

  updateVisibility(row, col) {
    // ignore if error
    const moveIsInvalid = !this.isValidCoordinate(row, col)
                          || this.state.grid[row][col].isVisible;
    if(moveIsInvalid) { return; }

    const gridCopy = this.state.grid.slice();
    gridCopy[row][col].isVisible = true;
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
    const hasLost = this.state.mines.some((mine) => mine.isVisible);
    const hasWon = (this.props.numCells - this.props.numMines) === this.state.numVisible;
    if(hasLost) {
      this.setState({ 
        gameOver: true, 
        won: false
      });
      this.turnAllCellsVisible();
    } 
    else if(hasWon) {
      this.setState({
        gameOver: true,
        won: true
      });
      this.turnAllCellsVisible();
    }
  }

  turnAllCellsVisible() {
    const gridCopy = this.state.grid.slice();
    for(let row = 0; row < this.props.height; row++) {
      gridCopy[row].map(val => val.isVisible = true);
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
    if(!this.state.gameOver) {
      contents = this.renderResetButton("New Game");
    } else {
      let gameStatusText = this.state.won
        ? <h2 className="text-won">You Won!</h2>
        : <h2 className="text-lost">You Lost...</h2>;
      
      contents = (
        <div className="container">
          <h4>{ gameStatusText }</h4>
          { this.renderResetButton("Play Again") }
        </div>
      );
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

  renderGrid() {
    const gridElements = [];
    for(let row = 0; row < this.props.height; row++) {
      const rowElements = [];
      for(let col = 0; col < this.props.width; col++) {
        rowElements.push(this.renderCell(row, col));
      }
      const renderedRow = (
        <div className="grid-row" key={ "row" + row }>
          { rowElements }
        </div>
      );
      gridElements.push(renderedRow);
    }
    return (
      <div className="grid-container">
        { gridElements }
      </div>
    );
  }

  renderCell(row, col) {
    const cellData = this.state.grid[row][col];
    const cName = "cell " + this.getCellImageName(cellData);
    const isDisabled = cellData.isVisible || this.state.gameOver;
    
    if(isDisabled) {
      return <button key={ "cell" + row + "_" + col } 
                     disabled
                     className={ cName }></button>;
    } else {
      return <button key={ "cell" + row + "_" + col } 
                   onClick={ () => this.handleCellClick(row, col) }
                   className={ cName }></button>;
    }
  }

  getCellImageName(cellData) {
    if(!cellData.isVisible) {
      return "hidden";
    } else if(cellData.isMine) {
      return this.state.won ? "mine-unhit" : "mine-hit";
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
            <Minesweeper numMines={ DEFAULT_NUM_MINES }
                         numCells={ DEFAULT_HEIGHT * DEFAULT_WIDTH }
                         height={ DEFAULT_HEIGHT }
                         width={ DEFAULT_WIDTH } />
          <div className="col-lg-2 col-md-1" />
          </div>
        </div>
      </div>
    )
  }
}

export default App;
