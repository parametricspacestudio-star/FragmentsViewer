import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import * as FRAGS from '@thatopen/fragments';
import * as BUI from "@thatopen/ui";

class ProgressBar {
    progressDiv: HTMLElement;
    constructor() {
        this.progressDiv = document.getElementById('progress')!;
        this.progressDiv.style.display = 'inherit';
    }
    SetText(text: string) { this.progressDiv.textContent = text; }
    Hide() { this.progressDiv.style.display = 'none'; }
}

async function FitModelToWindow(world: OBC.World, fragments: FRAGS.FragmentsModels) {
    if (fragments.models.list.size === 0 || world.camera.controls === undefined) return;
    let boxMinMaxPoints: THREE.Vector3[] = [];
    for (const model of fragments.models.list.values()) {
        const boxes = await model.getBoxes();
        for (const box of boxes) {
            boxMinMaxPoints.push(box.min);
            boxMinMaxPoints.push(box.max);
        }
    }
    if (boxMinMaxPoints.length === 0) return;
    let boundingBox = new THREE.Box3().setFromPoints(boxMinMaxPoints);
    let boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
    let perspectiveCamera = world.camera.three as THREE.PerspectiveCamera;
    let fieldOfView = perspectiveCamera.fov / 2.0;
    if (perspectiveCamera.aspect < 1.0) fieldOfView = fieldOfView * perspectiveCamera.aspect;
    let center = boundingSphere.center;
    let centerToEye = new THREE.Vector3().subVectors(perspectiveCamera.position, center).normalize();
    let distance = boundingSphere.radius / Math.sin(THREE.MathUtils.degToRad(fieldOfView));
    let eye = new THREE.Vector3().addVectors(center, centerToEye.multiplyScalar(distance));
    perspectiveCamera.near = 1.0;
    perspectiveCamera.far = distance * 100.0;
    perspectiveCamera.updateProjectionMatrix();
    world.camera.controls.setLookAt(eye.x, eye.y, eye.z, center.x, center.y, center.z, true);
    fragments.update(true);
}

function IsCompressedBuffer(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 2) return false;
    let intArray = new Uint8Array(buffer);
    return intArray[0] === 0x78 && (intArray[1] === 0x01 || intArray[1] === 0x9C || intArray[1] === 0xDA);
}

let updateClassificationUI = () => {};

async function LoadModelInternal(buffer: ArrayBuffer, world: OBC.World, fragments: FRAGS.FragmentsModels, components: OBC.Components) {
    try {
        const isCompressed = IsCompressedBuffer(buffer);
        const model = await fragments.load(buffer, {
            modelId: THREE.MathUtils.generateUUID(),
            raw: !isCompressed
        });
        world.scene.three.add(model.object);
        model.object.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh && child.material) {
                if (Array.isArray(child.material)) {
                    for (const m of child.material) {
                        m.side = THREE.DoubleSide;
                    }
                } else {
                    child.material.side = THREE.DoubleSide;
                }
            }
        });
        
        const indexer = components.get(OBCF.IfcRelationsIndexer);
        const classifier = components.get(OBC.Classifier);
        
        await indexer.process(model);
        await classifier.bySpatialStructure(model);
        await classifier.byEntity(model);
        
        updateClassificationUI();
        await FitModelToWindow(world, fragments);
        fragments.update(true);
        return model;
    } catch (error) {
        console.error("Error loading model:", error);
        alert("Failed to load fragment.");
    }
}

async function LoadModelFromBuffer(buffer: ArrayBuffer, world: OBC.World, fragments: FRAGS.FragmentsModels, components: OBC.Components) {
    fragments.update(true);
    const progressBar = new ProgressBar();
    progressBar.SetText('Loading model...');
    const model = await LoadModelInternal(buffer, world, fragments, components);
    progressBar.Hide();
    return model;
}

