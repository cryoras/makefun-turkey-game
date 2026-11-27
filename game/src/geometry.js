import * as T from 'three';

// Bake warm sun and rim lighting into vertex colors once, then batch the meshes.
// Spatial buckets let the camera cull distant scenery. Animated limbs stay separate.
const batchedMaterial = new T.MeshBasicMaterial({vertexColors: true});
const sunDirection = new T.Vector3(-.7, .55, -.45).normalize();
const rimDirection = new T.Vector3(.4, .3, -.8).normalize();
export function bake(root, exclude = [], spatial = false) {
 root.updateWorldMatrix(true, true);
 const inverse = root.matrixWorld.clone().invert(), buckets = new Map(), remove = [];
 const normal = new T.Vector3();
 const walk = object => {
  if (exclude.includes(object)) return;
  if (object.isMesh) {
   const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
   const transform = new T.Matrix4().multiplyMatrices(inverse, object.matrixWorld);
   geometry.applyMatrix4(transform);
   const key = spatial ? Math.floor(new T.Vector3().setFromMatrixPosition(transform).z / 14) : 0;
   if (!buckets.has(key)) buckets.set(key, {positions: [], colors: []});
   const bucket = buckets.get(key), color = object.material.color;
   bucket.positions.push(...geometry.attributes.position.array);
   for (let i = 0; i < geometry.attributes.position.count; i++) {
    normal.fromBufferAttribute(geometry.attributes.normal, i);
    const light = .52 + .65 * Math.max(0, normal.dot(sunDirection)) + .24 * Math.max(0, normal.dot(rimDirection));
    bucket.colors.push(color.r * light, color.g * light * .91, color.b * light * .78);
   }
   remove.push(object);
   geometry.dispose();
  }
  for (const child of object.children) walk(child);
 };
 for (const child of root.children) walk(child);
 for (const object of remove) object.parent.remove(object);
 for (const data of buckets.values()) {
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(data.colors, 3));
  geometry.computeBoundingSphere();
  const object = new T.Mesh(geometry, batchedMaterial);
  object.castShadow = object.receiveShadow = true;
  root.add(object);
 }
 return root;
}
