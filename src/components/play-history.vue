<template>
  <div class="history justify-content-start">
    <div class="item" :key="idx" v-for="(item, idx) in history">
      {{item.createdAt}} - {{item.username}} - {{item.pgn}}
    </div>
  </div>

</template>

<script>
export default {
  props: ['history']
}
</script>

<style lang="scss" scoped>

</style>


