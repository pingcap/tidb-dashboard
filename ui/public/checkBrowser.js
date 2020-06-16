// Consider this js file must run normally in the old browsers likes IE 6,
// so we can't use the new grammars and APIs (likes let/const, string interpolator, querySelector, etc) in this file.
// We need to handle the compatibility carefully.

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

function getMeta(metaName) {
  const metas = document.getElementsByTagName('meta')

  var i
  for (i = 0; i < metas.length; i++) {
    if (metas[i].getAttribute('name') === metaName) {
      return metas[i].getAttribute('content')
    }
  }

  return ''
}

function checkBrowser() {
  if (window.__unsupported_browsers__.test(navigator.userAgent)) {
    // redirect
    var pathPrefix = getMeta('x-public-path-prefix') || '/dashboard'
    var fullUrl = pathPrefix + '/updateBrowser.html'
    window.location.href = fullUrl
    return
  }
  if (!window.__supported_browsers__.test(navigator.userAgent)) {
    var text
    if (browserLang().indexOf('zh') === 0) {
      text =
        '您的浏览器版本已过期，使用最新版本的 Chrome/Edge/Firefox/Safari 浏览器以便获得最好的体验。'
    } else {
      text =
        'Your browser version is outdated, use the latest Chrome/Edge/Firefox/Safari to get the best experience.'
    }

    const content =
      '<div style="background: #fadb14; width: 100%; position: absolute; top: 0; z-index: 4; padding: 8px; text-align: center; transition: top 2s;">' +
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
