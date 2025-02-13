declare module 'three' {
    export * from 'three/src/Three';
    export class Scene {
        background: Color;
        add(object: Object3D): this;
        remove(object: Object3D): this;
        children: Object3D[];
    }
    export class Color {
        constructor();
        constructor(hex: number);
        copy(color: Color): this;
        multiplyScalar(scalar: number): this;
        add(color: Color): this;
        clone(): Color;
        setHSL(h: number, s: number, l: number): this;
    }
    export class MeshPhongMaterial {
        constructor(parameters?: { color?: Color | number, shininess?: number, emissive?: Color, emissiveIntensity?: number });
        color: Color;
        emissive: Color;
        emissiveIntensity: number;
    }
    export class Object3D {
        position: Vector3;
        rotation: { y: number };
        add(object: Object3D): this;
        children: Object3D[];
        quaternion: { copy: (quaternion: any) => void };
    }
    export class Group extends Object3D {}
    export class Mesh extends Object3D {
        constructor(geometry?: BufferGeometry | SphereGeometry, material?: MeshPhongMaterial | MeshBasicMaterial);
        material: MeshPhongMaterial;
        userData: any;
    }
    export class Vector3 {
        constructor(x?: number, y?: number, z?: number);
        set(x: number, y: number, z: number): this;
        copy(v: Vector3): this;
        x: number;
        y: number;
        z: number;
        normalize(): this;
        multiplyScalar(scalar: number): this;
        distanceTo(v: Vector3): number;
    }
    export class Vector2 {
        x: number;
        y: number;
    }
    export class PerspectiveCamera extends Object3D {
        constructor(fov: number, aspect: number, near: number, far: number);
        aspect: number;
        updateProjectionMatrix(): void;
        quaternion: { copy: (quaternion: any) => void };
    }
    export class WebGLRenderer {
        constructor(parameters?: { antialias?: boolean });
        setSize(width: number, height: number): void;
        render(scene: Scene, camera: PerspectiveCamera): void;
        domElement: HTMLCanvasElement;
    }
    export class Raycaster {
        setFromCamera(coords: Vector2, camera: PerspectiveCamera): void;
        intersectObjects(objects: Object3D[]): Array<{object: Object3D}>;
    }
    export class BufferGeometry {
        setFromPoints(points: Vector3[]): BufferGeometry;
        setAttribute(name: string, attribute: BufferAttribute): this;
        attributes: { [key: string]: { array: Float32Array; needsUpdate: boolean; }};
    }
    export class BufferAttribute {
        constructor(array: Float32Array, itemSize: number);
    }
    export class Points extends Object3D {
        constructor(geometry: BufferGeometry, material: PointsMaterial);
        geometry: BufferGeometry;
        material: PointsMaterial;
    }
    export class PointsMaterial {
        constructor(parameters: {
            color: Color | number,
            size?: number,
            transparent?: boolean,
            opacity?: number,
            sizeAttenuation?: boolean
        });
        opacity: number;
        size: number;
    }
    export class LineBasicMaterial {
        constructor(parameters: { color: number, transparent?: boolean, opacity?: number });
    }
    export class Line extends Object3D {
        constructor(geometry: BufferGeometry, material: LineBasicMaterial);
    }
    export class SphereGeometry {
        constructor(radius: number, widthSegments: number, heightSegments: number);
    }
    export class MeshBasicMaterial {
        constructor(parameters: { color: number, emissive?: number, emissiveIntensity?: number });
    }
    export class AmbientLight extends Object3D {
        constructor(color: number, intensity: number);
    }
    export class PointLight extends Object3D {
        constructor(color: number, intensity: number, distance: number);
    }
}
declare module 'three/examples/jsm/controls/OrbitControls';
declare module 'three/examples/jsm/renderers/CSS2DRenderer'; 