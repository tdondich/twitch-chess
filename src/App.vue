<template>
  <div id="app">
    <h1>Twitch Plays Chess</h1>
      <div class="alert alert-success">
        To suggest a move, provide !w for white, or !b for black, followed by PGN formatted move. See: https://en.wikipedia.org/wiki/Portable_Game_Notation
      </div>

    <div v-if="position">
    <p>{{status}} - {{turn == 'B' ? 'Black' : 'White'}}'s Move
      <span class="check" v-if="check">CHECK</span>
    </p>

    <div class="row">
      <div class="col-sm">
    <table id="board" class="table table-bordered" v-if="position">
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
        <td v-bind:data-index="((8 * (7 - count)) + parseInt(idx))" :class="{black: (idx + count) % 2, white: !((idx + count) % 2), selected: selected == ((8 * (7 - count)) + parseInt(idx)), available: isAvailable(((8 * (7 - count)) + parseInt(idx))) }" v-for="(value, idx) in position.board.slice(8 * (7 - count), (8 * (7 - count)) + 8)" :key="idx">
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
      </div>
      <div class="col-sm">
        <h2>Available Moves</h2>
          <ol>
          <li v-for="(move, index) in availableMoves" :key="index">{{move}} </li>
          </ol>
      </div>
      <div class="col-sm">
       <h2>Play History</h2>
       <play-history :history="history" />
      </div>

      </div> <!-- row -->
    </div>
  </div>
</template>

<script>
import io from 'socket.io-client';
import playHistory from './components/play-history'
let chessRules = require("chess-rules");

