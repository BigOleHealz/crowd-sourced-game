// Bake the five credited Rocketbox engine-tier GLBs onto the Pinewatch rig.
// macOS: node tools/fit-civilian-scans.mjs /path/to/source-directory
// Input names may be <id>.glb or <id>.engine.glb. See public/civilians/SOURCES.txt.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Matrix3, Matrix4, Quaternion, Vector3} from 'three';
import {createRangerRig} from '../public/ranger-pose.js';

const sources = [
  ['female-adult-03', '3ce074878a27af5ffaac3a354d3e8a7a13904e42924670c7bbd6a377ae130491'],
  ['male-adult-09', '96b3743e004eccffaf5af7719c44c0526be7f5bebd6fa74059b4144221faaa07'],
  ['business-female-04', '4453c878718b1a311e767b983969b93068f2e190a2daecd65c35953f508b8d18'],
  ['male-adult-05', '16b4b2bb6d2ef71c2dd326ff424e9a7daaa7a34bcb9de059d356f65d68cac937'],
  ['female-adult-11', '2a9394c7e42f68b162d820d3c6cc8a7ac65997c25cf7491893ea9a924807b9c7']
];
const sourceDirectory = process.argv[2];
if (!sourceDirectory) throw new Error('Supply the directory containing the five engine GLBs.');
const outputDirectory = fileURLToPath(new URL('../public/civilians/', import.meta.url));
const formats = {5121: Uint8Array, 5123: Uint16Array, 5126: Float32Array};
const widths = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16};

function readModel(bytes) {
  const jsonEnd = 20 + bytes.readUInt32LE(12);
  const model = JSON.parse(bytes.subarray(20, jsonEnd));
  const binary = bytes.subarray(jsonEnd + 8);
  function view(index) {
    const {byteOffset = 0, byteLength} = model.bufferViews[index];
    return binary.subarray(byteOffset, byteOffset + byteLength);
  }
  function read(index) {
    const accessor = model.accessors[index];
    const {byteStride} = model.bufferViews[accessor.bufferView];
    const data = view(accessor.bufferView);
    const Type = formats[accessor.componentType], width = widths[accessor.type];
    const offset = data.byteOffset + (accessor.byteOffset ?? 0);
    const output = new Type(accessor.count * width);
    const stride = byteStride ?? width * Type.BYTES_PER_ELEMENT;
    for (let i = 0; i < accessor.count; i++) {
      output.set(new Type(data.buffer, offset + stride * i, width), i * width);
    }
    return output;
  }
  return {model, view, read};
}

function binaryWriter() {
  const chunks = [], bufferViews = [], accessors = [];
  let size = 0;
  function append(array) {
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    const padding = Buffer.alloc((4 - bytes.length % 4) % 4);
    bufferViews.push({buffer: 0, byteOffset: size, byteLength: bytes.length});
    chunks.push(bytes, padding);
    size += bytes.length + padding.length;
    return bufferViews.length - 1;
  }
  function accessor(array, componentType, type, extras = {}) {
    accessors.push({bufferView: append(array), componentType, type, count: array.length / widths[type], ...extras});
    return accessors.length - 1;
  }
  function write(path, model) {
    const json = Buffer.from(JSON.stringify({...model, buffers: [{byteLength: size}], bufferViews, accessors}));
    const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
    json.copy(padded);
    const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
    header.write('glTF'); header.writeUInt32LE(2, 4);
    header.writeUInt32LE(28 + padded.length + size, 8);
    header.writeUInt32LE(padded.length, 12); header.write('JSON', 16);
    binHeader.writeUInt32LE(size); binHeader.write('BIN\0', 4);
    writeFileSync(path, Buffer.concat([header, padded, binHeader, ...chunks]));
  }
  return {append, accessor, write};
}

const turn = new Matrix4().makeRotationY(Math.PI); // Rocketbox faces +Z, Pinewatch faces -Z.
const translate = point => new Matrix4().makeTranslation(point);
const world = joint => joint.getWorldPosition(new Vector3());

// Stretch only the axis between bone endpoints, keeping limb thickness unchanged.
function segment(from, to, start, end) {
  const axis = to.clone().sub(from), target = end.clone().sub(start);
  const stretch = target.length() / axis.length() - 1;
  const components = axis.normalize().toArray(), scale = new Matrix4();
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) scale.elements[col * 4 + row] += stretch * components[col] * components[row];
  }
  const rotation = new Quaternion().setFromUnitVectors(axis, target.normalize());
  return translate(start).multiply(new Matrix4().makeRotationFromQuaternion(rotation))
    .multiply(scale).multiply(translate(from.clone().negate()));
}

