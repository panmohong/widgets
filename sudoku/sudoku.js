const n = 3;
const n2 = n * n;
const n3 = n * n2;
const n4 = n2 * n2;
const range = (length, start = 0, step = 1) => Array.from({ length }, (_, i) => i * step + start); // [start, start + step, ...]

/*
00 01 02   03 04 05   06 07 08
09 10 11   12 13 14   15 16 17
18 19 20   21 22 23   24 25 26

27 28 29   30 31 32   33 34 35
36 37 38   39 40 41   42 43 44
45 46 47   48 49 50   51 52 53

54 55 56   57 58 59   60 61 62
63 64 65   66 67 68   69 70 71
72 73 74   75 76 77   78 79 80
*/

class Cell {
  constructor(index, sudoku) {
    this.index = index;
    this.sudoku = sudoku;
    this.origin = null;
    this.setIndices();

    this.range = range(n2, 1);
    this.cube = this.exceptSelf(this.sudoku.cubes[this.cubeIndex]);
    this.row = this.exceptSelf(this.sudoku.rows[this.rowIndex]);
    this.col = this.exceptSelf(this.sudoku.cols[this.colIndex]);
  }

  setIndices() {
    this.rowIndex = Math.floor(this.index / n2);
    this.colIndex = this.index % n2;
    this.cubeRowIndex = Math.floor(this.index / n3);
    this.cubeColIndex = Math.floor((this.index % n2) / n);
    this.cubeIndex = this.cubeRowIndex * n + this.cubeColIndex;
  }

  exceptSelf(arr) {
    return arr.filter((c) => c !== this.index);
  }

  value() {
    if (this.range.length === 0) return 'x';
    if (this.range.length > 6) return '';
    return this.range.join('/');
  }

  init() {
    this.origin = null;
    this.range = range(n2, 1)
  }

  original(value) {
    this.origin = value;
    this.freeze(value, false);
  }

  restore() {
    if (this.origin) {
      this.freeze(this.origin, false);
    } else {
      this.range = range(n2, 1);
    }
  }

  freeze(value, graceful = true) {
    this.range = [value];
    if (!graceful) return [];
    return this.frozen();
  }

  frozen() {
    if (this.range.length !== 1) return [];
    const value = this.range[0];

    const newFrozenIndices = [];
    const affected = new Set(this.cube.concat(this.row).concat(this.col));
    affected.forEach(
      (index) => {
        if (!this.sudoku.cells[index].range.includes(value)) return;
        this.sudoku.cells[index].range = this.sudoku.cells[index].range.filter((c) => c !== value);
        const rangeLength = this.sudoku.cells[index].range.length;
        if (rangeLength < 1) throw 'Invalid';
        if (rangeLength === 1) newFrozenIndices.push(index);
      },
    );
    return newFrozenIndices;
  }
}

class Sudoku {
  constructor() {
    this.algos = {
      ONLY_CELL: true,
      EXCLUDE_SINGLE: true,
      EXCLUDE_DOUBLE: true,
      EXCLUDE_TRIPLE: true,
    }
    this.rows = Array.from(
      { length: n2 },
      (_, i) => range(n2, i * n2),
    );
    this.cols = Array.from(
      { length: n2 },
      (_, i) => range(n2, i, n2),
    );
    this.cubes = Array.from(
      { length: n2 },
      (_, i) => {
        const cubeRowIndex = Math.floor(i / n);
        const cubeColIndex = i % n;
        return Array.from(
          { length: n },
          (_, j) => range(n, cubeRowIndex * n3 + cubeColIndex * n + n2 * j),
        ).flat();
      },
    );
    this.cells = Array.from(
      { length: n4 },
      (_, i) => new Cell(i, this),
    )
  }

  load(matrix) {
    const rows = matrix.trim().split(/\s/);
    if (rows.length !== n2) console.error(`Height is ${rows.length}`);
    if (rows.filter((row) => row.length !== n2).length > 0) console.error('Width is incorrect');
    const valid = range(n2, 1);
    rows.forEach((row, rowIndex) => {
      row.split('').forEach((cell, colIndex) => {
        if (valid.includes(Number(cell))) {
          // this.freeze(rowIndex * n2 + colIndex, Number(cell), false);
          this.original(rowIndex * n2 + colIndex, Number(cell));
        }
      });
    })
  }

  init() {
    for (let i = 0, l = n4; i < l; i += 1) {
      this.cells[i].init();
    } 
  }

