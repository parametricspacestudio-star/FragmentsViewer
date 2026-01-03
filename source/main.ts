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
    propertiesPanel.style.top = '100px'; // Pushed further down from 60px to avoid overlap
    propertiesPanel.style.right = '20px'; // Default for desktop
    propertiesPanel.style.width = '300px';
    propertiesPanel.style.maxHeight = 'calc(100vh - 100px)';
    propertiesPanel.style.backgroundColor = 'white';
    propertiesPanel.style.padding = '15px';
    propertiesPanel.style.borderRadius = '8px';
    propertiesPanel.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    propertiesPanel.style.zIndex = '1000';
    propertiesPanel.style.overflowY = 'auto';
    propertiesPanel.style.color = 'black';
    propertiesPanel.style.fontFamily = 'sans-serif';
    document.body.append(propertiesPanel);

    // Main Logo/Heading
    const companyHeading = document.createElement('div');
    companyHeading.id = 'company-heading';
    
    const style = document.createElement('style');
    style.textContent = `
        #company-heading {
            position: fixed;
            z-index: 2000;
            pointer-events: none;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.7);
            padding: 8px 15px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            backdrop-filter: blur(5px);
        }

        #company-heading h1 {
            margin: 0;
            font-weight: 700;
            text-transform: uppercase;
            color: #333;
            transition: all 0.4s ease;
            white-space: nowrap;
        }

        /* Desktop & Tablet */
        @media (min-width: 768px) {
            #company-heading {
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 40px;
            }
            #company-heading h1 {
                font-size: 1.5rem; /* Standardized size */
                letter-spacing: 0.2em;
            }
            #properties-panel {
                top: 80px !important;
                right: 20px !important;
            }
        }

        /* Phone */
        @media (max-width: 767px) {
            #company-heading {
                top: 15px;
                left: 15px;
                right: auto;
                transform: none;
                padding: 4px 8px;
            }
            #company-heading h1 {
                font-size: 0.5rem; /* Even smaller for mobile */
                letter-spacing: 0.1em;
            }
            #properties-panel {
                top: 80px !important;
                left: 10px !important;
                right: 10px !important;
                width: calc(100% - 20px) !important;
                max-height: calc(100vh - 100px) !important;
            }
        }
    `;
    document.head.appendChild(style);
    
    const headingText = document.createElement('h1');
    headingText.textContent = 'PARAMETER SPACE';
    
    companyHeading.appendChild(headingText);
    document.body.appendChild(companyHeading);

    // Subtle animation for the "electric" pulse (Desktop only)
    let frame = 0;
    const animateHeading = () => {
        if (window.innerWidth >= 768) {
            frame += 0.05;
            const pulse = Math.sin(frame) * 0.1 + 0.9;
            headingText.style.opacity = pulse.toString();
        } else {
            headingText.style.opacity = '1';
        }
        requestAnimationFrame(animateHeading);
    };
    animateHeading();

    const toggleProperties = () => {
        propertiesPanel.style.display = propertiesPanel.style.display === 'none' ? 'block' : 'none';
    };

    const normalizeProp = (rawProp: any) => {
        if (!rawProp || typeof rawProp !== 'object') {
            return { rawValue: rawProp, displayValue: String(rawProp ?? ''), ifcType: null };
        }
        const val = rawProp.value !== undefined ? rawProp.value : '';
        return {
            rawValue: val,
            displayValue: String(val),
            ifcType: rawProp.type || null,
        };
    };

    const labelMap: Record<string, string> = {
        Name: "Name",
        Tag: "Mark",
        ObjectType: "Type",
        _category: "IFC class",
        _guid: "IFC GUID",
        _localId: "Internal ID",
    };

    const displayElementData = (data: any[]) => {
        if (propertiesPanel.style.display === 'none') return;
        
        propertiesPanel.innerHTML = '';
        
        const mainHeader = document.createElement('h3');
        mainHeader.style.cssText = 'margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px; font-weight: bold; font-size: 1.2rem;';
        mainHeader.textContent = 'Element Properties';
        propertiesPanel.appendChild(mainHeader);
        
        if (data.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.style.color = '#666';
            emptyMsg.textContent = 'No properties found for the selection.';
            propertiesPanel.appendChild(emptyMsg);
            return;
        }

        for (const item of data) {
            const normalized: Record<string, any> = {};
            for (const key of Object.keys(item)) {
                normalized[key] = normalizeProp(item[key]);
            }

            // Cleanup logic
            const rawName = normalized.Name?.displayValue || "";
            const rawType = normalized.ObjectType?.displayValue || "";
            
            const displayName = rawName.split(":")[0] || "Unknown Name";
            const displayType = rawType.split(":")[1] || rawType || "Unknown Type";
            const displayMark = normalized.Tag?.displayValue || "N/A";

            const container = document.createElement('div');
            container.style.cssText = 'margin-bottom: 25px; background: #fff; border-radius: 8px; border: 1px solid #eee; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);';

            // Tier 1: Summary
            const summarySection = document.createElement('div');
            summarySection.style.cssText = 'padding: 15px; background: #f8f9fa; border-bottom: 1px solid #eee;';
            
            const summaryTitle = document.createElement('div');
            summaryTitle.style.cssText = 'font-size: 1.1rem; font-weight: bold; color: #1a73e8; margin-bottom: 10px;';
            summaryTitle.textContent = displayType;
            summarySection.appendChild(summaryTitle);

            const summaryLine = document.createElement('div');
            summaryLine.style.cssText = 'height: 1px; background: #dee2e6; margin-bottom: 10px;';
            summarySection.appendChild(summaryLine);

            const addSummaryField = (label: string, value: string) => {
                const field = document.createElement('div');
                field.style.cssText = 'font-size: 0.9rem; margin-bottom: 4px; display: flex;';
                field.innerHTML = `<span style="font-weight: 500; color: #5f6368; width: 60px; flex-shrink: 0;">${label}:</span> <span style="color: #202124;">${value}</span>`;
                summarySection.appendChild(field);
            };

            addSummaryField("Name", displayName);
            addSummaryField("Type", displayType);
            addSummaryField("Mark", displayMark);
            
            container.appendChild(summarySection);

            // Tier 2: Details
            const detailsSection = document.createElement('div');
            detailsSection.style.cssText = 'padding: 15px;';

            const detailsHeader = document.createElement('div');
            detailsHeader.style.cssText = 'font-weight: bold; font-size: 0.9rem; color: #3c4043; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;';
            detailsHeader.textContent = 'Details';
            detailsSection.appendChild(detailsHeader);

            const identityGroup = document.createElement('div');
            identityGroup.style.cssText = 'margin-bottom: 15px;';
            identityGroup.innerHTML = '<div style="font-style: italic; font-size: 0.85rem; color: #70757a; margin-bottom: 8px;">Identity</div>';
            
            const addDetailRow = (parent: HTMLElement, label: string, value: string) => {
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; justify-content: space-between; font-size: 0.85rem; padding: 4px 0; border-bottom: 1px solid #f8f9fa;';
                row.innerHTML = `<span style="color: #5f6368;">• ${label}</span> <span style="color: #202124; font-weight: 500; text-align: right; margin-left: 10px;">${value}</span>`;
                parent.appendChild(row);
            };

            addDetailRow(identityGroup, "Name", displayName);
            addDetailRow(identityGroup, "Type", displayType);
            addDetailRow(identityGroup, "Mark", displayMark);
            detailsSection.appendChild(identityGroup);

            // Advanced Section Toggle
            const advancedToggle = document.createElement('button');
            advancedToggle.style.cssText = 'background: none; border: none; color: #1a73e8; font-size: 0.8rem; cursor: pointer; padding: 0; margin-top: 10px; font-weight: 500;';
            advancedToggle.textContent = 'View Advanced / IFC Data ▼';
            
            const advancedContent = document.createElement('div');
            advancedContent.style.cssText = 'display: none; margin-top: 10px; padding: 10px; background: #f1f3f4; border-radius: 4px;';
            
            advancedToggle.onclick = () => {
                const isHidden = advancedContent.style.display === 'none';
                advancedContent.style.display = isHidden ? 'block' : 'none';
                advancedToggle.textContent = isHidden ? 'Hide Advanced / IFC Data ▲' : 'View Advanced / IFC Data ▼';
            };

            const addAdvancedRow = (label: string, value: string) => {
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; justify-content: space-between; font-size: 0.75rem; padding: 2px 0; font-family: monospace;';
                row.innerHTML = `<span style="color: #5f6368;">${label}:</span> <span style="color: #202124; margin-left: 10px;">${value}</span>`;
                advancedContent.appendChild(row);
            };

            // Priority keys mapping
            const advancedKeys = ['_category', '_guid', '_localId'];
            advancedKeys.forEach(key => {
                if (normalized[key]) {
                    addAdvancedRow(labelMap[key] || key, normalized[key].displayValue);
                }
            });

            // Add raw types for summary fields
            const rawTypes = [];
            if (normalized.Name?.ifcType) rawTypes.push(`Name → ${normalized.Name.ifcType}`);
            if (normalized.Tag?.ifcType) rawTypes.push(`Tag → ${normalized.Tag.ifcType}`);
            if (rawTypes.length > 0) {
                addAdvancedRow("Raw value types", rawTypes.join('; '));
            }

            detailsSection.appendChild(advancedToggle);
            detailsSection.appendChild(advancedContent);
            
            container.appendChild(detailsSection);
            propertiesPanel.appendChild(container);
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
                <span class="branding-parameter">Toolbar</span>
                <span class="branding-space"></span>
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
