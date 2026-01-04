import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import * as BUI from '@thatopen/ui';
import * as BUIC from '@thatopen/ui-obc';

// Initialize UI libraries - must be done once per application
BUI.Manager.init();

// ================== ADD THIS CSS STYLING SECTION ==================
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  /* 1. MODERN THEME VARIABLES */
  :root {
    --brand-blue: #0077FF;
    --blue-light-bg: #EAF2FF;
    --cream-bottom: #FAF9F7;
    --panel-white: #FFFFFF;
    --button-grey: #D1D6DB;
    --button-hover: #BCC2C8;
    --text-primary: #1F2937;
    --text-secondary: #6B7280;
    --text-disabled: #9CA3AF;
    --border-divider: #E5E7EB;
    --grid-lines: #D6DBE2;

    /* Semantic Mappings */
    --modern-primary: var(--brand-blue);
    --modern-secondary: #0063D6;
    --modern-accent: var(--brand-blue);
    --modern-dark: var(--cream-bottom);
    --modern-darker: var(--panel-white);
    --modern-light: var(--text-primary);
    --modern-border: var(--border-divider);
    
    /* Override ThatOpen UI Variables */
    --bim-ui_bg-base: var(--panel-white);
    --bim-ui_bg-contrast-20: #F3F4F6;
    --bim-ui_bg-contrast-40: var(--border-divider);
    --bim-ui_accent-base: var(--brand-blue);
    --bim-ui_bg-accent: var(--blue-light-bg);
    --bim-ui_fg-base: var(--text-primary);
  }

  /* 2. MODERN SIDEBAR PANEL STYLES */
  bim-panel.sidebar {
    background: var(--panel-white) !important;
    border: 1px solid var(--border-divider) !important;
    border-radius: 0 !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important;
    overflow: hidden;
    font-family: "Inter", system-ui, sans-serif !important;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  bim-panel.sidebar::part(header) {
    background: var(--panel-white) !important;
    color: #111827 !important;
    padding: 16px 20px !important;
    font-family: "Inter", system-ui, sans-serif !important;
    font-weight: 600 !important;
    font-size: 13px !important;
    line-height: 16px !important;
    letter-spacing: 0.02em !important;
    border-bottom: 1px solid var(--border-divider) !important;
  }

  bim-panel-section::part(header) {
    color: #111827 !important;
    font-family: "Inter", system-ui, sans-serif !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    line-height: 16px !important;
    letter-spacing: 0.02em !important;
    padding: 16px 20px 8px 20px !important;
    background: transparent !important;
    border-top: 1px solid var(--border-divider);
  }

  bim-panel-section:first-of-type::part(header) {
    border-top: none;
  }

  bim-panel-section::part(content) {
    padding: 12px 20px !important;
    background: transparent !important;
  }

  /* 3. BUTTON SYSTEM */
  /* Secondary / Neutral (Default) */
  bim-button::part(button) {
    background: var(--button-grey) !important;
    color: #2C2F33 !important;
    border: none !important;
    border-radius: 4px !important;
    padding: 8px 16px !important;
    margin: 4px 0 !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    line-height: 16px !important;
    letter-spacing: 0.01em !important;
    transition: background 0.2s ease !important;
    text-align: left !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
  }

  bim-button::part(button):hover {
    background: var(--button-hover) !important;
    transform: none !important;
    box-shadow: none !important;
  }

  bim-button::part(button):active {
    background: #AEB4BA !important;
  }

  /* Primary / Active (Blue is semantic) */
  bim-button[active]::part(button),
  bim-button.primary::part(button) {
    background: var(--brand-blue) !important;
    color: #FFFFFF !important;
  }

  bim-button[active]::part(button):hover,
  bim-button.primary::part(button):hover {
    background: #0063D6 !important;
  }

  bim-button[disabled]::part(button) {
    background: #A8CFFF !important;
    color: var(--text-disabled) !important;
    cursor: not-allowed !important;
  }

  /* 4. MODERN CHECKBOX STYLES */
  bim-checkbox::part(container) {
    border-radius: 4px !important;
    border: none !important;
    background: #C7CCD2 !important;
    padding: 8px 16px !important;
    margin: 4px 0 !important;
    box-shadow: none !important;
  }

  bim-checkbox[value="true"]::part(container) {
    background: var(--brand-blue) !important;
  }

  bim-checkbox::part(label) {
    color: var(--text-secondary) !important;
    font-size: 13px !important;
    font-weight: 400 !important;
  }

  /* 5. MODERN INPUT STYLES */
  bim-text-input::part(input) {
    background: var(--panel-white) !important;
    border: 1px solid var(--border-divider) !important;
    border-radius: 4px !important;
    color: var(--text-primary) !important;
    padding: 8px 12px !important;
    font-size: 13px !important;
    font-weight: 400 !important;
    box-shadow: none !important;
  }

  bim-text-input::part(input):focus {
    border-color: var(--brand-blue) !important;
    box-shadow: 0 0 0 2px rgba(0, 119, 255, 0.1) !important;
  }

  /* 6. MODERN DROPDOWN STYLES */
  bim-dropdown::part(button) {
    background: var(--panel-white) !important;
    border: 1px solid var(--border-divider) !important;
    border-radius: 4px !important;
    color: var(--text-primary) !important;
    padding: 8px 12px !important;
    box-shadow: none !important;
  }

  bim-option::part(base) {
    background: var(--panel-white) !important;
    color: var(--text-primary) !important;
    padding: 8px 12px !important;
    font-size: 13px !important;
  }

  bim-option::part(base):hover {
    background: var(--blue-light-bg) !important;
    color: var(--brand-blue) !important;
  }

  /* 8. CUSTOM PROPERTIES PANEL MODERNIZATION */
  #properties-panel.modern {
    background: var(--panel-white) !important;
    border: 1px solid var(--border-divider) !important;
    border-radius: 8px !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important;
    color: var(--text-primary) !important;
    font-family: "Inter", system-ui, sans-serif !important;
    padding: 0 !important;
    overflow: hidden !important;
  }

  .modern-drag-handle {
    background: var(--border-divider) !important;
    height: 4px !important;
    border-radius: 2px !important;
    margin: 12px auto !important;
    width: 40px !important;
  }

  /* 9. MODERN COMPANY HEADING */
  #company-heading.modern {
    background: var(--panel-white) !important;
    border: 1px solid var(--border-divider) !important;
    border-radius: 4px !important;
    padding: 8px 24px !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
  }

  #company-heading.modern h1 {
    color: var(--text-primary) !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    letter-spacing: 0.02em !important;
  }
