// Run `yarn supportedBrowsers` to auto generate supportedBrowsers.ts
import supportedBrowsers from './supportedBrowsers'

export function checkBrowser() {
  if (supportedBrowsers.test(navigator.userAgent)) {
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
          Your browser version is outdated, recommend to use the latest Chrome or Edge to get better experience.
          <a><span>X</span></a>
        </b>
      <div>
    `
    var d = document.createElement('div')
    d.innerHTML = content
    d.querySelector('a')!.onclick = function () {
      d.querySelector('div')!.style.top = '-60px'
    }
    document.body.prepend(d)
  }
}

checkBrowser()
