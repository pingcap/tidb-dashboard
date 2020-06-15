function checkBrowser() {
  if (window.__supported_browsers__.test(navigator.userAgent)) {
    var text
    if (navigator.language.indexOf('zh') === 0) {
      text =
        '您的浏览器版本已过期，推荐使用最新版本的 Chrome 或 Edge 浏览器以便获得更好的体验。'
    } else {
      text =
        'Your browser version is outdated, recommend to use the latest Chrome or Edge to get better experience.'
    }
    const content = `
      <div style="background: yellow;
                  width: 100%;
                  position: absolute;
                  top: 0;
                  z-index: 4;
                  padding: 8px;
                  text-align: center;
                  transition: top 2s;">
        <b>
          ${text}
          <a><span>X</span></a>
        </b>
      <div>
    `
    var d = document.createElement('div')
    d.innerHTML = content
    d.querySelector('a').onclick = function () {
      d.querySelector('div').style.top = '-60px'
    }
    document.body.prepend(d)
  }
}

checkBrowser()
