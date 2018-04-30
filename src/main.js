// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'


import Bootstrap from 'bootstrap'

window.Bootstrap = Bootstrap;

Vue.config.productionTip = false

console.log("Binding Vue component")
/* eslint-disable no-new */
new Vue({
  el: '#app',
  components: { App },
  template: '<App/>'
})
