import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as FRAGS from '@thatopen/fragments';
import * as BUI from "@thatopen/ui";

class ProgressBar
{
        progressDiv: HTMLElement;

        constructor ()
        {
                this.progressDiv = document.getElementById ('progress')!;
                this.progressDiv.style.display = 'inherit';
        }

        SetText (text: string)
        {
                this.progressDiv.textContent = text;
        }

        Hide ()
        {
                this.progressDiv.style.display = 'none';
        }
}

async function FitModelToWindow (world: OBC.World, fragments: FRAGS.FragmentsModels)
{
        if (fragments.models.list.size === 0 || world.camera.controls === undefined) {
                return;
        }

        let boxMinMaxPoints: THREE.Vector3[] = [];
        for (const model of fragments.models.list.values()) {
            const boxes = await model.getBoxes();
            for (const box of boxes) {
                boxMinMaxPoints.push(box.min);
                boxMinMaxPoints.push(box.max);
            }
        }
        
        if (boxMinMaxPoints.length === 0) return;

        let boundingBox = new THREE.Box3 ().setFromPoints (boxMinMaxPoints);
        let boundingSphere = boundingBox.getBoundingSphere (new THREE.Sphere ());

        let perspectiveCamera = world.camera.three as THREE.PerspectiveCamera;
        let fieldOfView = perspectiveCamera.fov / 2.0;
        if (perspectiveCamera.aspect < 1.0) {
                fieldOfView = fieldOfView * perspectiveCamera.aspect;
        }

        let center = boundingSphere.center;
        let centerToEye = new THREE.Vector3 ().subVectors (perspectiveCamera.position, center).normalize ();
        let distance = boundingSphere.radius / Math.sin (THREE.MathUtils.degToRad (fieldOfView));
        let eye = new THREE.Vector3 ().addVectors (center, centerToEye.multiplyScalar (distance));

        perspectiveCamera.near = 1.0;
        perspectiveCamera.far = distance * 100.0;
        perspectiveCamera.updateProjectionMatrix ();

        world.camera.controls.setLookAt (eye.x, eye.y, eye.z, center.x, center.y, center.z, true);
        fragments.update (true);
}

function IsCompressedBuffer (buffer: ArrayBuffer) : boolean
{
        if (buffer.byteLength < 2) {
                return false;
        }
        let intArray = new Uint8Array (buffer);
        if (intArray[0] !== 0x78) {
                return false;
        }
        if (intArray[1] !== 0x01 && intArray[1] !== 0x9C && intArray[1] !== 0xDA) {
                return false;
        }
        return true;
}

async function LoadModelInternal (buffer: ArrayBuffer, world: OBC.World, fragments: FRAGS.FragmentsModels)
{
        try {
                const isCompressed = IsCompressedBuffer(buffer);
                console.log("Loading model, compressed:", isCompressed, "buffer size:", buffer.byteLength);

                const model = await fragments.load (buffer, {
                        modelId: THREE.MathUtils.generateUUID(),
                        raw: !isCompressed
                });
                
                // Ensure model is visible and added to scene
                world.scene.three.add(model.object);
                
                model.object.traverse((child: any) => {
                    if (child instanceof THREE.Mesh) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.side = THREE.DoubleSide);
                        } else if (child.material) {
                            child.material.side = THREE.DoubleSide;
                        }
                    }
                });
                
                await FitModelToWindow (world, fragments);
                fragments.update(true);
                console.log("Model loaded successfully");
        } catch (error) {
                console.error("Error loading model:", error);
                alert("Failed to load fragment. Please ensure it is a valid .frag file.");
        }
}

async function LoadModelFromBuffer (buffer: ArrayBuffer, world: OBC.World, fragments: FRAGS.FragmentsModels)
{
        fragments.update (true);

        const progressBar = new ProgressBar ();
        progressBar.SetText ('Loading model...');
        await LoadModelInternal (buffer, world, fragments);
        progressBar.Hide ();
}

async function LoadModelFromUrl (url: string, world: OBC.World, fragments: FRAGS.FragmentsModels)
{
        fragments.update (true);

        const progressBar = new ProgressBar ();
        try {
                progressBar.SetText ('Downloading model..');
                const file = await fetch (url);
                const buffer = await file.arrayBuffer ();
                progressBar.SetText ('Loading model..');
                await LoadModelInternal (buffer, world, fragments);
        } catch {
        }

        progressBar.Hide ();
}

async function LoadModelFromUrlHash (hash: string, world: OBC.World, fragments: FRAGS.FragmentsModels)
{
        if (hash.length === 0) {
                return;
        }
        LoadModelFromUrl (hash.substring (1), world, fragments);
}