function rigMapping(model, read) {
  const rig = createRangerRig();
  rig.root.updateMatrixWorld(true);
  const skin = model.skins[0], binds = read(skin.inverseBindMatrices);
  const names = skin.joints.map(i => model.nodes[i].name.replace(/^Bip01 /, ''));
  const points = Object.fromEntries(names.map((name, i) => [
    name, new Vector3().setFromMatrixPosition(new Matrix4().fromArray(binds, i * 16).invert()).applyMatrix4(turn)
  ]));
  const nodes = [], joints = new Map(), remap = new Map();
  function register(name, joint) {
    const index = nodes.length;
    nodes.push({name, translation: joint.position.toArray()});
    joints.set(joint, index);
    if (joints.has(joint.parent)) (nodes[joints.get(joint.parent)].children ??= []).push(index);
  }
  function assign(joint, matrix, parts) {
    const bake = matrix.clone().multiply(turn);
    const mapping = {index: joints.get(joint), matrix: bake, normal: new Matrix3().getNormalMatrix(bake)};
    for (const part of parts) remap.set(part, mapping);
  }
  for (const part of ['body', 'spine', 'upper', 'head']) register(part, rig[part]);

  const hip = points.Pelvis, shoulder = points['L UpperArm'];
  const destHip = world(rig.limbs[0].leg), destShoulder = world(rig.limbs[0].arm);
  const heightRatio = (destShoulder.y - destHip.y) / (shoulder.y - hip.y);
  const torso = translate(new Vector3(0, destHip.y, 0))
    .multiply(new Matrix4().makeScale(1, heightRatio, 1)).multiply(translate(hip.clone().negate()));
  assign(rig.body, torso, ['Pelvis']);
  assign(rig.spine, torso, ['Spine', 'Spine1']);
  assign(rig.upper, torso, ['Spine2', 'Neck', 'L Clavicle', 'R Clavicle']);
  assign(rig.head, torso, names.filter(n => n === 'Head' || /^[LRM][A-Z]/.test(n)));

  for (const limb of rig.limbs) {
    const side = limb.side < 0 ? 'Left' : 'Right', prefix = limb.side < 0 ? 'L ' : 'R ';
    for (const part of ['leg', 'knee', 'ankle', 'arm', 'forearm']) register(side + part, limb[part]);
    const point = part => points[prefix + part];
    const arm = world(limb.arm), elbow = world(limb.forearm);
    const wrist = elbow.clone().add(new Vector3(.023 * limb.side, -.217, 0));
    const fingers = wrist.clone().add(new Vector3(0, -.139, -.029));
    assign(limb.arm, segment(point('UpperArm'), point('Forearm'), arm, elbow), [prefix + 'UpperArm']);
    assign(limb.forearm, segment(point('Forearm'), point('Hand'), elbow, wrist), [prefix + 'Forearm']);
    assign(limb.forearm, segment(point('Hand'), point('Finger22'), wrist, fingers),
      names.filter(n => n === prefix + 'Hand' || n.startsWith(prefix + 'Finger')));

    const thigh = world(limb.leg), knee = world(limb.knee), foot = world(limb.ankle);
    // The game ankle pivot sits above the model's shoe. Keep the source sole at ground level.
    foot.y = point('Foot').y;
    assign(limb.leg, segment(point('Thigh'), point('Calf'), thigh, knee), [prefix + 'Thigh']);
    assign(limb.knee, segment(point('Calf'), point('Foot'), knee, foot), [prefix + 'Calf']);
    assign(limb.ankle, translate(foot.clone().sub(point('Foot'))), [prefix + 'Foot', prefix + 'Toe0']);
  }
  const inverse = new Float32Array(joints.size * 16);
  for (const [joint, i] of joints) joint.matrixWorld.clone().invert().toArray(inverse, 16 * i);
  const mappings = names.map(name => {
    if (!remap.has(name)) throw new Error('Unmapped Rocketbox joint ' + name);
    return remap.get(name);
  });
  return {nodes, mappings, inverse};
}