  original(index, value) {
    this.cells[index].original(value);
  }

  restore() {
    for (let i = 0, l = n4; i < l; i += 1) {
      this.cells[i].restore();
    }
  }

  freeze(index, value, graceful = true) {
    this.cells[index].freeze(value, graceful);
  }

  resolveAll() {
    const affected = {
      rowIndices: range(n2),
      colIndices: range(n2),
      cubeIndices: range(n2),
    };
    this.resolveAffected(affected);
  }

  resolveAffected(affected) {
    let loopCells = [];
    while (true) {
      loopCells = [].concat(
        Array.from(new Set(affected.cubeIndices)).map(
          (cube) => this.cubes[cube],
        ),
      ).concat(
        Array.from(new Set(affected.rowIndices)).map(
          (row) => this.rows[row],
        ),
      ).concat(
        Array.from(new Set(affected.colIndices)).map(
          (col) => this.cols[col],
        ),
      );
      console.debug(`round ${JSON.stringify(affected)}`);
      // console.debug(JSON.stringify(loopCells));
      if (loopCells.length < 1) break;
      affected.cubeIndices = [];
      affected.rowIndices = [];
      affected.colIndices = [];

      loopCells.forEach((cells) => {
        const newAffected = this.resolveCells(cells);
        affected.cubeIndices = affected.cubeIndices.concat(newAffected.cubeIndices);
        affected.rowIndices = affected.rowIndices.concat(newAffected.rowIndices);
        affected.colIndices = affected.colIndices.concat(newAffected.colIndices);
      });
    }
  }

  resolveCube(cubeRowIndex, cubeColIndex) {
    console.debug(`resolving cube ${cubeRowIndex} ${cubeColIndex}`)
    return this.resolveCells(this.cubes[cubeRowIndex * n + cubeColIndex]);
  }

  resolveRow(rowIndex) {
    console.debug(`resolving row ${rowIndex}`);
    return this.resolveCells(this.rows[rowIndex]);
  }

  resolveCol(colIndex) {
    console.debug(`resolving col ${colIndex}`);
    return this.resolveCells(this.cols[colIndex]);
  }

  resolveCells(cells) {
    // console.debug(`resolving ${JSON.stringify(cells)}`)
    const affected = {
      cubeIndices: [],
      rowIndices: [],
      colIndices: [],
    };

    this.algos.EXCLUDE_SINGLE && this.algoExcludeSingle(cells, affected);
    this.algos.ONLY_CELL && this.algoOnly(cells, affected);
    this.algos.EXCLUDE_DOUBLE && this.algoExcludePair(cells, affected);

    // console.debug(`affected ${JSON.stringify(affected)}`);
    return affected;
  }

  algoExcludeSingle(cells, affected) {
    cells.forEach((cell) => {
      if (this.cells[cell].range.length !== 1) return;
      const value = this.cells[cell].range[0];
      // console.debug(`${cell} is ${value}`);
      const otherCells = cells.filter((other) => other !== cell);
      otherCells.forEach((otherCell) => {
        if (!this.cells[otherCell].range.includes(value)) {
          // console.debug(`${otherCell}: ${value} not in ${this.cells[otherCell].origin} ${JSON.stringify(this.cells[otherCell].range)}`);
          return;
        }
        // console.debug(`${otherCell}: removing ${value} from ${JSON.stringify(this.cells[otherCell].range)}`);

        affected.cubeIndices.push(this.cells[otherCell].cubeIndex);
        affected.rowIndices.push(this.cells[otherCell].rowIndex);
        affected.colIndices.push(this.cells[otherCell].colIndex);

        this.cells[otherCell].range = this.cells[otherCell].range.filter((x) => x !== value);
        if (this.cells[otherCell].range.length < 1) throw 'Invalid';
        if (this.cells[otherCell].range.length > 1) return;
        // console.debug(`affecting ${otherCell}: ${this.cells[otherCell].cubeIndex}, ${this.cells[otherCell].rowIndex}, ${this.cells[otherCell].colIndex}`)
      })
    })
  }

