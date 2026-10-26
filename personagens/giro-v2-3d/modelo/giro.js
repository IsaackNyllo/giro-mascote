// Giro v2 em 3D (folha referencias/folhas/giro-v2_folha-robo-luva-tenis.png): luva branca, tenis azul e branco,
// bracos e pernas finos, crista inclinada. Partiu do modelo v1; o rig tem os mesmos nomes.
// A cena chama criarGiro(...) e recebe as pecas que anima. O rig (ombro, cotovelo, dedos, quadril, joelho, pe)
// tem os mesmos nomes em todas as versoes, para a mesma linha do tempo servir a v1 e a v2.
// Simbolo do peito: as 3 torres do icone do Comercial 360.
const ICON = [['M22 78V50l14-6v34z', 'f'], ['M39 78V28l17-10v60z', 'f'], ['M59 78V40l14-6v44z', 'f']];

export function criarGiro({ THREE, RoundedBoxGeometry, canvasTex, rr, mesh, mat, TAU }) {
  const C = { blue: 0x1652e0, blueD: 0x0f3fb0, navy: 0x1b2a55, joint: 0x3a4252, white: 0xeef2f8 };
  const M = { glove: mat(0xf7f9fc, { roughness: .55 }), dark: mat(0x2c3548, { roughness: .5 }), blue: mat(C.blue), blueD: mat(C.blueD), navy: mat(C.navy, { roughness: .5 }), joint: mat(C.joint, { roughness: .55, metalness: .35 }), white: mat(C.white, { roughness: .45 }) };

  const BW = 0.86, BH = 1.62, BD = 0.66, BY = 0.8;          // tronco/cabeca: mais alto e estreito que a v1, como na folha v2
  const giro = new THREE.Group();                           // raiz no chao (yaw)
  const body = new THREE.Group(); body.position.y = BY + BH / 2; giro.add(body);
  body.add(mesh(new RoundedBoxGeometry(BW, BH, BD, 8, 0.27), M.blue));   // cantos bem arredondados (mais cartoon)
  body.add(mesh(new RoundedBoxGeometry(BW - 0.03, 0.84, 0.1, 4, 0.05), M.white, 0, -0.36, BD / 2 - 0.03));   // painel branco: largura toda
  for (const s of [-1, 1]) {
    body.add(mesh(new RoundedBoxGeometry(0.08, 0.92, 0.42, 4, 0.035), M.white, s * (BW / 2 - 0.02), -0.33, -0.06)); // laterais brancas
  }
  const crest = new THREE.Shape([[-0.34, 0], [-0.34, 0.07], [-0.2, 0.1], [0.14, 0.3], [0.17, 0.08], [0.34, 0.04], [0.34, 0]].map(([x, y]) => new THREE.Vector2(x, y)));
  const crestGeo = new THREE.ExtrudeGeometry(crest, { depth: BD * 0.72, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 3 }).translate(0, 0, -BD * 0.36);
  body.add(mesh(crestGeo, M.blue, 0, BH / 2 - 0.05, 0));   // crista do topo: sobe da esquerda para a direita, com degrau
  const skirt = mesh(new THREE.SphereGeometry(1, 32, 16, 0, TAU, 0, Math.PI / 2), M.blue, 0, -BH / 2 + 0.02, 0);   // saia azul embaixo do corpo
  skirt.scale.set(0.4, -0.17, 0.3); body.add(skirt);

  // tela (rosto) - redesenhada por quadro: olhos acendem, boca segue o volume
  const FW = 512, FH = 320;
  const faceTex = canvasTex(FW, FH, () => {});
  function drawFace(on, mouth, happy, gaze = 0) {   // gaze 0..1: olhos e boca deslizam para a direita da tela
    const g = faceTex.userData.g;
    g.clearRect(0, 0, FW, FH);
    rr(g, 0, 0, FW, FH, 70); g.fillStyle = '#16244d'; g.fill();
    rr(g, 20, 20, FW - 40, FH - 40, 56); g.fillStyle = '#070e24'; g.fill();
    if (on > 0) {
      g.save(); g.globalAlpha = on; g.fillStyle = g.strokeStyle = '#74f2ff'; g.shadowColor = '#2fd8ff'; g.shadowBlur = 28;
      g.lineCap = 'round'; g.translate(gaze * 42, 0);
      for (const ex of [176, 336]) {
        g.beginPath();
        if (happy) { g.lineWidth = 22; g.arc(ex, 160, 36, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
        else { g.ellipse(ex, 138, 27, 37, 0, 0, TAU); g.fill(); }
      }
      if (mouth < 0.06) { g.lineWidth = 15; g.beginPath(); g.arc(256, 188, 48, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
      else { const d = 14 + 70 * mouth; g.beginPath(); g.moveTo(206, 214); g.quadraticCurveTo(256, 224, 306, 214); g.quadraticCurveTo(256, 214 + d * 2, 206, 214); g.fill(); }
      g.restore();
    }
    faceTex.needsUpdate = true;
  }
  const face = mesh(new THREE.PlaneGeometry(0.74, 0.48), new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, toneMapped: false }), 0, 0.38, BD / 2 + 0.004);
  body.add(face);
  const iconTex = canvasTex(512, 512, (g) => {
    g.scale(5.12, 5.12); g.fillStyle = g.strokeStyle = '#1652e0'; g.lineWidth = 7; g.lineCap = 'round';
    for (const [d, k] of ICON) k === 'f' ? g.fill(new Path2D(d)) : g.stroke(new Path2D(d));
  });
  body.add(mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshStandardMaterial({ map: iconTex, transparent: true, roughness: .4 }), 0, -0.4, BD / 2 + 0.024));

  // anel orbital: tilt (roll) -> flat (quase horizontal, frente mais baixa) -> spin
  const ringTilt = new THREE.Group(); ringTilt.position.y = 0.03; ringTilt.rotation.z = 0.5; body.add(ringTilt);   // orbita diagonal: sobe pelo ombro esquerdo da tela e desce ate o quadril do outro lado
  const ringFlat = new THREE.Group(); ringFlat.rotation.x = Math.PI / 2 + 0.42; ringFlat.scale.y = 0.75; ringTilt.add(ringFlat);   // elipse achatada, anel de Saturno
  const ringSpin = new THREE.Group(); ringFlat.add(ringSpin);
  const RR = 0.8, ARC = TAU * 0.88;   // RR: raio onde fica a bolinha (meio da faixa)
  const ringMat = mat(C.blue, { emissive: 0x22d3ee, emissiveIntensity: 0 });                                   // so a bolinha (esfera iluminada)
  const BAND_BLUE = new THREE.Color(0x2358e8), BAND_GLOW = new THREE.Color(0x22d3ee);   // azul do corpo como aparece na tela; ciano quando o anel comeca a girar
  const bandMat = new THREE.MeshBasicMaterial({ color: BAND_BLUE, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const ringEdge = new THREE.MeshBasicMaterial({ color: 0x0a1230, side: THREE.DoubleSide });
  // anel plano de Saturno: uma faixa chata (disco furado) com contorno escuro fino; cor sem sombreamento, igual ao azul do corpo
  ringSpin.add(mesh(new THREE.RingGeometry(0.74 - 0.012, 0.86 + 0.012, 140, 1, -0.015, ARC + 0.03), ringEdge));
  ringSpin.add(mesh(new THREE.RingGeometry(0.74, 0.86, 140, 1, 0, ARC), bandMat));
  ringSpin.add(mesh(new THREE.SphereGeometry(0.075, 20, 14), ringMat, RR * Math.cos(ARC + 0.18), RR * Math.sin(ARC + 0.18), 0));

  function arm(s) { // s=+1: lado direito da tela (braco esquerdo do Giro)
    const sh = new THREE.Group(); sh.position.set(s * (BW / 2 + 0.04), 0.05, 0); body.add(sh);
    sh.add(mesh(new THREE.SphereGeometry(0.1, 20, 14), M.blue));                              // ombro azul
    sh.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.26, 12), M.dark, 0, -0.13, 0));       // braco fino
    const el = new THREE.Group(); el.position.y = -0.26; sh.add(el);
    el.add(mesh(new THREE.SphereGeometry(0.045, 12, 10), M.dark));
    el.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.26, 12), M.dark, 0, -0.13, 0));       // antebraco fino
    const cuff = mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.1, 20), M.glove, 0, -0.28, 0); el.add(cuff);   // punho da luva
    const hand = new THREE.Group(); hand.position.y = -0.43; hand.scale.setScalar(1.6); el.add(hand);   // luva grande, de desenho
    const palm = mesh(new THREE.SphereGeometry(0.12, 20, 14), M.glove); palm.scale.set(1, 1, 0.75); hand.add(palm);   // luva branca, gordinha
    const thumb = mesh(new THREE.CapsuleGeometry(0.04, 0.06, 4, 10), M.glove, -s * 0.11, 0.02, 0.04); thumb.rotation.z = s * 0.8; hand.add(thumb);
    const fingers = [-1, 0, 1].map(k => { const f = mesh(new THREE.CapsuleGeometry(0.038, 0.08, 4, 10), M.glove, k * 0.062, -0.12, 0); hand.add(f); return f; });
    return { sh, el, fingers, s };
  }
  const arms = [arm(-1), arm(1)];
  const legs = [-1, 1].map(s => {   // s=-1: perna direita do Giro (esquerda da tela)
    const hip = new THREE.Group(); hip.position.set(s * 0.22, BY, 0); giro.add(hip);
    hip.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 12), M.dark, 0, -0.15, 0));      // coxa fina
    const knee = new THREE.Group(); knee.position.y = -0.33; hip.add(knee);
    knee.add(mesh(new THREE.SphereGeometry(0.075, 18, 12), M.white));                          // joelho branco
    knee.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 12), M.dark, 0, -0.14, 0));    // canela fina
    const foot = new THREE.Group(); foot.position.set(0, -0.355, 0.07); foot.scale.setScalar(1.45); knee.add(foot);   // tenis grande (o pe gira inteiro); sola no chao
    foot.add(mesh(new RoundedBoxGeometry(0.26, 0.18, 0.4, 3, 0.08), M.blue, 0, 0.035, 0));                   // cabedal azul
    foot.add(mesh(new RoundedBoxGeometry(0.3, 0.06, 0.46, 3, 0.025), M.glove, 0, -0.05, 0.01));             // sola branca
    foot.add(mesh(new RoundedBoxGeometry(0.24, 0.09, 0.13, 3, 0.04), M.glove, 0, -0.005, 0.15));            // biqueira branca
    for (const z of [-0.07, 0.02]) for (const x of [-1, 1]) foot.add(mesh(new THREE.BoxGeometry(0.012, 0.1, 0.035), M.glove, x * 0.132, 0.03, z));   // listras
    foot.add(mesh(new RoundedBoxGeometry(0.16, 0.035, 0.12, 2, 0.015), M.glove, 0, 0.1, 0.02));             // cadarco
    return { hip, knee, foot, s };
  });
  // bola de futebol (aparece na pose final); manchas pretas nos 12 pentagonos do icosaedro
  const BALL_R = 0.167;
  const ballTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#f4f6fa'; g.fillRect(0, 0, w, h); g.fillStyle = '#12151c';
    g.fillRect(0, 0, w, 28); g.fillRect(0, h - 28, w, 28);                       // polos
    const spot = (lonDeg, latDeg) => { for (const dx of [-w, 0, w]) { g.beginPath(); g.ellipse(lonDeg * w / 360 + dx, (90 - latDeg) * h / 180, 32 / Math.cos(latDeg * Math.PI / 180) * 0.97, 28, 0, 0, TAU); g.fill(); } };
    for (let i = 0; i < 5; i++) { spot(i * 72, 26.57); spot(36 + i * 72, -26.57); }
  });
  const ball = mesh(new THREE.SphereGeometry(BALL_R, 32, 20), new THREE.MeshStandardMaterial({ map: ballTex, roughness: .45 }));
  const ballShadow = mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(0,0,0,.6)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); }), transparent: true, depthWrite: false }));
  ballShadow.rotation.x = -Math.PI / 2;
  ball.visible = ballShadow.visible = false; giro.add(ball, ballShadow);

  // contorno de desenho animado: casca invertida, levemente maior, em azul-marinho escuro
  {
    const mats = new Map(), parts = [];
    giro.traverse(o => { if (o.isMesh && !['PlaneGeometry', 'RingGeometry'].includes(o.geometry.type)) parts.push(o); });
    for (const o of parts) {
      o.geometry.computeBoundingSphere();
      const w = (o.userData.ow ?? Math.min(0.02, Math.max(0.007, o.geometry.boundingSphere.radius * 0.035))).toFixed(4);
      if (!mats.has(w)) {
        const m = new THREE.MeshBasicMaterial({ color: 0x0a1230, side: THREE.BackSide });
        m.onBeforeCompile = s => { s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${w};`); };
        m.customProgramCacheKey = () => 'outline' + w; mats.set(w, m);
      }
      o.add(new THREE.Mesh(o.geometry, mats.get(w)));
    }
  }
  // silhueta: escurece as cores do Giro e da bola; os olhos (tela do rosto) continuam acesos
  const silMats = new Set();
  giro.traverse(o => { if (o.isMesh && o !== face && o.material.side !== THREE.BackSide && o.material !== ringEdge && o.material !== bandMat) silMats.add(o.material); });
  for (const m of silMats) m.userData.base = m.color.clone();
  function setSilhouette(k, eyesOn) {   // k=1: preto absoluto (as luzes de contorno e o ambiente tambem apagam em renderAt)
    for (const m of silMats) m.color.copy(m.userData.base).multiplyScalar(1 - k);
    bandMat.color.multiplyScalar(1 - k);   // a faixa ja recebeu a cor do quadro em applyPose
    face.material.color.setScalar(eyesOn ? 1 : 1 - k);
  }

  giro.scale.setScalar(0.94);   // mesma altura total da v1 (corpo mais alto): a camera do video foi ajustada para essa altura
  return { giro, body, drawFace, ringFlat, ringSpin, ringMat, bandMat, BAND_BLUE, BAND_GLOW, RR, arms, legs, ball, ballShadow, BALL_R, setSilhouette, BY, BH };
}
