<template>
  <div id="app">
    <p>{{status}} - {{turn == 'B' ? 'Black' : 'White'}}'s Move</p>
    
    <table id="board" class="table table-bordered" v-if="position">
      <tr v-for="(index, count) in position.board.length / 8" :key="count">
        <td @click="handleClick(((8 * (7 - count)) + parseInt(idx)))" v-bind:data-index="((8 * (7 - count)) + parseInt(idx))" :class="{black: (idx + count) % 2, white: !(idx + count) % 2, selected: selected == ((8 * (7 - count)) + parseInt(idx)) }" v-for="(value, idx) in position.board.slice(8 * (7 - count), (8 * (7 - count)) + 8)" :key="idx">
          <span v-if="value" v-html="charCode(value.side, value.type)"></span>
        </td>
      </tr>
    </table>
  </div>
</template>

<script>
let chessRules = require('chess-rules')

export default {
  name: 'App',
  data: function () {
    return {
      rules: chessRules,
      position: null,
      status: null,
      turn: 'W', // Turn dictates who's turn it is 
      selected: null // Index to select
    }
  },
  computed: {
    // No computed properties yet
  },
  created: function () {
    this.position = this.rules.getInitialPosition();
    console.log(this.position.board);
    // Set initial game status
    this.status = this.rules.getGameStatus(this.position);
  },
  methods: {
    handleClick (index) {
      // Check to see if the cell clicked is inhabited by a piece in control
      let piece = this.position.board[index]
      if (piece) {
        // Check to see if this piece belongs to person in play
        if (piece.side === this.turn) {
          this.selected = index
        }
      }
    },
    charCode (side, type) {
      if (side === 'W') {
        switch (type) {
          case 'R':
            return '&#9814;'
          case 'N':
            return '&#9816;'
          case 'B':
            return '&#9815;'
          case 'Q':
            return '&#9813;'
          case 'K':
            return '&#9812;'
          case 'P':
            return '&#9817;'
        }
      } else {
        // Black
        switch (type) {
          case 'R':
            return '&#9820;'
          case 'N':
            return '&#9822;'
          case 'B':
            return '&#9821;'
          case 'Q':
            return '&#9819;'
          case 'K':
            return '&#9818;'
          case 'P':
            return '&#9823;'
        }
 
      }
    }
  }
};
</script>

<style lang="scss">
@import "~bootstrap/scss/bootstrap.scss";

#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

td {
  font-size: 48px;
  cursor: pointer;
}

#board {
  width: auto;
  td {
    padding: 0;
    min-height: 48px;
    height: 48px;
    width: 48px;
    line-height: 48px;

  }
  td.black {
    background-color: grey;
  }

  td.white {
    background-color: white;
  }
  td.selected {
    background-color: red;
  }
}
</style>
