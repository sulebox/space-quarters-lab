import { createLabKit } from './labPrimitives.js';
import { createArchitecture } from './labArchitecture.js';
import { createEquipment } from './labEquipment.js';
import { createLabLife } from './labLife.js';

// Static, code-native miniature lab. No GLBs, network textures, animation-loop
// callbacks, extra lights, or post-processing passes are introduced here.
export function createLabEnvironment(scene) {
  const kit = createLabKit();
  createArchitecture(kit);
  createEquipment(kit);
  createLabLife(kit);
  const lab = kit.finish();
  scene.add(lab);
  return lab;
}
