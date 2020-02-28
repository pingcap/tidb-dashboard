export default function alive_dead_cnt(component_data) {
  let [alive_cnt, down_cnt] = [0, 0];
  if (component_data !== null && component_data.err === null) {
    component_data.nodes.forEach((n) => {
      if (n.status === 1) {
        alive_cnt ++;
      } else {
        down_cnt++;
      }
    })
  }
  return [alive_cnt, down_cnt];
}