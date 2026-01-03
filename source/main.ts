import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import * as BUI from '@thatopen/ui';
import * as BUIC from '@thatopen/ui-obc';

// Initialize UI libraries - must be done once per application
BUI.Manager.init();

// Progress bar for loading operations
class ProgressBar {
    private progressDiv: HTMLElement;

    constructor() {
        this.progressDiv = document.getElementById('progress')!;
        this.progressDiv.style.display = 'inherit';
    }

    setText(text: string) {
        this.progressDiv.textContent = text;
    }

    hide() {
        this.progressDiv.style.display = 'none';
    }
}

// Helper to detect compressed fragment buffers
function isCompressedBuffer(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 2) return false;
    const intArray = new Uint8Array(buffer);
    if (intArray[0] !== 0x78) return false;
    if (intArray[1] !== 0x01 && intArray[1] !== 0x9C && intArray[1] !== 0xDA) return false;
    return true;
}

// Main application initialization
async function init() {
    // 1. Initialize the Components system
    const components = new OBC.Components();
    
    // 2. Create the 3D world
    const worlds = components.get(OBC.Worlds);
    const world = worlds.create<
        OBC.SimpleScene,
        OBC.OrthoPerspectiveCamera,
        OBC.SimpleRenderer
    >();
    world.name = 'main';

    // 3. Set up scene, renderer, and camera
    const sceneComponent = new OBC.SimpleScene(components);
    sceneComponent.setup();
    world.scene = sceneComponent;
    world.scene.three.background = null;

    const container = document.getElementById('container')!;
    const viewport = document.createElement('bim-viewport');
    container.appendChild(viewport);
    
    const rendererComponent = new OBC.SimpleRenderer(components, viewport);
    world.renderer = rendererComponent;

    const cameraComponent = new OBC.OrthoPerspectiveCamera(components);
    world.camera = cameraComponent;
    
    // Set initial camera position
    await world.camera.controls.setLookAt(78, 20, -2.2, 26, -4, 25);

    viewport.addEventListener('resize', () => {
        rendererComponent.resize();
        cameraComponent.updateAspect();
    });

    // 4. Initialize components and add grid
    components.init();
    const grids = components.get(OBC.Grids);
    grids.create(world);

    // 5. Set up FragmentsManager with local worker to avoid CORS issues
    const workerUrl = 'https://unpkg.com/@thatopen/fragments@3.2.13/dist/Worker/worker.mjs';
    const fetchedWorker = await fetch(workerUrl);
    const workerText = await fetchedWorker.text();
    const workerFile = new File([new Blob([workerText])], 'worker.mjs', {
        type: 'text/javascript',
    });
    const workerObjectUrl = URL.createObjectURL(workerFile);

    const fragments = components.get(OBC.FragmentsManager);
    fragments.init(workerObjectUrl);

    // 6. Set up Highlighter for selection
    const highlighter = components.get(OBCF.Highlighter);
    highlighter.setup({ world });
    highlighter.zoomToSelection = true;

    // Clipper setup
    const casters = components.get(OBC.Raycasters);
    casters.get(world);

    const clipper = components.get(OBC.Clipper);
    clipper.enabled = true;

    viewport.ondblclick = () => {
        if (clipper.enabled) {
            clipper.create(world);
        }
    };

    window.onkeydown = (event) => {
        if (event.code === "Delete" || event.code === "Backspace") {
            if (clipper.enabled) clipper.delete(world);
        }
    };

    // 7. Set up IfcLoader for IFC conversion
    const ifcLoader = components.get(OBC.IfcLoader);
    await ifcLoader.setup({
        autoSetWasm: false,
        wasm: {
            path: 'https://unpkg.com/web-ifc@0.0.72/',
            absolute: true,
        },
    });

    // 8. Configure fragments update on camera movement
    world.camera.controls.addEventListener('rest', () => 
        fragments.core.update(true)
    );

    // 9. Handle model loading
    fragments.list.onItemSet.add(async ({ value: model }) => {
        model.useCamera(world.camera.three);
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

        await fragments.core.update(true);
    });

    // 10. UI components
    const [modelsList] = BUIC.tables.modelsList({
        components,
        metaDataTags: ['schema'],
        actions: { download: true },
    });

    const [spatialTree] = BUIC.tables.spatialTree({
        components,
        models: [],
    });
    spatialTree.preserveStructureOnFilter = true;

    const [loadFragBtn] = BUIC.buttons.loadFrag({ components });

    const onTreeSearch = (e: Event) => {
        const input = e.target as BUI.TextInput;
        spatialTree.queryString = input.value;
    };

    const fitModelToWindow = async () => {
        if (fragments.list.size === 0 || world.camera.controls === undefined) return;

        let boundingBox = new THREE.Box3();
        for (const model of fragments.core.models.list.values()) {
            const boxes = await model.getBoxes();
            for (const box of boxes) boundingBox.union(box);
        }
        
        const boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
        const perspectiveCamera = world.camera.three as THREE.PerspectiveCamera;
        const fieldOfView = perspectiveCamera.fov / 2.0;
        const center = boundingSphere.center;
        
        const distance = boundingSphere.radius / Math.sin(THREE.MathUtils.degToRad(fieldOfView));
        const centerToEye = new THREE.Vector3()
            .subVectors(perspectiveCamera.position, center)
            .normalize();
        const eye = new THREE.Vector3().addVectors(center, centerToEye.multiplyScalar(distance));

        world.camera.controls.setLookAt(eye.x, eye.y, eye.z, center.x, center.y, center.z, true);
        fragments.core.update(true);
    };

    const clearHighlights = async () => await highlighter.clear();

    // Element Properties Component
    const propertiesPanel = document.createElement('div');
    propertiesPanel.id = 'properties-panel';
    propertiesPanel.style.display = 'none';
    propertiesPanel.style.position = 'fixed';
    propertiesPanel.style.top = '10px';
    propertiesPanel.style.right = '370px';
    propertiesPanel.style.width = '350px';
    propertiesPanel.style.maxHeight = 'calc(100vh - 20px)';
    propertiesPanel.style.backgroundColor = 'white';
    propertiesPanel.style.padding = '15px';
    propertiesPanel.style.borderRadius = '8px';
    propertiesPanel.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    propertiesPanel.style.zIndex = '1000';
    propertiesPanel.style.overflowY = 'auto';
    propertiesPanel.style.color = 'black';
    propertiesPanel.style.fontFamily = 'sans-serif';
    document.body.append(propertiesPanel);

    const toggleProperties = () => {
        propertiesPanel.style.display = propertiesPanel.style.display === 'none' ? 'block' : 'none';
    };

    const displayElementData = (data: any[]) => {
        if (propertiesPanel.style.display === 'none') return;
        
        propertiesPanel.innerHTML = '';
        
        const header = document.createElement('h3');
        header.style.cssText = 'margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px; font-weight: bold; font-size: 1.2rem;';
        header.textContent = 'Element Properties';
        propertiesPanel.appendChild(header);
        
        if (data.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.style.color = '#666';
            emptyMsg.textContent = 'No properties found for the selection.';
            propertiesPanel.appendChild(emptyMsg);
        } else {
            for (const item of data) {
                const container = document.createElement('div');
                container.style.cssText = 'margin-bottom: 20px; background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.05);';
                
                const title = document.createElement('div');
                title.style.cssText = 'font-weight: bold; color: #1a73e8; margin-bottom: 12px; font-size: 1rem; border-bottom: 1px solid #f1f3f4; padding-bottom: 8px;';
                title.textContent = item.Name || item.type || 'Selected Element';
                container.appendChild(title);

                const grid = document.createElement('div');
                grid.style.cssText = 'display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; align-items: baseline;';

                const addProperty = (label: string, value: any) => {
                    if (value === undefined || value === null || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)) return;

                    const labelEl = document.createElement('div');
                    labelEl.style.cssText = 'font-size: 0.85rem; color: #5f6368; font-weight: 500;';
                    labelEl.textContent = label.charAt(0).toUpperCase() + label.slice(1);

                    const valueEl = document.createElement('div');
                    valueEl.style.cssText = 'font-size: 0.85rem; color: #202124; word-break: break-word;';
                    
                    if (typeof value === 'object') {
                        valueEl.textContent = JSON.stringify(value);
                    } else {
                        valueEl.textContent = String(value);
                    }

                    grid.appendChild(labelEl);
                    grid.appendChild(valueEl);
                };

                // Prioritize common useful fields
                const keys = Object.keys(item);
                const priorityKeys = ['Name', 'Description', 'GlobalId', 'Tag', 'PredefinedType'];
                
                priorityKeys.forEach(key => {
                    if (item[key]) addProperty(key, item[key]);
                });

                // Add other properties that aren't too complex
                keys.forEach(key => {
                    if (!priorityKeys.includes(key) && typeof item[key] !== 'object') {
                        addProperty(key, item[key]);
                    }
                });

                container.appendChild(grid);
                propertiesPanel.appendChild(container);
            }
        }
    };

    // Correct event listener using highlighter.events.select.onHighlight
    const highlighterAny = highlighter as any;
    if (highlighterAny.events && highlighterAny.events.select && highlighterAny.events.select.onHighlight) {
        highlighterAny.events.select.onHighlight.add(async (modelIdMap: any) => {
            const allElementData = [];
            for (const [modelId, localIds] of Object.entries(modelIdMap)) {
                const model = fragments.list.get(modelId) as any;
                if (!model) continue;

                // Use getItemsData as suggested in the documentation
                if (model.getItemsData) {
                    const elementData = await model.getItemsData([...(localIds as Set<number>)]);
                    allElementData.push(...elementData);
                }
            }
            displayElementData(allElementData);
        });
    }

    if (highlighterAny.events && highlighterAny.events.select && highlighterAny.events.select.onClear) {
        highlighterAny.events.select.onClear.add(() => {
            propertiesPanel.innerHTML = '<h3 style="margin-bottom: 10px; border-bottom: 2px solid #eee; padding-bottom: 5px;">Properties</h3><p style="color: #666;">No element selected. Click an element in the 3D view first.</p>';
        });
    }

    // Graphic Display Control
    let isColorEnabled = true;
    const toggleColors = () => {
        isColorEnabled = !isColorEnabled;
        for (const model of fragments.list.values()) {
            model.object.traverse((child: any) => {
                if (child instanceof THREE.Mesh) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((m: any) => {
                            // Ensure vertex colors are respected if they exist
                            m.vertexColors = isColorEnabled;
                            // Set color to pure white when enabled so it doesn't tint the material/vertex colors
                            if (m.color) m.color.set(isColorEnabled ? 0xffffff : 0xcccccc);
                            m.needsUpdate = true;
                        });
                    } else if (child.material) {
                        child.material.vertexColors = isColorEnabled;
                        if (child.material.color) child.material.color.set(isColorEnabled ? 0xffffff : 0xcccccc);
                        child.material.needsUpdate = true;
                    }
                }
            });
        }
        fragments.core.update(true);
    };

    const loadFragmentFile = async (file: File) => {
        const progressBar = new ProgressBar();
        try {
            progressBar.setText('Loading fragment...');
            const buffer = await file.arrayBuffer();
            const isCompressed = isCompressedBuffer(buffer);
            const modelId = THREE.MathUtils.generateUUID();
            
            await fragments.core.load(buffer, {
                modelId: modelId,
                raw: !isCompressed
            });
            await fitModelToWindow();
        } catch (error) {
            console.error('Error loading fragment:', error);
            alert('Failed to load fragment file');
        } finally {
            progressBar.hide();
        }
    };

    const loadIfcFile = async (file: File) => {
        const progressBar = new ProgressBar();
        try {
            progressBar.setText('Converting IFC...');
            const buffer = await file.arrayBuffer();
            const typedArray = new Uint8Array(buffer);
            
            await ifcLoader.load(typedArray, true, file.name);
            await fitModelToWindow();
        } catch (error) {
            console.error('Error converting IFC:', error);
            alert('Failed to convert IFC file');
        } finally {
            progressBar.hide();
        }
    };

    // 11. Main UI panel
    const panel = BUI.Component.create(() => {
        const onLoadFragment = () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.frag';
            fileInput.onchange = async (event: Event) => {
                const file = (event.target as HTMLInputElement).files?.[0];
                if (file) await loadFragmentFile(file);
            };
            fileInput.click();
        };

        const onLoadIFC = () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.ifc';
            fileInput.onchange = async (event: Event) => {
                const file = (event.target as HTMLInputElement).files?.[0];
                if (file) await loadIfcFile(file);
            };
            fileInput.click();
        };

        const label = BUI.html`
            <div class="branding-title">
                <span class="branding-parameter">Parameter</span>
                <span class="branding-space">Space</span>
            </div>
        `;

        return BUI.html`
            <bim-panel active .label=${label} class="sidebar">
                <bim-panel-section label="File Operations" icon="ph:folder-open">
                    <bim-button label="Load Fragment" @click=${onLoadFragment} icon="ph:file-3d"></bim-button>
                    <bim-button label="Load IFC" @click=${onLoadIFC} icon="ph:file-3d"></bim-button>
                </bim-panel-section>
                <bim-panel-section label="View Controls" icon="ph:eye">
                    <bim-button label="Fit to Window" @click=${fitModelToWindow} icon="ph:arrows-in"></bim-button>
                    <bim-button label="Clear Highlights" @click=${clearHighlights} icon="ph:eraser"></bim-button>
                    <bim-button label="Properties" @click=${toggleProperties} icon="ph:info"></bim-button>
                    <bim-checkbox label="Enable Colors" checked @change=${toggleColors}></bim-checkbox>
                </bim-panel-section>
                <bim-panel-section label="Clipper" icon="ph:scissors">
                    <bim-checkbox label="Clipper Enabled" checked 
                        @change="${({ target }: { target: BUI.Checkbox }) => {
                            clipper.config.enabled = target.value;
                        }}">
                    </bim-checkbox>
                    <bim-checkbox label="Clipper Visible" checked 
                        @change="${({ target }: { target: BUI.Checkbox }) => {
                            clipper.config.visible = target.value;
                        }}">
                    </bim-checkbox>
                    <bim-button label="Delete All Planes" @click=${() => clipper.deleteAll()} icon="ph:trash"></bim-button>
                </bim-panel-section>
                <bim-panel-section label="Loaded Models" icon="mage:box-3d-fill">${modelsList}</bim-panel-section>
                <bim-panel-section label="Model Tree" icon="ph:tree-structure">
                    <bim-text-input @input=${onTreeSearch} placeholder="Search elements..." debounce="200"></bim-text-input>
                    ${spatialTree}
                </bim-panel-section>
            </bim-panel>
        `;
    });

    // 12. Create application layout
    // We remove the bim-grid layout to allow the viewport to be full screen
    // and overlay the panel on top of it.
    document.body.append(viewport);
    document.body.append(panel);

    // Ensure viewport takes full screen
    viewport.style.position = 'absolute';
    viewport.style.top = '0';
    viewport.style.left = '0';
    viewport.style.width = '100%';
    viewport.style.height = '100%';
    viewport.style.zIndex = '0';

    // Ensure panel is correctly positioned as an overlay
    panel.classList.add('sidebar');
    panel.style.position = 'fixed';
    panel.style.top = '10px';
    panel.style.right = '10px';
    panel.style.zIndex = '10';
    panel.style.maxHeight = 'calc(100vh - 20px)';
    panel.style.width = '300px';

    window.addEventListener('resize', () => {
        rendererComponent.resize();
        cameraComponent.updateAspect();
    });

    window.addEventListener('dragover', (ev: DragEvent) => {
        ev.stopPropagation();
        ev.preventDefault();
        if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
    });

    window.addEventListener('drop', async (ev: DragEvent) => {
        ev.stopPropagation();
        ev.preventDefault();
        const file = ev.dataTransfer?.files?.[0];
        if (!file) return;
        if (file.name.endsWith('.frag')) await loadFragmentFile(file);
        else if (file.name.endsWith('.ifc')) await loadIfcFile(file);
    });

    console.log('BIM Viewer initialized successfully!');
}

init().catch(console.error);
