import './style/main.css'
import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import guify from 'guify';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {BokehPass} from 'three/examples/jsm/postprocessing/BokehPass.js';
import terrainVertexShader from './shaders/terrain/vertex.glsl';
import terrainFragmentShader from './shaders/terrain/fragment.glsl';

/**
 * Sizes
 */
const sizes = {}
sizes.width = window.innerWidth
sizes.height = window.innerHeight
sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

window.addEventListener('resize', () =>
{
    // Save sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)

    // Update composer
    effectComposer.setSize(sizes.width, sizes.height);
    effectComposer.setPixelRatio(sizes.pixelRatio);

    bokehPass.renderTargetDepth.width = sizes.width * sizes.pixelRatio;
    bokehPass.renderTargetDepth.height = sizes.height * sizes.pixelRatio;
})

const canvas = document.querySelector('.webgl');

/**
 * Environnements
 */
// Scene
const scene = new THREE.Scene();

/* Debug */
const gui = new guify({
    align: 'right',
    theme: 'dark',
    barMode: 'none',
});

const guiDummy = {
    clearColor: '#111111',
}

// Camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 1
camera.position.y = 0.8
camera.position.z = 1
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// Terrain
const terrain = {}

terrain.texture = {}
terrain.texture.linesCount = 5;
terrain.texture.bigLineWidth = 0.04;
terrain.texture.smallLineWidth = 0.01;
terrain.texture.smallLineAlpha = 1;
terrain.texture.width = 32;
terrain.texture.height = 128;
terrain.texture.canvas = document.createElement('canvas');
terrain.texture.canvas.width = terrain.texture.width;
terrain.texture.canvas.height = terrain.texture.height;
terrain.texture.canvas.style.position = 'fixed';
terrain.texture.canvas.style.top = 0;
terrain.texture.canvas.style.left = 0;
terrain.texture.canvas.style.zIndex = 1;
document.body.append(terrain.texture.canvas);

terrain.texture.context = terrain.texture.canvas.getContext('2d');

terrain.texture.instance = new THREE.CanvasTexture(terrain.texture.canvas);
terrain.texture.instance.wrapS = THREE.RepeatWrapping;
terrain.texture.instance.wrapT = THREE.RepeatWrapping;
terrain.texture.instance.minFilter = THREE.NearestFilter;
terrain.texture.instance.mapFilter = THREE.NearestFilter;

terrain.texture.update = () => {
    terrain.texture.context.clearRect(0, 0, terrain.texture.width, terrain.texture.height);

    const actualBigLineWidth = Math.round(terrain.texture.height * terrain.texture.bigLineWidth);
    terrain.texture.context.globalAlpha = terrain.texture.smallLineAlpha;
    terrain.texture.context.fillStyle = '#ffffff';

    terrain.texture.context.fillRect(
        0, 
        0, 
        terrain.texture.width, 
        actualBigLineWidth,
    );

    const actualSmallLineWidth = Math.round(terrain.texture.height * terrain.texture.smallLineWidth);
    const smallLinesCount = terrain.texture.linesCount - 1;

    for(let i = 0 ; i < smallLinesCount; i++) {
        terrain.texture.context.fillRect(
            0,
            actualBigLineWidth + Math.round(terrain.texture.height / terrain.texture.linesCount - 1) * (i + 1),
            terrain.texture.width,
            actualSmallLineWidth,
        )
    }

    terrain.texture.instance.needsUpdate = true;
}

terrain.texture.update();

gui.Register({
    type: 'folder',
    label: 'texture',
    open: false,
});

gui.Register({
    folder: 'texture',
    object: terrain.texture,
    type: 'range',
    property: 'linesCount',
    label: 'linesCount',
    min: 1,
    max: 10,
    step: 1,
    onChange: () => {
        terrain.texture.update();
    }
});

gui.Register({
    folder: 'texture',
    object: terrain.texture,
    type: 'range',
    property: 'bigLineWidth',
    label: 'bigLineWidth',
    min: 0,
    max: 0.1,
    step: 0.0001,
    onChange: () => {
        terrain.texture.update();
    }
});