export default {
  name: "App",
  components: {
    'play-history': playHistory
  },
  data: function() {
    return {
      position: null,
      history: [],
      selected: null,
      //availableMoves: []
    };
  },
  computed: {
    status: function() {
      return chessRules.getGameStatus(this.position);
    },
    check: function() {
      if(this.position) {
        return this.position.check;
      }
    },
    turn: function() {
      if(this.position) {
        return this.position.turn;
      }
    },
    availableMoves: function() {
      // This will return an array of PGN formatted rules
      let availableMoves = chessRules.getAvailableMoves(this.position)
      let results = []
      for(let move in availableMoves) {
        results.push(chessRules.moveToPgn(this.position, availableMoves[move]))
      }
      return results
    }
  },
  created: function() {
    this.io = new io('http://localhost:3000/');
    this.io.on('active-position-update', (msg) => {
      console.log("Received Active Position Update Message")
      this.position = msg;
    });
    this.io.on('active-history-full', (history) => {
      console.log("Received Active History Full Message")
      this.history = history;
    })
    this.io.on('active-history-update', (update) => {
      this.history.unshift(update)
    })
    this.io.on('connect', () => {
      console.log("Connected to socket.io backend")
   });
  },
  methods: {
    socketError (message) {
      console.log('Error: ' + message)
    },
    socketClose () {
      console.log('Disconnected from the chat server.');
    },
    socketOpen () {
      let socket = this.webSocket;
      if (socket !== null && socket.readyState === 1) {
        console.log("Connecting and authenticating...");

        socket.send(
          "CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership"
        );
        socket.send("PASS " + config.password);
        socket.send("NICK " + config.username);
        socket.send('JOIN #adventuresinprogramming')
      }
    },
    socketMessage(message) {
      if (message !== null) {
        console.log("INC: " + message.data);
        var parsed = this.parseMessage(message.data);
        if (parsed !== null) {
          if (parsed.message && this.turn === 'B') {
            console.log("Attempting move from streamers: " + parsed.message)
            // Only allow streamers to play black
            let move = this.rules.pgnToMove(this.position, parsed.message.trim())
            console.log("Move: " + move);
            if (move) {
              // Perform move
              this.position = this.rules.applyMove(this.position, move)
              // Reset
              this.availableMoves = [];
              this.turn = this.turn === "W" ? "B" : "W";
              return;
            }
          }
          if (parsed.command === "PING") {
            // Handle IRC PONG
            this.webSocket.send("PONG :" + parsed.message);
          }
        }
      }
    },
    parseMessage(rawMessage) {
      var parsedMessage = {
        message: null,
        tags: null,
        command: null,
        original: rawMessage,
        channel: null,
        username: null
      };

      if (rawMessage[0] === "@") {
        var tagIndex = rawMessage.indexOf(" "),
          userIndex = rawMessage.indexOf(" ", tagIndex + 1),
          commandIndex = rawMessage.indexOf(" ", userIndex + 1),
          channelIndex = rawMessage.indexOf(" ", commandIndex + 1),
          messageIndex = rawMessage.indexOf(":", channelIndex + 1);

        parsedMessage.tags = rawMessage.slice(0, tagIndex);
        parsedMessage.username = rawMessage.slice(
          tagIndex + 2,
          rawMessage.indexOf("!")
        );
        parsedMessage.command = rawMessage.slice(userIndex + 1, commandIndex);
        parsedMessage.channel = rawMessage.slice(
          commandIndex + 1,
          channelIndex
        );
        parsedMessage.message = rawMessage.slice(messageIndex + 1);
      } else if (rawMessage.startsWith("PING")) {
        parsedMessage.command = "PING";
        parsedMessage.message = rawMessage.split(":")[1];
      }

      return parsedMessage;
    },
    isAvailable(index) {
      return this.availableMoves.indexOf(index) !== -1;
    },
    handleClick(index) {
      // First check to see if the index is inside availableMoves. If so, we're actually
      // in the process of moving a piece
      let src = this.availableMoves.indexOf(index);
      if (src !== -1) {
        // It's an available move, let's update the positioning and then update board
        this.position = this.rules.applyMove(this.position, {
          src: this.selected,
          dst: index
        });
        // Reset
        this.availableMoves = [];
        this.selected = null;
        this.turn = this.turn === "W" ? "B" : "W";
        return;
      }
      // Check to see if the cell clicked is inhabited by a piece in control
      let piece = this.position.board[index];
      if (piece) {
        // Check to see if this piece belongs to person in play
        if (piece.side === this.turn) {
          this.selected = index;
          // Get possible moves
          this.availableMoves = [];
          let availableMoves = this.rules.getAvailableMoves(this.position);
          for (let count in availableMoves) {
            let item = availableMoves[count];
            if (item.src === index) {
              this.availableMoves.push(item.dst);
            }
          }
        }
      }
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
};
</script>

<style lang="scss">
@import "~bootstrap/scss/bootstrap.scss";
@import url('https://fonts.googleapis.com/css?family=Noto+Sans');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100vh;
  min-height: 100vh;
  background: linear-gradient(to right bottom, #212121, #616161);
  background-attachment:fixed;
  color: #EEEEEE;
}

h1 {
  font-size: 2rem;
}

h2 {
  font-size: 1.5rem;
}


.alert {
  font-size: 0.5rem;
}

#app {
  font-family: 'Noto Sans', "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
}

#board {
  width: auto;
  color: black;
  border: none;
  animation: moveInLeft 0.8s ease-out;
  th {
    font-weight: normal;
    border: none;
    color: #9E9E9E;
    font-size: 0.8rem;
  }
  td {
    font-size: 50px;
    min-height: 56px;
    height: 56px;
    min-width: 56px;
    width: 56px;

    line-height: 49px;
    border: none;
    padding: 0px;

  }
  td.black {
    background-color: #b58863;
  }

  td.white {
    background-color: #f0d9b5;
  }
  td.selected {
    background-color: red;
  }
  td.available {
    background-color: green;
  }
}


.check {
  font-weight: bold;
}

@keyframes moveInLeft {
  0% {
    opacity: 0;
    transform: translateX(-50px)
  }

  80% {
    transform: translateX(1px)
  }

  100% {
    opacity: 1;
    transform: translate(0);
  }
}


</style>