async function Init() {
    const components = new OBC.Components();
    components.init();

    // Register essential components
    components.add(OBCF.IfcRelationsIndexer);
    components.add(OBC.Classifier);
    components.add(OBC.FragmentsManager);
    components.add(OBC.Worlds);

    const worlds = components.get(OBC.Worlds);
    const world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();
    world.scene = new OBC.SimpleScene(components);
    world.scene.setup();
    world.scene.three.background = null;
    const container = document.getElementById('container')!;
    world.renderer = new OBC.SimpleRenderer(components, container);
    world.camera = new OBC.SimpleCamera(components);
    world.camera.controls.setLookAt(100, 100, 100, 0, 0, 0);
    const grids = components.get(OBC.Grids);
    grids.create(world);
    const highlighter = components.get(OBCF.Highlighter);
    highlighter.setup({ world });

    const workerUrl = 'https://cdn.jsdelivr.net/npm/@thatopen/fragments@3.0.6/dist/Worker/worker.mjs';
    const fragments = new FRAGS.FragmentsModels(workerUrl);
    fragments.settings.autoCoordinate = false;
    const ifcImporter = new FRAGS.IfcImporter();
    ifcImporter.wasm = { absolute: true, path: "https://unpkg.com/web-ifc@0.0.72/" };

    BUI.Manager.init();
    const propsTable = document.createElement("bim-table") as any;
    const classificationTree = document.createElement("bim-tree") as any;

    updateClassificationUI = () => {
        const classifier = components.get(OBC.Classifier);
        const treeData: any[] = [];
        const classifierList = classifier.list;
        for (const [name, classification] of Object.entries(classifierList)) {
            const modelNodes: any[] = [];
            for (const modelID in (classification as any)) {
                const model = fragments.models.list.get(modelID);
                const modelName = (model as any)?.name || "Unnamed Model";
                const groupNode = { label: modelName, children: [] as any[] };
                const map = (classification as any)[modelID];
                for (const label in map) {
                    const expressIDs = map[label];
                    const children = Array.from(expressIDs as any).map((id: any) => ({
                        label: `Element ${id}`,
                        data: { modelID, expressID: id }
                    }));
                    groupNode.children.push({ label, children });
                }
                modelNodes.push(groupNode);
            }
            treeData.push({ label: name, children: modelNodes });
        }
        classificationTree.data = treeData;
    };

    const updateUI = async () => {
        const highlighterComp = components.get(OBCF.Highlighter);
        const selection = (highlighterComp.selection as any).select;
        if (!selection || Object.keys(selection).length === 0) {
            propsTable.data = [];
            return;
        }
        const indexer = components.get(OBCF.IfcRelationsIndexer);
        const fragmentsManager = components.get(OBC.FragmentsManager);
        const allProps: any[] = [];
        for (const fragID in selection) {
            const frag = (fragmentsManager.list as any).get(fragID);
            if (!frag) continue;
            const model = frag.group;
            for (const expressID of selection[fragID]) {
                const props = await model.getProperties(expressID);
                if (props) allProps.push(props);
                const psets = (indexer as any).getEntityRelations(model, expressID, "IsDefinedBy");
                if (psets) {
                    for (const psetID of psets) {
                        const psetProps = await model.getProperties(psetID);
                        if (psetProps) allProps.push(psetProps);
                    }
                }
            }
        }
        propsTable.data = allProps;
    };

    const highlighterEvents = components.get(OBCF.Highlighter);
    (highlighterEvents.events as any).select.add(() => updateUI());
    (highlighterEvents.events as any).clear.add(() => updateUI());

    classificationTree.addEventListener("item-selected", (event: any) => {
        const node = event.detail.item;
        if (node.data) {
            const { modelID, expressID } = node.data;
            const model = fragments.models.list.get(modelID);
            if (model) {
                const highlighterComp = components.get(OBCF.Highlighter);
                (highlighterComp.selection as any).select = {
                    [(model as any).uuid || (model as any).id]: new Set([expressID])
                };
            }
        }
    });

    const panel = BUI.Component.create<BUI.PanelSection>(() => {
        const onFitToWindow = async () => await FitModelToWindow(world, fragments);
        const onLoadIFC = () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.ifc';
            fileInput.onchange = async (event: any) => {
                const file = event.target.files[0];
                if (!file) return;
                const progressBar = new ProgressBar();
                try {
                    progressBar.SetText('Converting IFC...');
                    const buffer = await file.arrayBuffer();
                    const fragmentBytes = await ifcImporter.process({
                        bytes: new Uint8Array(buffer),
                        progressCallback: (progress: any) => progressBar.SetText(`Converting IFC... ${Math.round(progress * 100)}%`),
                    });
                    await LoadModelFromBuffer(fragmentBytes.buffer as ArrayBuffer, world, fragments, components);
                } catch (error: any) {
                    alert(`Failed: ${error.message}`);
                } finally { progressBar.Hide(); }
            };
            fileInput.click();
        };
        const onToggleVisibility = () => {
            const highlighterComp = components.get(OBCF.Highlighter);
            const selection = (highlighterComp.selection as any).select;
            if (!selection) return;
            for (const fragID in selection) {
                const fragmentsManager = components.get(OBC.FragmentsManager);
                const frag = (fragmentsManager.list as any).get(fragID);
                if (!frag) continue;
                for (const id of selection[fragID]) {
                    const hidden = (frag as any).hiddenItems.has(id);
                    (frag as any).setVisible([id], !hidden);
                }
            }
        };

        return BUI.html`
            <bim-panel id="controls-panel" active label="IFC Viewer" class="sidebar">
                <bim-panel-section label="Toolbar">
                    <bim-button label="Load IFC" @click=${onLoadIFC}></bim-button>
                    <bim-button label="Toggle Visibility" @click=${onToggleVisibility}></bim-button>
                    <bim-button label="Reset View" @click=${onFitToWindow}></bim-button>
                </bim-panel-section>
                <bim-panel-section label="Classification Tree">
                    ${classificationTree}
                </bim-panel-section>
                <bim-panel-section label="Properties">
                    ${propsTable}
                </bim-panel-section>
            </bim-panel>`;
    });

    document.body.append(panel);
}

Init();
