/* ======================= traffic ======================= */
const npcs = [],
  npcMeshes = [];
function spawnTraffic() {
  npcMeshes.forEach((m) => scene.remove(m));
  npcs.length = 0;
  npcMeshes.length = 0;
  const CARCOL = [
    0xc0392b, 0x2c3e50, 0xe8ecef, 0x7f8c8d, 0x2980b9, 0x27ae60, 0x8e44ad, 0x1abc9c, 0xd35400, 0x34495e,
  ];
  for (let i = 0; i < 12; i++) {
    const d = Math.floor(Math.random() * 4);
    const n = {
      x: Math.floor(Math.random() * G),
      y: Math.floor(Math.random() * G),
      d,
      p: Math.random(),
      moving: true,
      ang: (-d * Math.PI) / 2,
    };
    if (!valid(n.x, n.y, n.d)) n.d = [0, 1, 2, 3].find((k) => valid(n.x, n.y, k));
    npcs.push(n);
    const m =
      i % 5 === 4
        ? makeVehicle(i % 2 ? "van" : "sports", CARCOL[i % CARCOL.length])
        : makeSedan(CARCOL[i % CARCOL.length]);
    scene.add(m);
    npcMeshes.push(m);
  }
}
