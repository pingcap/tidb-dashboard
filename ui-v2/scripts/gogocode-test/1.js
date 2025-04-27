// https://github.com/thx/gogocode/blob/main/docs/specification/basic.zh.md

import $ from "gogocode"

// const source = `
// function log(a) {
//   console.log(a);
// }

// function alert(a) {
//   alert(a);
// }
// `

// const ast = $(source);
// const fns = ast.find(`function $_$() {}`);  // length = 2
// console.log(fns.match)  // 只返回第一个 match，其值相当于 fns[0].match
// console.log(fns.length)
// const names = [];
// fns.each((fnNode) => {
//   const fnName = fnNode.match[0][0].value;
//   names.push(fnName);
// }); // names = ['log', 'alert']
// console.log(names)

const source = `
console.log(a);
console.log(b, c);
console.log(d, e, f);
`

const ast = $(source)
const logs = ast.find(`console.log($_$1, $_$2)`)
// console.log(logs.match)
console.log(logs[0].match)
console.log(logs[1].match)
console.log(logs.length)

// const res = ast.find('console.log($$$0)');
// console.log(res.length)
// const params = res[2].match['$$$0'];
// const paramNames = params.map((p) => p.name);
// console.log(paramNames); // ['d', 'e', 'f']
