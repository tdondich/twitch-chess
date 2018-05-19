<template>
  <div>
    <h3>Greetings, Want to play?</h3>
    <p>
    Join our
    <a href="https://www.twitch.tv/adventuresinprogramming/">twitch.tv channel</a>. In stream, join the <em>twitchplayschess</em>
    chat room.  You can vote for your chosen side's move by using !b or !w to dictate what color you want to suggest a move for. Then use Portable Game Notation to state what 
      move you want to suggest. The suggested move with the most moves is executed!
      <br>
      <br>
      Example: !b Nf3
    </p>

    <div v-if="position">
      <div class="row">
        <div class="col-sm">
          <board :position="position" :availableMoves="availableMoves"></board>
        </div>

        <div v-if="!scoreboard" class="col-sm">
          <h4>{{turn == 'B' ? 'Black' : 'White'}}'s Turn
            <span class="check" v-if="check">CHECK</span>
          </h4>
          <hr>

          <!-- teams -->
          <div class="row teams">
            <div class="col-sm">
              <h5>White Team</h5>
              <div v-for="(username, index) in teams.white.slice(0, 10)" :key="index">{{username}}</div>
              <div v-if="teams.white.length > 10">+{{teams.white.length - 10}} more</div>
            </div>
            <div class="col-sm">
              <h5>Black Team</h5>
              <div v-for="(username, index) in teams.black.slice(0, 10)" :key="index">{{username}}</div>
              <div v-if="teams.black.length > 10">+{{teams.black.length - 10}} more</div>
            </div>
          </div>
          <hr>



          <div class="row">
            <div class="col-sm">
              <h5>Available Moves</h5>
                <span v-for="(move, index) in availableMoves" :key="index">{{move}}<span v-if="index < (availableMoves.length - 1)">, </span></span>
            </div>
            <div class="col-sm">
              <h5>Recent Play History</h5>
              <play-history :history="history" />
            </div>
          </div>
        </div>

        <div class="col-sm" v-else>
          <!-- Game completed, show coreboard -->
          <h3 v-if="status == 'WHITEWON'">White Team Wins!</h3>
          <h3 v-if="status == 'BLACKWON'">Black Team Wins!</h3>
          <h3 v-if="status == 'PAT'">It's a Stalemate!</h3>
          <p class="small">
            A new game is starting in just a few minutes!
          </p>
          <p class="small">
          Users who initiated a move scored two points for each. Each supporter scored a point for each move.
          </p>
          <table class="table table-sm">
            <tr v-for="(score, index) in scoreboard" :key="index">
              <td class="username">{{score.username}}</td>
              <td class="points">{{score.points}}</td>
            </tr>
          </table>

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
      scoreboard: null,
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
      // Reset and remove scoreboard
      this.scoreboard = null
    });
    this.io.on("active-history-full", history => {
      this.history = history;
    });
    this.io.on("active-history-update", update => {
      this.history.unshift(update);
    });
    this.io.on("active-teams-update", update => {
      this.teams = update;
    })
    this.io.on("active-scoreboard-update", update => {
      this.scoreboard = update
    });
    this.io.on("connect", () => {
      // Nothing needed here
    });
  }
};
</script>

<style lang="scss" scoped>

.teams {
  margin-bottom: 24px;
}

hr {
  border-top: 1px solid grey;
}

td.points {
  text-align: right;
}


</style>


