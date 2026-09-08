# Company Work Map

Business stages are broader than duties: a stage groups work across roles; a duty is an ongoing responsibility; a task is a specific piece of work. There is no universal stage count. Templates are suggested starting points, and saved streams support 1-16 stages. Hover a stage or focus/tap its info button for an explanation and typical work. Company descriptions take precedence; renamed/custom stages ask for a description instead of inheriting unrelated examples. Edit descriptions in Discovery > Edit the profile and stages.

Open **Company Work Map** in the sidebar. The default path is simple: choose a business stream, choose a stage, select a highlighted person, then inspect that person’s duties, tasks and task flows. The map connects the saved business model to recorded work. A business template alone never creates company evidence.

## Follow the work

1. Select a stream. The first saved stream is marked **Primary stream**; the others are **Supporting stream**.
2. Select a stage, or choose **All company work**. Stage names come from the saved business profile.
3. Select a person in the highlighted organization. The person’s labels distinguish **Owns work** from **Does the work**.
4. Open a duty, task or flow to inspect its record, inputs, output, evidence, handoffs and human decision boundary.

The organization is highlighted from recorded task owners and performers in the selected stage. Reporting lines remain manager relationships from the roster. The map does not infer work from a title, department, reporting line, task name or old `valueStage` field. Owners and performers describe accountability and performance; neither role is an approval.

## Assign stages explicitly

Use **Assign stages** on a duty or task. A duty can belong to more than one stream or stage. Its tasks inherit the duty’s stage links through the duty’s recorded task IDs. A task with its own stage links overrides that inheritance; clear the task links to return to its duty’s stages. A task title, duty label or stage position never creates an assignment automatically.

Unassigned work appears under **Work not assigned to a stage**. Work with no recorded owner or performer stays visible as a gap. If a profile stage is removed, the old link appears under **Repair assignments to removed stages** so the advisor can choose a current stage. Missing links and missing people remain gaps instead of becoming guessed relationships. Saving an assignment creates a normal record version and follows the usual review rules.

## Flows and older views

The task flow below the people section uses recorded workflow and handoff links. Branches and nearby cards are layout choices; only an explicit handoff establishes that work passes between tasks. Open **Workflows & cases** to inspect a workflow definition or a manually observed case. Case controls record observations and do not call an external business system.

The former **Connected**, **Work flow**, **Org & duties** and **Agents & controls** views remain available for focused investigations. The detailed task map is still below the new stage map. PostgreSQL is authoritative; Neo4j is a derived projection. The normal Cobalt sample opens with a persisted synthetic business profile and authored stage assignments; those assignments are editable and remain clearly synthetic. If an older or incomplete Cobalt workspace cannot load that profile, the guarded legacy fallback may show illustrative assignments for known fixture keys. It is clearly labeled and read-only, never writes assignments, and never classifies customer work.

## Get the first connected map

Discovery saves proposed stage links with AI-created duties and task cards. Open Company Work Map to explore the result, then correct the work or its stage assignments. For older unassigned work, choose **Connect existing work with AI**. Open a duty or task to inspect the inference basis and confidence. These links do not grant authority or count as a person confirming the work.
