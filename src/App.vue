<template>
  <div id="app" class="container-fluid">
    <div class="row brand">
      <div class="col-sm">
        <router-link to="/"><img src="./assets/logo.png" alt="Twitch Plays Chess"></router-link>
      </div>
    </div>
    <div class="row links">
      <div class="col-sm">
        <ul class="nav justify-content-center">
          <li class="nav-item">
            <span class="nav-link"><router-link to="/">Active Game</router-link></span>
          </li>
          <li class="nav-item">
            <span class="nav-link"><router-link to="/past">Past Games</router-link></span>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="http://www.twitch.tv/adventuresinprogramming">Twitch Channel</a>
          </li>
        </ul>
      </div>
    </div>

    <div class="row">
      <div class="col-sm">
        <router-view></router-view>
      </div>
    </div>

 </div>
</template>

<script>

export default {
  name: "App"
}
</script>

<style lang="scss">
@import "~bootstrap/scss/bootstrap.scss";

html,
body {
  background-color: black;
  color: white;
}

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  .brand {
    text-align: center;
    margin-top: 8px;
  }

  .links {
    text-align: center;
  }
}

.check {
  font-weight: bold;
}
</style>
