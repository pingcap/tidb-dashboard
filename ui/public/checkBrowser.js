function browserLang() {
  // https://zzz.buzz/2016/01/13/detect-browser-language-in-javascript/
  // https://social.msdn.microsoft.com/Forums/sqlserver/en-US/a3d78aaf-9f70-4826-954d-19183173c1c3/how-to-change-navigatoruserlanguage-in-ie11
  return (
    (navigator.languages && navigator.languages[0]) ||
    navigator.language ||
    navigator.browserLanguage ||
    navigator.userLanguage ||
    'en'
  )
}

function checkBrowser() {
  if (!window.__supported_browsers__.test(navigator.userAgent)) {
    var text
    if (browserLang().indexOf('zh') === 0) {
      text =
        '您的浏览器版本已过期，使用最新版本的 Chrome/Edge/Firefox/Safari 浏览器以便获得更好的体验。'
    } else {
      text =
        'Your browser version is outdated, use the latest Chrome/Edge/Firefox/Safari to get better experience.'
    }

    const content =
      '<div style="background: yellow; width: 100%; position: absolute; top: 0; z-index: 4; padding: 8px; text-align: center; transition: top 2s;">' +
      '<b>' +
      text +
      '<a><span>X</span></a></b><div>'

    var d = document.createElement('div')
    d.innerHTML = content
    d.getElementsByTagName('a')[0].onclick = function () {
      d.getElementsByTagName('div')[0].style.top = '-60px'
    }
    document.body.prepend(d)
  }
}

checkBrowser()