  algoExcludePair(cells, affected) {
    const pairs = {};
    cells.forEach((cell) => {
      if (this.cells[cell].range.length === 2) {
        pairs[cell] = JSON.stringify(this.cells[cell].range);
      }
    });
    const pairCells = Object.keys(pairs);
    if (pairCells.length < 2) return;
    for(let i = 0, l = pairCells.length; i < l; i += 1) {
      for(let j = i + 1, l = pairCells.length; j < l; j += 1) {
        if (pairs[pairCells[i]] !== pairs[pairCells[j]]) continue;
        // console.debug(`${cells} has pairs ${pairCells[i]} ${pairCells[j]} of ${pairs[pairCells[i]]}`);
        const value0 = Number(JSON.parse(pairs[pairCells[i]])[0]);
        const value1 = Number(JSON.parse(pairs[pairCells[i]])[1]);
        const otherCells = cells.filter((cell) => cell !== Number(pairCells[i]) && cell !== Number(pairCells[j]));
        otherCells.forEach((otherCell) => {
          const values = this.cells[otherCell].range;
          if (!values.includes(value0) && !values.includes(value1)) return;
          // console.debug(`${otherCell}: removing pairs ${value0} and ${value1} from ${JSON.stringify(values)}`);
          this.cells[otherCell].range = this.cells[otherCell].range.filter((x) => x !== value0 && x !== value1);

          affected.cubeIndices.push(this.cells[otherCell].cubeIndex);
          affected.rowIndices.push(this.cells[otherCell].rowIndex);
          affected.colIndices.push(this.cells[otherCell].colIndex);

          if (this.cells[otherCell].range.length < 1) throw 'Invalid';
          if (this.cells[otherCell].range.length > 1) return;
        })
      }
    }
  }

  algoOnly(cells, affected) {
    cells.forEach((cell) => {
      if (this.cells[cell].range.length === 1) return;
      const otherCells = cells.filter((other) => other !== cell);
      const otherCellValues = Array.from(new Set(otherCells.map((otherCell) => this.cells[otherCell].range).flat()));
      const onlyValue = this.cells[cell].range.find((value) => !otherCellValues.includes(value));
      if (!onlyValue) return;
      // console.debug(`${cell}: can only be ${onlyValue} in ${JSON.stringify(cells)}`);
      this.cells[cell].freeze(onlyValue, true);

      affected.cubeIndices.push(this.cells[cell].cubeIndex);
      affected.rowIndices.push(this.cells[cell].rowIndex);
      affected.colIndices.push(this.cells[cell].colIndex);
    })
  }
}

const CellItem = {
  name: 'CellItem',
  template: `<div
  class="cell"
  @click="onclick()"
  @dblclick="ondblclick()">
  <div v-if="origin" class="value red">{{ text }}</div>
  <div v-else class="value blue">{{ text }}</div>
</div>`,
  props: {
    cell: Cell,
  },
  data() {
    return {
    }
  },
  computed: {
    text() { return this.cell ? this.cell.value() : '' },
    origin() { return this.cell.origin },
  },
};

const SudokuBoard = {
  name: 'SudokuBoard',
  template: `<div class="sudoku-board">
  <div class="sudoku">
    <div
      v-for="i in n2"
      :key="i"
      class="row">
      <CellItem
        v-for="j in n2"
        :key="j"
        :cell="cells[(i-1)*n2+(j-1)]"
      ></CellItem>
    </div>
  </div>
  <div class="controls">
    <button @click="load">Load</button>
    <textarea :rows="n2" :cols="n2" v-model="matrix" :maxlength="n4*2" :placeholder="n2 + 'x' + n2 + ', only accepts 1-' + n2 + ' or *'"/>
  </div>
</div>`,
  components: { CellItem },
  data() {
    return {
      n2,
      sudoku: new Sudoku(),
      matrix: '',
    };
  },
  computed: {
    cells() { return this.sudoku.cells }
  },
  methods: {
    load() {
      if (/[^\d\s*]/.test(this.matrix)) return;
      const rows = this.matrix.trim().split(/\s/);
      if (rows.length !== this.n2 || rows.find((row) => row.length !== this.n2)) return;
      this.sudoku.init();
      this.sudoku.load(this.matrix);
      this.sudoku.resolveAll();
    }
  }
};

const vm = new Vue({ render: h => h(SudokuBoard) }).$mount('#sudoku');
window.sudoku = vm.$children[0].$data.sudoku;
// sudoku.freeze(0, 1, false);
/*
sudoku.load(`
1**7*2*36
3524***1*
****1**4*
2***6**97
**79*52**
83**2***5
*4**8****
*2***9873
69*2*3**4
`)
*/
sudoku.resolveAll();
sudoku.init();
sudoku.load(`
**5****4*
**2***8**
*7812**59
****43***
**9*6*4**
***51****
96**8571*
**4***5**
*1****9**
`)
sudoku.resolveAll();
