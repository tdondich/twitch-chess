<template>
  <table class="table table-bordered board" v-if="position">
    <tr>
      <th></th>
      <th>a</th>
      <th>b</th>
      <th>c</th>
      <th>d</th>
      <th>e</th>
      <th>f</th>
      <th>g</th>
      <th>h</th>
      <th></th>
    </tr>
    <tr v-for="(index, count) in position.board.length / 8" :key="count">
      <th>{{8 - count}}</th>
      <td v-bind:data-index="((8 * (7 - count)) + parseInt(idx))" :class="{black: (idx + count) % 2, white: !(idx + count) % 2, selected: selected == ((8 * (7 - count)) + parseInt(idx)), available: isAvailable(((8 * (7 - count)) + parseInt(idx))) }" v-for="(value, idx) in position.board.slice(8 * (7 - count), (8 * (7 - count)) + 8)" :key="idx">
        <span v-if="value" v-html="charCode(value.side, value.type)"></span>
      </td>
      <th>{{8 - count}}</th>
    </tr>
    <tr>
      <th></th>
      <th>a</th>
      <th>b</th>
      <th>c</th>
      <th>d</th>
      <th>e</th>
      <th>f</th>
      <th>g</th>
      <th>h</th>
      <th></th>
    </tr>
  </table>
</template>

<script>
export default {
  props: ['position', 'availableMoves', 'selected'],
  methods: {
    isAvailable(index) {
      return this.availableMoves.indexOf(index) !== -1;
    },
    charCode(side, type) {
      if (side === "W") {
        switch (type) {
          case "R":
            return "&#9814;";
          case "N":
            return "&#9816;";
          case "B":
            return "&#9815;";
          case "Q":
            return "&#9813;";
          case "K":
            return "&#9812;";
          case "P":
            return "&#9817;";
        }
      } else {
        // Black
        switch (type) {
          case "R":
            return "&#9820;";
          case "N":
            return "&#9822;";
          case "B":
            return "&#9821;";
          case "Q":
            return "&#9819;";
          case "K":
            return "&#9818;";
          case "P":
            return "&#9823;";
        }
      }
    }
 
  }
}
</script>

<style lang="scss" scoped>
.board {
  background-color: white;
  width: auto;
  color: black;
  th {
    font-weight: normal;
  }
  td {
    font-size: 48px;
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
  td.available {
    background-color: green;
  }
}

</style>