gui.Register({
    folder: 'texture',
    object: terrain.texture,
    type: 'range',
    property: 'smallLineWidth',
    label: 'smallLineWidth',
    min: 0,
    max: 0.1,
    step: 0.0001,
    onChange: () => {
        terrain.texture.update();
    }
});

gui.Register({
    folder: 'texture',
    object: terrain.texture,
    type: 'range',
    property: 'smallLineAlpha',
    label: 'smallLineAlpha',
    min: 0,
    max: 1,
    step: 0.001,
    onChange: () => {
        terrain.texture.update();
    }
});

// Geometry
terrain.geometry = new THREE.PlaneGeometry(1, 1, 500, 500);
terrain.geometry.rotateX(-Math.PI * 0.5);

// Material
terrain.material = new THREE.ShaderMaterial({
    vertexShader: terrainVertexShader,
    fragmentShader: terrainFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
        uTexture: {value: terrain.texture.instance},
        uElevation: {value: 2},
        uTextureFrequency: {value: 10},
        uTime: {value: 0}
    }
});

gui.Register({
    object: terrain.material.uniforms.uElevation,
    property: 'value',
    type: 'range',
    label: 'uElevation',
    min: 0,
    max: 5,
    step: 0.001,
})

gui.Register({
    object: terrain.material.uniforms.uTextureFrequency,
    property: 'value',
    type: 'range',
    label: 'uTextureFrequency',
    min: 0.01,
    max: 50,
    step: 0.01,
})

// Mesh
terrain.mesh = new THREE.Mesh(terrain.geometry, terrain.material);
terrain.mesh.scale.set(10, 10, 10);
scene.add(terrain.mesh);

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
})
renderer.setClearColor(0x111111, 1);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setPixelRatio(sizes.pixelRatio);
renderer.setSize(sizes.width, sizes.height);

// Composer
const effectComposer = new EffectComposer(renderer);
effectComposer.setSize(sizes.width, sizes.height);
effectComposer.setPixelRatio(sizes.pixelRatio);

const renderPass = new RenderPass(scene, camera);
effectComposer.addPass(renderPass);

const bokehPass = new BokehPass(scene, camera, {
    focus: 1.2,
    aperture: 0.003,
    maxblur: 0.01,
    width: sizes.width * sizes.pixelRatio,
    height: sizes.height * sizes.pixelRatio,
});
effectComposer.addPass(bokehPass);


gui.Register({
    object: guiDummy,
    property: 'clearColor',
    type: 'color',
    label: 'clearColor',
    format: 'hex',
    onChange: () => {
        renderer.setClearColor(guiDummy.clearColor, 1);
    }
})

const bokehPassGui = gui.Register({
    type: 'folder',
    label: 'bokehPass',
    open: false,
})

gui.Register({
    folder: 'bokehPass',
    object: bokehPass,
    property: 'enabled',
    type: 'checkbox',
    label: 'enabled',
})

gui.Register({
    folder: 'bokehPass',
    object: bokehPass.materialBokeh.uniforms.focus,
    property: 'value',
    type: 'range',
    label: 'focus',
    min: 0,
    max: 10,
    step: 0.01,
})

gui.Register({
    folder: 'bokehPass',
    object: bokehPass.materialBokeh.uniforms.aperture,
    property: 'value',
    type: 'range',
    label: 'aperture',
    min: 0.0002,
    max: 0.1,
    step: 0.0001,
})

gui.Register({
    folder: 'bokehPass',
    object: bokehPass.materialBokeh.uniforms.maxblur,
    property: 'value',
    type: 'range',
    label: 'maxblur',
    min: 0,
    max: 0.02,
    step: 0.0001,
})

const clock = new THREE.Clock();

/**
 * Loop
 */
const loop = () =>
{
    const elapsedTime = clock.getElapsedTime();

    terrain.material.uniforms.uTime.value = elapsedTime;
    // Render
    // renderer.render(scene, camera);
    effectComposer.render();

    // Keep looping
    window.requestAnimationFrame(loop)
}
loop()
