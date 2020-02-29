export default function aliveDeadCnt(server_info) {
  let [alive_cnt, down_cnt] = [0, 0];
  if (server_info !== null && server_info.err === null) {
    server_info.nodes.forEach(n => {
      if (n.status === 1) {
        alive_cnt++;
      } else {
        down_cnt++;
      }
    });
  }
  return [alive_cnt, down_cnt];
}