`;
document.head.appendChild(styleSheet);
// ================== END OF CSS STYLING SECTION ==================

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
    const grid = grids.create(world);
    grid.config.color.set('#C2C9D1');
    const gridMaterial = grid.three.material as THREE.LineBasicMaterial;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.35;

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

    // 6. Set up Highlighter for selection with CUSTOM COLORS
    const highlighter = components.get(OBCF.Highlighter);
    highlighter.setup({ 
        world,
        // BRAND BLUE HIGHLIGHT COLORS
        selectionColor: new THREE.Color(0x0077FF), 
        hoverColor: new THREE.Color(0x0063D6),   
        outlineColor: new THREE.Color(0x0077FF), 
        outlineWidth: 1.5,                        
        fillOpacity: 0.1,                       
        zoomToSelection: true
    } as any);

    // FUNCTION TO CHANGE HIGHLIGHT COLOR DYNAMICALLY
    function setHighlightColor(colorHex: number) {
        (highlighter as any).selectionColor.set(colorHex);
    }

    // FUNCTION TO CHANGE HOVER COLOR DYNAMICALLY
    function setHoverColor(colorHex: number) {
        (highlighter as any).hoverColor.set(colorHex);
    }

    // EXAMPLE: Color-coded highlighting by category
    highlighter.events.select.onHighlight.add(async (modelIdMap: any) => {
        // You can change highlight color based on what was selected
        const firstModelId = Object.keys(modelIdMap)[0];
        if (firstModelId) {
            const model = fragments.list.get(firstModelId) as any;
            if (model) {
                // Example: Different colors for different model types
                const modelName = model.modelId.toLowerCase();
                if (modelName.includes('arch')) {
                    setHighlightColor(0x10b981); // Emerald for architectural
                } else if (modelName.includes('mep')) {
                    setHighlightColor(0xf59e0b); // Amber for MEP
                } else if (modelName.includes('struct')) {
                    setHighlightColor(0xef4444); // Red for structural
                } else {
                    setHighlightColor(0x6366f1); // Default indigo
                }
            }
        }
        
        const allElementData = [];
        for (const [modelId, localIds] of Object.entries(modelIdMap)) {
            const model = fragments.list.get(modelId) as any;
            if (!model) continue;
            if (model.getItemsData) {
                const elementData = await model.getItemsData([...(localIds as Set<number>)]);
                allElementData.push(...elementData);
            }
        }
        displayElementData(allElementData);
    });

    // Clipper setup
    const casters = components.get(OBC.Raycasters);
    casters.get(world);

    const clipper = components.get(OBC.Clipper);
    clipper.enabled = true;

    const hider = components.get(OBC.Hider);

    const isolateByCategory = async (categories: string[]) => {
        const modelIdMap: OBC.ModelIdMap = {};
        const categoriesRegex = categories.map((cat) => new RegExp(`^${cat}$`));
        for (const [, model] of fragments.list) {
            const items = await model.getItemsOfCategories(categoriesRegex);
            const localIds = Object.values(items).flat();
            modelIdMap[model.modelId] = new Set(localIds);
        }
        await hider.isolate(modelIdMap);
    };

    const hideByCategory = async (categories: string[]) => {
        const modelIdMap: OBC.ModelIdMap = {};
        const categoriesRegex = categories.map((cat) => new RegExp(`^${cat}$`));
        for (const [, model] of fragments.list) {
            const items = await model.getItemsOfCategories(categoriesRegex);
            const localIds = Object.values(items).flat();
            modelIdMap[model.modelId] = new Set(localIds);
        }
        await hider.set(false, modelIdMap);
    };

    const resetVisibility = async () => {
        await hider.set(true);
    };

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

    const categoriesDropdownTemplate = (onUpdate: (dropdown: BUI.Dropdown) => void) => {
        const onCreated = async (e?: Element) => {
            if (!e) return;
            const dropdown = e as BUI.Dropdown;
            onUpdate(dropdown);
        };
        return BUI.html`<bim-dropdown multiple ${BUI.ref(onCreated)}></bim-dropdown>`;
    };

    let dropdownA: BUI.Dropdown | null = null;
    let dropdownB: BUI.Dropdown | null = null;

    const categoriesDropdownA = BUI.Component.create<BUI.Dropdown>(() => categoriesDropdownTemplate((d) => dropdownA = d));
    const categoriesDropdownB = BUI.Component.create<BUI.Dropdown>(() => categoriesDropdownTemplate((d) => dropdownB = d));

    const updateDropdowns = async () => {
        const modelCategories = new Set<string>();
        for (const [, model] of fragments.list) {
            const categories = await model.getItemsWithGeometryCategories();
            for (const category of categories) {
                if (!category) continue;
                modelCategories.add(category);
            }
        }
        
        const populate = (dropdown: BUI.Dropdown | null) => {
            if (!dropdown) return;
            dropdown.innerHTML = '';
            for (const category of modelCategories) {
                const option = BUI.Component.create(
                    () => BUI.html`<bim-option label=${category}></bim-option>`,
                );
                dropdown.append(option);
            }
        };

        populate(dropdownA);
        populate(dropdownB);
    };

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
        await updateDropdowns();
    });

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

    // Element Properties Component - MODERN VERSION
    const propertiesPanel = document.createElement('div');
    propertiesPanel.id = 'properties-panel';
    propertiesPanel.classList.add('modern'); // Add modern class
    propertiesPanel.style.display = 'none';
    propertiesPanel.style.position = 'fixed';
    propertiesPanel.style.top = '100px'; 
    propertiesPanel.style.left = '20px';
    propertiesPanel.style.width = '340px'; // Slightly wider
    propertiesPanel.style.maxHeight = 'calc(100vh - 140px)';
    propertiesPanel.style.zIndex = '1000';
    propertiesPanel.style.overflow = 'hidden';
    document.body.append(propertiesPanel);

    // Modern drag handle
    const dragHandle = document.createElement('div');
    dragHandle.className = 'modern-drag-handle'; // Use class instead of inline styles
    propertiesPanel.appendChild(dragHandle);

    const panelContent = document.createElement('div');
    panelContent.id = 'properties-panel-content';
    panelContent.style.cssText = `
        padding: 20px;
        overflow-y: auto;
        max-height: calc(100vh - 160px);
    `;
    propertiesPanel.appendChild(panelContent);

    // Drag and Drop Logic
    let isDragging = false;
    let offset = { x: 0, y: 0 };

    dragHandle.onmousedown = (e) => {
        isDragging = true;
        offset.x = propertiesPanel.offsetLeft - e.clientX;
        offset.y = propertiesPanel.offsetTop - e.clientY;
        propertiesPanel.style.transition = 'none'; // Disable transition while dragging
    };

    document.onmousemove = (e) => {
        if (!isDragging) return;
        propertiesPanel.style.left = (e.clientX + offset.x) + 'px';
        propertiesPanel.style.top = (e.clientY + offset.y) + 'px';
        propertiesPanel.style.right = 'auto'; // Disable right-side constraint
    };

    document.onmouseup = () => {
        if (!isDragging) return;
        isDragging = false;
        propertiesPanel.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    };

    // Mobile touch support
    dragHandle.ontouchstart = (e) => {
        isDragging = true;
        const touch = e.touches[0];
        offset.x = propertiesPanel.offsetLeft - touch.clientX;
        offset.y = propertiesPanel.offsetTop - touch.clientY;
        propertiesPanel.style.transition = 'none';
    };

    document.ontouchmove = (e) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        propertiesPanel.style.left = (touch.clientX + offset.x) + 'px';
        propertiesPanel.style.top = (touch.clientY + offset.y) + 'px';
        propertiesPanel.style.right = 'auto';
    };

    document.ontouchend = () => {
        isDragging = false;
        propertiesPanel.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    };

    // Main Logo/Heading - MODERN VERSION
    const companyHeading = document.createElement('div');
    companyHeading.id = 'company-heading';
    companyHeading.classList.add('modern'); // Add modern class

    const headingStyle = document.createElement('style');
    headingStyle.textContent = `
        #company-heading.modern {
            position: fixed;
            z-index: 2000;
            pointer-events: none;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            font-family: 'Inter', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 253, 245, 0.9);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            padding: 8px 24px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }

        #company-heading.modern h1 {
            margin: 0;
            font-weight: 700;
            text-transform: uppercase;
            color: #1e293b;
            white-space: nowrap;
            font-size: 1.5rem;
            letter-spacing: 2px;
        }

        /* Desktop & Tablet */
        @media (min-width: 768px) {
            #company-heading.modern {
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
            }
        }

        /* Phone */
        @media (max-width: 767px) {
            #company-heading.modern {
                top: 15px;
                left: 15px;
                right: auto;
                transform: none;
                padding: 6px 16px;
            }
            #company-heading.modern h1 {
                font-size: 1rem;
                letter-spacing: 1px;
            }
        }
    `;
    document.head.appendChild(headingStyle);

    const headingText = document.createElement('h1');
    headingText.textContent = 'PARAMETER SPACE';
    companyHeading.appendChild(headingText);
    document.body.appendChild(companyHeading);

    // MODERN COLOR PRESETS FOR HIGHLIGHTING
    const highlightPresets = {
        modernIndigo: 0x6366f1,
        electricViolet: 0x8b5cf6,
        skyBlue: 0x0ea5e9,
        emerald: 0x10b981,
        amber: 0xf59e0b,
        rose: 0xf43f5e,
        cyan: 0x06b6d4
    };

    // UI control to change highlight colors
    function addHighlightColorControls() {
        const colorControls = document.createElement('div');
        colorControls.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 380px;
            background: rgba(30, 41, 59, 0.9);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            padding: 15px;
            display: flex;
            gap: 8px;
            z-index: 100;
        `;
        
        Object.entries(highlightPresets).forEach(([name, color]) => {
            const btn = document.createElement('button');
            btn.style.cssText = `
                width: 30px;
                height: 30px;
                border-radius: 50%;
                background: #${color.toString(16).padStart(6, '0')};
                border: 2px solid rgba(255, 255, 255, 0.3);
                cursor: pointer;
                transition: transform 0.2s;
            `;
            btn.title = `Set highlight to ${name}`;
            (btn as any).onmouseenter = () => btn.style.transform = 'scale(1.1)';
            (btn as any).onmouseleave = () => btn.style.transform = 'scale(1)';
            btn.onclick = () => setHighlightColor(color);
            colorControls.appendChild(btn);
        });
        
        document.body.appendChild(colorControls);
    }

    // Call this after initialization
    setTimeout(addHighlightColorControls, 1000);


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
        
        panelContent.innerHTML = '';
        
        if (data.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.style.color = '#666';
            emptyMsg.textContent = 'No properties found for the selection.';
            panelContent.appendChild(emptyMsg);
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
            panelContent.appendChild(container);
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
            panelContent.innerHTML = '';
            const emptyMsg = document.createElement('p');
            emptyMsg.style.color = '#666';
            emptyMsg.textContent = 'No element selected. Click an element in the 3D view first.';
            panelContent.appendChild(emptyMsg);
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
            
            const modelId = file.name.split('.').shift() || 'model';
            
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
                <span class="branding-parameter">.    Toolbar</span>
                <span class="branding-space"></span>
            </div>
        `;

        return BUI.html`
            <bim-panel active .label=${label} class="sidebar">
                <bim-panel-section label="File Operations" icon="ph:folder-open">
                    <bim-button label="Load Fragment" @click=${onLoadFragment} icon="ph:file-3d"></bim-button>
                    <bim-button label="Load IFC" @click=${onLoadIFC} icon="ph:file-3d"></bim-button>
                </bim-panel-section>

                <bim-panel-section label="Visibility Management" icon="ph:eye">
                    <bim-button label="Reset Visibility" @click=${async ({ target }: { target: BUI.Button }) => {
                        target.loading = true;
                        await resetVisibility();
                        target.loading = false;
                    }}></bim-button>
                    <bim-panel-section label="Isolation">
                        ${categoriesDropdownA}
                        <bim-button label="Isolate Category" @click=${async ({ target }: { target: BUI.Button }) => {
                            const categories = categoriesDropdownA.value;
                            if (categories.length === 0) return;
                            target.loading = true;
                            await isolateByCategory(categories);
                            target.loading = false;
                        }}></bim-button>
                    </bim-panel-section>
                    <bim-panel-section label="Hiding">
                        ${categoriesDropdownB}
                        <bim-button label="Hide Category" @click=${async ({ target }: { target: BUI.Button }) => {
                            const categories = categoriesDropdownB.value;
                            if (categories.length === 0) return;
                            target.loading = true;
                            await hideByCategory(categories);
                            target.loading = false;
                        }}></bim-button>
                    </bim-panel-section>
                </bim-panel-section>

                <bim-panel-section label="Selection & Properties" icon="ph:cursor-click">
                    <bim-button label="Properties" @click=${toggleProperties} icon="ph:info"></bim-button>
                    <bim-button label="Clear Highlights" @click=${clearHighlights} icon="ph:eraser"></bim-button>
                </bim-panel-section>

                <bim-panel-section label="View Controls" icon="ph:monitor">
                    <bim-button label="Fit to Window" @click=${fitModelToWindow} icon="ph:arrows-out"></bim-button>
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

                <bim-panel-section label="Model Tree & List" icon="ph:tree-structure">
                    <bim-panel-section label="Loaded Models" icon="mage:box-3d-fill" collapsed>${modelsList}</bim-panel-section>
                    <bim-panel-section label="Spatial Tree" icon="ph:tree-structure">
                        <bim-text-input @input=${onTreeSearch} placeholder="Search elements..." debounce="200"></bim-text-input>
                        ${spatialTree}
                    </bim-panel-section>
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