const n = 3;
const range = (length, start = 0, step = 1) => Array.from({ length }, (_, i) => i * step + start); // [start, start + step, ...]
const trace = (...args) => console.log(...args);

/*
   0  1  2    3  4  5    6  7  8

0 00 01 02   03 04 05   06 07 08
1 09 10 11   12 13 14   15 16 17
2 18 19 20   21 22 23   24 25 26

3 27 28 29   30 31 32   33 34 35
4 36 37 38   39 40 41   42 43 44
5 45 46 47   48 49 50   51 52 53

6 54 55 56   57 58 59   60 61 62
7 63 64 65   66 67 68   69 70 71
8 72 73 74   75 76 77   78 79 80
*/

class DisplayCell {
  constructor(sudoku) {
    this.sudoku = sudoku;
    this.reset();
  }

  reset() {
    this.origin = null;
    this.range = Array.from(this.sudoku.valid);
  }

  init(value) {
    this.origin = value;
    this.range = [value];
  }

  restore() {
    this.origin ? this.init(this.origin) : this.reset();
  }

  get value() {
    if (this.range.length === 0) return 'x';
    if (this.range.length === this.sudoku.n2) return '';
    return this.range.join('/');
  }
}

class Cell extends DisplayCell {
  constructor(sudoku, index) {
    super(sudoku);
    this.index = index;
    this.setIndices();
    this.setDependents();
  }

  setIndices() {
    this.rowIndex = Math.floor(this.index / this.sudoku.n2);
    this.colIndex = this.index % this.sudoku.n2;
    const boxRowIndex = Math.floor(this.index / this.sudoku.n3);
    const boxColIndex = Math.floor((this.index % this.sudoku.n2) / this.sudoku.n);
    this.boxIndex = boxRowIndex * this.sudoku.n + boxColIndex;
  }

  setDependents() {
    this.dependents = Array.from(new Set([].concat(
      this.sudoku.rows[this.rowIndex],
    ).concat(
      this.sudoku.cols[this.colIndex],
    ).concat(
      this.sudoku.boxes[this.boxIndex],
    ))).filter((index) => index !== this.index);
  }

  frozen() {
    return this.range.length <= 1;
  }

  freeze(value, affected) {
    if (value === null || value === undefined) return;

    trace(`freeze ${this.index} to [${value}]`);
    this.range = [value];

    this.dependents.forEach((index) => {
      const cell = this.sudoku.cells[index];
      if (cell.origin) return;
      if (!cell.range.find((v) => v === value)) return;

      trace(`exclude ${value} from ${cell.index}`);

      cell.range = cell.range.filter((v) => v !== value);
      if (affected) {
        affected.rowIndices.push(cell.rowIndex);
        affected.colIndices.push(cell.colIndex);
        affected.boxIndices.push(cell.boxIndex);
      }
    });
  }

  exclude(values, affected) {
    if (this.origin) return;
    const newRange = this.range.filter((value) => !values.includes(value));
    if (newRange.length === this.range.length) return;

    trace(`exclude ${JSON.stringify(values)} from ${this.index}`);

    if (newRange.length === 1) {
      this.freeze(newRange[0], affected);
      return;
    }

    this.range = newRange;
    affected.rowIndices.push(this.rowIndex);
    affected.colIndices.push(this.colIndex);
    affected.boxIndices.push(this.boxIndex);
  }

  toString() {
    return `${this.index}(${this.rowIndex},${this.colIndex},${this.boxIndex})[${this.range.join('/')}]`;
  }
}

class Sudoku {
  constructor(n) {
    this.reset(n);
    this.applyAlgorithms({
      GROUP_EXCLUDE_VALUE_SIZE: 3,
      ONLY_CELL_FOR_VALUE: true,
      LINE_CROSS_BOX: true,
    });
  }

  reset(n) {
    if (n) {
      this.n = n;
      this.n2 = this.n * this.n;
      this.n3 = this.n * this.n2;
      this.n4 = this.n2 * this.n2;
    }

    this.valid = range(this.n2, 1);
    this.rows = this.valid.map((_, i) => range(this.n2, i * this.n2));
    this.cols = this.valid.map((_, i) => range(this.n2, i, this.n2));
    this.boxes = this.valid.map((_, i) => {
      const cubeRowIndex = Math.floor(i / this.n);
      const cubeColIndex = i % this.n;
      return Array.from(
        { length: this.n },
        (_, j) => range(this.n, cubeRowIndex * this.n3 + cubeColIndex * this.n + this.n2 * j),
      ).flat();
    });
    this.cells = range(this.n4).map((_, i) => new Cell(this, i));
  }

  applyAlgorithms(algorithms = {}) {
    this.algorithms = {
      ...this.algorithms,
      ...algorithms,
    };
  }

