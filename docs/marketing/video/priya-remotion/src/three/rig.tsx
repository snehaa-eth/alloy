import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export type CamSpec = { pos: [number, number, number]; target: [number, number, number]; fov: number };

// Positions the R3F default camera from frame-driven props (no useFrame; Remotion advances the canvas).
export const CameraRig: React.FC<CamSpec> = ({ pos, target, fov }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(...pos);
  camera.up.set(0, 1, 0);
  camera.lookAt(...target);
  if (camera.fov !== fov) {
    camera.fov = fov;
  }
  camera.near = 0.1;
  camera.far = 100;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return null;
};

// Same camera, outside the canvas: project 3D anchor points to pixel coords for crisp DOM labels.
export const projector = (cam: CamSpec, w: number, h: number) => {
  const c = new THREE.PerspectiveCamera(cam.fov, w / h, 0.1, 100);
  c.position.set(...cam.pos);
  c.lookAt(...cam.target);
  c.updateProjectionMatrix();
  c.updateMatrixWorld(true);
  return (x: number, y: number, z: number) => {
    const v = new THREE.Vector3(x, y, z).project(c);
    return { x: (v.x * 0.5 + 0.5) * w, y: (1 - (v.y * 0.5 + 0.5)) * h };
  };
};
