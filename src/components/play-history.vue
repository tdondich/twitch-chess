<template>
  <div class="history justify-content-start">
    <div class="item" :key="idx" v-for="(item, idx) in history.slice(0, 10)">
      <span class="initiator">{{item.username}} - {{item.pgn}}</span><br>
      <span class="supporter" :key="index" v-for="(supporter,index) in item.supporters">+{{supporter}} </span>
    </div>
  </div>

</template>

<script>
import moment from 'moment'

export default {
  props: ['history'],

  methods: {
    formatDate (val) {
      //return moment(val).format("dddd, h:mm:ss a")
      return moment(val).fromNow();
    }
  }
}
</script>

<style lang="scss" scoped>

.history {
  text-align: left;
}

.initiator {
  font-weight: bold;
}

.supporter {
  font-size: 0.8rem;
}
</style>