async function Init ()
{
        const components = new OBC.Components ();
        components.init ();

        const worlds = components.get (OBC.Worlds);
        const world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer> ();

        world.scene = new OBC.SimpleScene (components);
        world.scene.setup ();
        world.scene.three.background = null;

        const container = document.getElementById ('container')!;
        world.renderer = new OBC.SimpleRenderer (components, container);

        world.camera = new OBC.SimpleCamera (components);
        world.camera.controls.setLookAt (100, 100, 100, 0, 0, 0);

        const grids = components.get (OBC.Grids);
        grids.create (world);

        const workerUrl = 'https://cdn.jsdelivr.net/npm/@thatopen/fragments@3.0.6/dist/Worker/worker.mjs';
        const fetchedWorker = await fetch (workerUrl);
        const workerText = await fetchedWorker.text ();
        const workerFile = new File ([new Blob([workerText])], 'worker.mjs', {
                type: 'text/javascript',
        });
        const workerObjectUrl = URL.createObjectURL (workerFile);

        const fragments = new FRAGS.FragmentsModels (workerObjectUrl);
        fragments.settings.autoCoordinate = false;
        
        const ifcImporter = new FRAGS.IfcImporter();
        // Use unpkg with version 0.0.70 - ensure it's a direct link to the WASM file or directory
        const wasmPath = "https://unpkg.com/web-ifc@0.0.70/";
        ifcImporter.wasm = { absolute: true, path: wasmPath };
        
        const setupIfcImporter = () => {
            const anyImporter = ifcImporter as any;
            
            // Re-initialize settings with the mandatory fields
            anyImporter.settings = {
                webIfc: {
                    COORDINATE_SYSTEM: 2,
                    TOLERANCE_PLANE_INTERSECTION: 0.0001,
                    COORDINATE_TO_ORIGIN: true
                },
                autoCoordinate: true
            };
            
            // Ensure we handle the case where settings might be a getter/setter or needs manual override
            Object.defineProperty(anyImporter, 'settings', {
                value: anyImporter.settings,
                writable: true,
                configurable: true
            });
            
            console.log("IFC Importer initialized with mandatory settings", anyImporter.settings);
        };

        setupIfcImporter();

        world.camera.controls.addEventListener ('rest', () => fragments.update ());
        world.camera.controls.addEventListener ('update', () => fragments.update ());
        fragments.models.list.onItemSet.add (({ value: model }) => {
                world.scene.three.add (model.object);
                model.useCamera (world.camera.three);
                fragments.update (true);
        });

        const mouse = new THREE.Vector2 ();
        container.addEventListener ('click', async (event) => {
                
        });

        window.addEventListener ('dragstart', (ev) => {
                ev.preventDefault ();
        }, false);

        window.addEventListener ('dragover', (ev: any) => {
                ev.stopPropagation ();
                ev.preventDefault ();
                ev.dataTransfer.dropEffect = 'copy';
        }, false);

        window.addEventListener ('drop', async (ev: any) => {
                ev.stopPropagation ();
                ev.preventDefault ();

                if (ev.dataTransfer.items.length != 1) {
                        return;
                }

                let item: DataTransferItem = ev.dataTransfer.items[0];
                let file: File | null = item.getAsFile ();
                if (file === null) {
                        return;
                }

                let buffer: ArrayBuffer | undefined = await file.arrayBuffer ();
                if (buffer === undefined) {
                        return;
                }

                await LoadModelFromBuffer (buffer, world, fragments);
        }, false);

        window.addEventListener ('hashchange', (ev: any) => {
                LoadModelFromUrlHash (window.location.hash, world, fragments);
        }, false);

        BUI.Manager.init ();

        const panel = BUI.Component.create<BUI.PanelSection> (() => {
                const onFitToWindow = async () => {
                        await FitModelToWindow (world, fragments);
                };

                const onLoadFragment = () => {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.frag';
                    fileInput.onchange = async (event: any) => {
                        const file = event.target.files[0];
                        if (file) {
                            const buffer = await file.arrayBuffer();
                            await LoadModelFromBuffer(buffer, world, fragments);
                        }
                    };
                    fileInput.click();
                };

                const onLoadIFC = () => {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.ifc';
                    fileInput.onchange = async (event: any) => {
                        const file = event.target.files[0];
                        if (file) {
                            const progressBar = new ProgressBar();
                            try {
                                progressBar.SetText('Converting IFC...');
                                const buffer = await file.arrayBuffer();
                                console.log("IFC Buffer size:", buffer.byteLength);
                                const ifcBytes = new Uint8Array(buffer);
                                
                                if (!ifcImporter.wasm.path) {
                                    console.error("IFC Importer WASM path not set");
                                }

                                const fragmentBytes = await ifcImporter.process({
                                    bytes: ifcBytes,
                                    progressCallback: (progress, data) => {
                                        progressBar.SetText(`Converting IFC... ${Math.round(progress * 100)}%`);
                                        console.log("IFC Conversion progress:", progress);
                                    },
                                });
                                console.log("IFC Conversion successful, fragment size:", fragmentBytes.buffer.byteLength);
                                await LoadModelFromBuffer(fragmentBytes.buffer as ArrayBuffer, world, fragments);
                            } catch (error: any) {
                                console.error("Error converting IFC:", error);
                                if (error.message) console.error("Error message:", error.message);
                                if (error.stack) console.error("Error stack:", error.stack);
                                alert(`Failed to convert IFC: ${error.message || "Unknown error"}. Please ensure it is a valid .ifc file.`);
                            } finally {
                                progressBar.Hide();
                            }
                        }
                    };
                    fileInput.click();
                };

                return BUI.html`
                        <bim-panel id="controls-panel" active label="Fragments Viewer" class="sidebar">
                        <bim-panel-section fixed label="Controls">
                                <bim-button label="Fit to window" @click=${onFitToWindow}></bim-button>
                                <bim-button label="Load Fragment" @click=${onLoadFragment}></bim-button>
                                <bim-button label="Load IFC" @click=${onLoadIFC}></bim-button>
                        </bim-panel-section>
                        <bim-panel-section fixed label="How to use?">
                                <div class="section">Drag and drop .frag files to this window, or load an <a href="#stacked_towers.frag">example</a>.</div>
                                <div class="section">See the <a href="https://github.com/bimdots-dev/FragmentsViewer/blob/main/README.md">instructions</a> for other model loading possibilities.</div>
                        </bim-panel-section>
                        </bim-panel>
                `;
        });

        document.body.append (panel);
        
        // Remove automatic example loading
        // await LoadModelFromUrlHash (window.location.hash, world, fragments);
}

Init ();
