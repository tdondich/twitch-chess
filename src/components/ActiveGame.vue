<template>
  <div>
    <h3>Want to play?</h3>
    <p>
    Join our
    <a href="https://www.twitch.tv/adventuresinprogramming/">twitch.tv channel</a>. In chat, you can vote for your chosen side's move by using the
    <router-link to="/help">hot commands and move text.</router-link>.
    </p>

    <div v-if="position">
      <div class="row">
        <div class="col-sm">
          <board :position="position" :availableMoves="availableMoves"></board>
        </div>
        <div class="col-sm">
          <h4>{{status}} - {{turn == 'B' ? 'Black' : 'White'}}'s Move
            <span class="check" v-if="check">CHECK</span>
          </h4>
          <div class="row">
            <div class="col-sm">
              <h5>Available Moves</h5>
              <ol>
                <li v-for="(move, index) in availableMoves" :key="index">{{move}} </li>
              </ol>
            </div>
            <div class="col-sm">
              <h5>Play History</h5>
              <play-history :history="history" />
            </div>
          </div>
        </div>
        <!-- row -->
      </div>
    </div>

    </div>

</template>

<script>
let chessRules = require("chess-rules");
import playHistory from "./play-history";
import board from "./board";
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../../config/config.json")[env];
import io from "socket.io-client";

export default {
  components: {
    "play-history": playHistory,
    board: board
  },
  data: function() {
    return {
      position: null,
      history: [],
      selected: null,
      teams: {
        black: [],
        white: []
      }
    };
  },
  computed: {
    status: function() {
      return chessRules.getGameStatus(this.position);
    },
    check: function() {
      if (this.position) {
        return this.position.check;
      }
    },
    turn: function() {
      if (this.position) {
        return this.position.turn;
      }
    },
    availableMoves: function() {
      // This will return an array of PGN formatted rules
      let availableMoves = chessRules.getAvailableMoves(this.position);
      let results = [];
      for (let move in availableMoves) {
        results.push(chessRules.moveToPgn(this.position, availableMoves[move]));
      }
      return results;
    }
  },
  created: function() {
    this.io = new io(config["socketio_host"]);
    this.io.on("active-position-update", msg => {
      this.position = msg;
    });
    this.io.on("active-history-full", history => {
      this.history = history;
    });
    this.io.on("active-history-update", update => {
      this.history.unshift(update);
    });
    this.io.on("connect", () => {
      // Nothing needed here
    });
  }
};
</script>

<style lang="scss" scoped>

</style>