  load(matrix) {
    const rows = matrix.trim().split(/\s/);
    if (rows.length !== this.n2) {
      alert(`Height is ${rows.length}`);
      return;
    }

    if (rows.filter((row) => row.length !== this.n2).length > 0) {
      alert('Width is incorrect');
      return;
    }

    rows.forEach((row, rowIndex) => {
      row.split('').forEach((cell, colIndex) => {
        if (this.valid.includes(Number(cell))) {
          this.init(rowIndex * this.n2 + colIndex, Number(cell));
        }
      })
    });
  }

  init(index, value) {
    this.cells[index].init(value);
  }

  restore() {
    for (let i = 0, l = this.n4; i < l; i += 1) {
      this.cells[i].restore();
    }
  }

  resolve() {
    let thisRound = {
      rowIndices: range(this.n2, 0, 1),
      colIndices: range(this.n2, 0, 1),
      boxIndices: range(this.n2, 0, 1),
    };
    const nextRound = {
      rowIndices: [],
      colIndices: [],
      boxIndices: [],
    };
    while (
      thisRound.rowIndices.length > 0 ||
      thisRound.colIndices.length > 0 ||
      thisRound.boxIndices.length > 0
    ) {
      nextRound.rowIndices = [];
      nextRound.colIndices = [];
      nextRound.boxIndices = [];

      const cellGroups = [].concat(
        Array.from(new Set(thisRound.rowIndices)).map(
          (rowIndex) => this.rows[rowIndex],
        ),
      ).concat(
        Array.from(new Set(thisRound.colIndices)).map(
          (colIndex) => this.cols[colIndex],
        ),
      ).concat(
        Array.from(new Set(thisRound.boxIndices)).map(
          (boxIndex) => this.boxes[boxIndex],
        ),
      )

      cellGroups.forEach((cellIndices) => {
        this.resolveCellGroup(cellIndices, nextRound);
      });

      thisRound = {
        rowIndices: Array.from(new Set(nextRound.rowIndices)).sort(),
        colIndices: Array.from(new Set(nextRound.colIndices)).sort(),
        boxIndices: Array.from(new Set(nextRound.boxIndices)).sort(),
      };
    }
  }

  resolveCellGroup(cellIndices = [], affected) {
    this.algorithms.GROUP_EXCLUDE_VALUE_SIZE && this.groupExcludeValue(cellIndices, affected);
    this.algorithms.ONLY_CELL_FOR_VALUE && this.onlyCellForValue(cellIndices, affected);
    this.algorithms.LINE_CROSS_BOX && this.lineCrossBox(cellIndices, affected);
  }

  groupExcludeValue(cellIndices, affected) {
    range(this.algorithms.GROUP_EXCLUDE_VALUE_SIZE).forEach(
      (_, i) => this.groupExcludeOfSize(i + 1, cellIndices, affected),
    );
  }

  groupExcludeOfSize(size, cellIndices, affected) {
    if (size === 1) {
      cellIndices.forEach((cellIndex) => {
        const cell = this.cells[cellIndex];
        if (cell.frozen()) cell.freeze(cell.range[0], affected);
      });
      return;
    }

    const candidates = cellIndices
        .map((cellIndex) => this.cells[cellIndex])
        .filter((cell) => cell.range.length > 1 && cell.range.length <= size);
    if (candidates.length < size) return;
    if (candidates.length === size) {
      const excludeValues = Array.from(new Set(
        candidates.map((candidate) => candidate.range).flat(),
      ));
      if (excludeValues.length === size) {
        const candidateIndices = candidates.map((candidate) => candidate.index);
        const excludeIndices = cellIndices.filter(
          (cellIndex) => !candidateIndices.includes(cellIndex),
        );
        excludeIndices.map((excludeIndex) => {
          this.cells[excludeIndex].exclude(excludeValues, affected);
        })
      }
      return;
    }
    
    // candidates.length > size
    candidates.forEach((candidate) => {
      const must =
        candidate.range.length === size
          ? (cell) => !cell.range.find((v) => !candidate.range.includes(v))
          : (cell) => cell.range.find((v) => !candidate.range.includes(v));
      const peers = candidates
        .filter(
          (c) =>
            c.index !== candidate.index &&
            must(c) &&
            new Set([].concat(c.range).concat(candidate.range)).size <= size,
        );


      if (peers.length < size - 1) return;
      if (peers.length === size - 1) {
        const excludeValues = Array.from(new Set(
          [].concat(candidate.range).concat(peers.map((peer) => peer.range).flat()),
        ));
        if (excludeValues.length === size) {
          const includeCellIndices = peers.map((peer) => peer.index).concat(candidate.index).sort();
          const excludeIndices = cellIndices.filter((cellIndex) => !includeCellIndices.includes(cellIndex));

          excludeIndices.forEach((excludeIndex) => {
            this.cells[excludeIndex].exclude(excludeValues, affected);
          })
        }
        return;
      }
    })
  }

