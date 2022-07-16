/* eslint-disable no-multi-str */

const ace = require('ace-builds/src-noconflict/ace')

ace.define(
  'ace/theme/oneHalfLight',
  ['require', 'exports', 'module', 'ace/lib/dom'],
  function (require, exports, module) {
    exports.isDark = false
    exports.cssClass = 'ace-one-half-light'
    exports.cssText =
      '.ace-one-half-light .ace_gutter {\
background: #fafafa;\
color: rgb(153,154,158)\
}\
.ace-one-half-light .ace_print-margin {\
width: 1px;\
background: #e8e8e8\
}\
.ace-one-half-light {\
background-color: #fafafa;\
color: #383a42\
}\
.ace-one-half-light .ace_cursor {\
color: #383a42\
}\
.ace-one-half-light .ace_marker-layer .ace_selection {\
background: #bfceff\
}\
.ace-one-half-light.ace_multiselect .ace_selection.ace_start {\
box-shadow: 0 0 3px 0px #fafafa;\
border-radius: 2px\
}\
.ace-one-half-light .ace_marker-layer .ace_step {\
background: rgb(198, 219, 174)\
}\
.ace-one-half-light .ace_marker-layer .ace_bracket {\
margin: -1px 0 0 -1px;\
border: 1px solid #a0a1a7\
}\
.ace-one-half-light .ace_marker-layer .ace_active-line {\
background: #f0f0f0\
}\
.ace-one-half-light .ace_gutter-active-line {\
background-color: #f0f0f0\
}\
.ace-one-half-light .ace_marker-layer .ace_selected-word {\
border: 1px solid #bfceff\
}\
.ace-one-half-light .ace_fold {\
background-color: #0184bc;\
border-color: #383a42\
}\
.ace-one-half-light .ace_keyword,\
.ace-one-half-light .ace_meta.ace_selector,\
.ace-one-half-light .ace_storage {\
color: #a626a4\
}\
.ace-one-half-light .ace_constant,\
.ace-one-half-light .ace_constant.ace_numeric,\
.ace-one-half-light .ace_entity.ace_other.ace_attribute-name,\
.ace-one-half-light .ace_support.ace_class {\
color: #c18401\
}\
.ace-one-half-light .ace_constant.ace_character.ace_escape {\
color: #0997b3\
}\
.ace-one-half-light .ace_entity.ace_name.ace_function,\
.ace-one-half-light .ace_support.ace_function {\
color: #0184bc\
}\
.ace-one-half-light .ace_invalid.ace_illegal {\
color: #fafafa;\
background-color: #e06c75\
}\
.ace-one-half-light .ace_invalid.ace_deprecated {\
color: #fafafa;\
background-color: #e5c07b\
}\
.ace-one-half-light .ace_string,\
.ace-one-half-light .ace_string.ace_regexp {\
color: #50a14f\
}\
.ace-one-half-light .ace_comment {\
color: #a0a1a7\
}\
.ace-one-half-light .ace_entity.ace_name.ace_tag,\
.ace-one-half-light .ace_variable {\
color: #e45649\
}'

    var dom = require('../lib/dom')
    dom.importCssString(exports.cssText, exports.cssClass)
  }
)
;(function () {
  ace.require(['ace/theme/oneHalfLight'], function (m) {
    if (typeof module == 'object' && typeof exports == 'object' && module) {
      module.exports = m
    }
  })
})()
