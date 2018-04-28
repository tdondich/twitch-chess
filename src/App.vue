<template>
  <div id="app">
    <p>{{status}}</p>
    <table id="board" class="table table-bordered" v-if="position">
      <tr v-for="(index, count) in position.board.length / 8" :key="count">
        <td :class="(idx + count) % 2 ? 'black': 'white'" v-for="(value, idx) in position.board.slice(8 * count, (8 * count) + 8)" :key="idx">
          <span v-if="value" v-html="charCode(value.type)"></span>
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
      status: null
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
    charCode (type) {
      switch (type) {
        case 'R':
          return '&#9814;'
        case 'N':
          return '&#9816;'
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
}
</style>