  onlyCellForValue(cellIndices, affected) {
    cellIndices.forEach((cellIndex) => {
      const cell = this.cells[cellIndex];
      if (cell.frozen()) return;

      const otherValues = cellIndices
        .filter((otherIndex) => otherIndex !== cellIndex)
        .map((otherIndex) => this.cells[otherIndex].range)
        .flat();
      const value = cell.range.find(
        (v) => !otherValues.includes(v),
      );
      if (!value) return;

      cell.freeze(value, affected);
    })
  }

  lineCrossBox(cellIndices, affected) {
    this.valid.forEach((value) => {
      const valueCellIndices = cellIndices.filter((cellIndex) => this.cells[cellIndex].range.includes(value));
      const rowIndex = this.getRowIndex(valueCellIndices);
      const colIndex = this.getColIndex(valueCellIndices);
      const boxIndex = this.getBoxIndex(valueCellIndices);
      const excludeIndices = Array.from(new Set([].concat(
        rowIndex === null ? [] : this.rows[rowIndex],
      ).concat(
        colIndex === null ? [] : this.cols[colIndex],
      ).concat(
        boxIndex === null ? [] : this.boxes[boxIndex],
      ))).filter((excludeIndex) => !valueCellIndices.includes(excludeIndex));
      excludeIndices.forEach((excludeIndex) => {
        this.cells[excludeIndex].exclude([value], affected);
      });
    })
  }

  getRowIndex(cellIndices) {
    const rows = Array.from(new Set(cellIndices.map((cellIndex) => this.cells[cellIndex].rowIndex)));
    return rows.length === 1 ? rows.pop() : null;
  }

  getColIndex(cellIndices) {
    const cols = Array.from(new Set(cellIndices.map((cellIndex) => this.cells[cellIndex].colIndex)));
    return cols.length === 1 ? cols.pop() : null;
  }

  getBoxIndex(cellIndices) {
    const boxes = Array.from(new Set(cellIndices.map((cellIndex) => this.cells[cellIndex].boxIndex)));
    return boxes.length === 1 ? boxes.pop() : null;
  }
}

/* ================================ */

const CellItem = {
  name: 'CellItem',
  template: `<div
  class="cell"
>
  <div :class="classes">{{ text }}</div>
</div>`,
  props: {
    cell: Cell,
  },
  data() {
    return {};
  },
  computed: {
    text() { return this.cell ? this.cell.value : ''; },
    origin() { return this.cell.origin; },
    classes() { return [
      'value',
      this.cell.origin ? 'red' : 'blue',
      this.text === 'x' ? 'error' : '',
    ] },
  }
}

const SudokuBoard = {
  name: 'SudokuBoard',
  template: `<div class="sudoku-board">
  <div class="sudoku">
    <div
      v-for="i in n2"
      :key="i"
      class="row"
    >
      <CellItem
        v-for="j in n2"
        :key="j"
        :cell="cells[(i-1)*n2+(j-1)]"
      ></CellItem>
    </div>
  </div>
  <div class="controls">
    <div class="input">
      <button @click="load">Load</button>
      <textarea
        :rows="n2" :cols="n2" :maxlength="n2*n2*2"
        :placeholder="n2 + 'x' + n2 + ', only accepts 1-' + n2 + ' or *'"
        v-model="matrix"
      />
    </div>
    <div class="algos">
      <div class="group-exclude-value-size">
        <label>Group Exclude Value By Size: </label>
        <input type="number" value="3" min="0" :max="n2" @change="applyAlgorithms({ GROUP_EXCLUDE_VALUE_SIZE: $event.target.value })"/>
      </div>
      <div class="only-cell-for-value">
        <label>Only Cell For Value: </label>
        <input type="checkbox" checked @input="applyAlgorithms({ ONLY_CELL_FOR_VALUE: $event.currentTarget.checked })" />
      </div>
      <div class="line-cross-box">
        <label>Line x Box: </label>
        <input type="checkbox" checked @input="applyAlgorithms({ LINE_CROSS_BOX: $event.currentTarget.checked })" />
      </div>
    </div>
  </div>
</div>`,
  components: { CellItem },
  data() {
    return {
      sudoku: new Sudoku(n),
      matrix: '',
    }
  },
  computed: {
    n2() { return this.sudoku.n2; },
    cells() { return this.sudoku.cells; }
  },
  methods: {
    load() {
      this.sudoku.reset();
      this.sudoku.load(this.matrix.trim());
      this.sudoku.resolve();
    },
    applyAlgorithms(algorithms) {
      this.sudoku.applyAlgorithms(algorithms);
    }
  },
  mounted() {
    this.matrix = `
8**5**6*2
*****3***
7**4*****
*6*7*98*3
*********
1*43*6*5*
*****5**9
***6*****
5*9**7**8
`.trim();
  },
}

const vm = new Vue({ render: h => h(SudokuBoard) }).$mount('#sudoku-board');
window.sudoku = vm.$children[0].$data.sudoku;
