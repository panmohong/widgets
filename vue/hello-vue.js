const HelloVue = {
  template: `<div>{{this.text}}</div>`,
  data() {
    return {
      text: 'Hello Vue',
    }
  }
}

const vue = new Vue({
  render: h => h(HelloVue)
})
vue.$mount('#vue')
