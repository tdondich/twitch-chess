// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import VueRouter from 'vue-router'
import Bootstrap from 'bootstrap'

Vue.use(VueRouter)


window.Bootstrap = Bootstrap

Vue.config.productionTip = false

const routes = [
  { path: '/', component: () => import('./components/ActiveGame') },
  { path: '/overlay', component: () => import('./components/Overlay') },
  { path: '/past', component: () => import('./components/PastGames') }
]

const router = new VueRouter({
  routes,
  mode: 'history'

})

/* eslint-disable no-new */
new Vue({
  router,
  el: '#app',
  components: { App },
  template: '<App/>'
})