function bakePrimitive(primitive, read, writer, mappings) {
  const a = primitive.attributes;
  const positions = read(a.POSITION), normals = read(a.NORMAL);
  const joints = read(a.JOINTS_0), weights = read(a.WEIGHTS_0);
  const ids = new Uint8Array(joints.length), normalized = new Uint8Array(weights.length);
  const min = new Vector3(Infinity, Infinity, Infinity), max = min.clone().negate();
  const src = new Vector3(), direction = new Vector3(), pos = new Vector3(), normal = new Vector3(), tmp = new Vector3();
  for (let i = 0; i < positions.length / 3; i++) {
    src.fromArray(positions, i * 3); direction.fromArray(normals, i * 3);
    pos.set(0, 0, 0); normal.set(0, 0, 0);
    const merged = new Map();
    for (let j = 4 * i; j < 4 * i + 4; j++) {
      const weight = weights[j];
      if (!weight) continue;
      const map = mappings[joints[j]];
      pos.addScaledVector(tmp.copy(src).applyMatrix4(map.matrix), weight);
      normal.addScaledVector(tmp.copy(direction).applyNormalMatrix(map.normal), weight);
      merged.set(map.index, (merged.get(map.index) ?? 0) + weight);
    }
    const sorted = [...merged].sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((sum, [, w]) => sum + w, 0);
    if (!(total > 0)) throw new Error('Unweighted vertex');
    pos.divideScalar(total).toArray(positions, i * 3); normal.normalize().toArray(normals, i * 3);
    min.min(pos); max.max(pos);
    let sum = 0;
    sorted.forEach(([id, weight], j) => {
      ids[i * 4 + j] = id;
      sum += normalized[i * 4 + j] = Math.round(weight / total * 255);
    });
    normalized[i * 4] += 255 - sum;
  }
  return {
    material: primitive.material,
    indices: writer.accessor(read(primitive.indices), 5123, 'SCALAR'),
    attributes: {
      POSITION: writer.accessor(positions, 5126, 'VEC3', {min: min.toArray(), max: max.toArray()}),
      NORMAL: writer.accessor(normals, 5126, 'VEC3'), TEXCOORD_0: writer.accessor(read(a.TEXCOORD_0), 5126, 'VEC2'),
      JOINTS_0: writer.accessor(ids, 5121, 'VEC4'), WEIGHTS_0: writer.accessor(normalized, 5121, 'VEC4', {normalized: true})
    }
  };
}

function convert(id, digest, output, temp) {
  const engine = join(sourceDirectory, id + '.engine.glb');
  const bytes = readFileSync(existsSync(engine) ? engine : join(sourceDirectory, id + '.glb'));
  if (createHash('sha256').update(bytes).digest('hex') !== digest) throw new Error('Wrong engine input for ' + id);
  const {model, read, view} = readModel(bytes);
  const writer = binaryWriter(), {nodes, mappings, inverse} = rigMapping(model, read);
  const primitives = model.meshes[0].primitives.map(p => bakePrimitive(p, read, writer, mappings));
  const images = [], textures = [];
  const materials = model.materials.map(({normalTexture, ...material}) => {
    const base = material.pbrMetallicRoughness.baseColorTexture;
    const original = model.images[model.textures[base.index].source];
    const masked = material.alphaMode === 'MASK', format = masked ? 'png' : 'jpeg';
    const source = join(temp, 'original.png'), resized = join(temp, 'color.' + format);
    writeFileSync(source, view(original.bufferView));
    const args = ['-Z', masked ? '512' : '1024', '-s', 'format', format];
    if (!masked) args.push('-s', 'formatOptions', '82');
    execFileSync('sips', [...args, source, '--out', resized], {stdio: 'pipe'});
    base.index = textures.length;
    textures.push({source: images.length});
    images.push({bufferView: writer.append(readFileSync(resized)), mimeType: 'image/' + format});
    return material;
  });
  const jointIds = nodes.map((_, i) => i);
  const skin = {joints: jointIds, skeleton: 0, inverseBindMatrices: writer.accessor(inverse, 5126, 'MAT4')};
  nodes.push({name: id, mesh: 0, skin: 0});
  writer.write(output, {
    asset: {version: '2.0', copyright: 'Microsoft Corporation. MIT License. See civilians/LICENSE.txt.'},
    scene: 0, scenes: [{nodes: [0, nodes.length - 1]}], nodes, skins: [skin], meshes: [{primitives}],
    materials, textures, images
  });
}

mkdirSync(outputDirectory, {recursive: true});
const temp = mkdtempSync(join(tmpdir(), 'pinewatch-civilians-'));
try {
  sources.forEach(([id, digest], i) => convert(id, digest, join(outputDirectory, 'civilian-' + (i + 1) + '.glb'), temp));
} finally {
  rmSync(temp, {recursive: true, force: true});
}
