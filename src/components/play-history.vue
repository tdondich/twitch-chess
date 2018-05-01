<template>
  <div class="history justify-content-start">
    <div class="item" :key="idx" v-for="(item, idx) in history">
      {{item.username}} - {{item.pgn}}<br>
      <span :key="index" v-for="(supporter,index) in item.supporters">+{{supporter}} </span>
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

</style>


