import type { BusinessProfile } from "./business-types.ts";
import type { RecordRow } from "./domain.ts";

export type BusinessStageLink = { streamId: string; stageId: string };

export type StageWorkPerson = {
  person: RecordRow;
  personId: string;
  dutyIds: string[];
  taskIds: string[];
  ownedDutyIds: string[];
  ownedTaskIds: string[];
  performedTaskIds: string[];
};

export type StageWorkScope = {
  tasks: RecordRow[];
  duties: RecordRow[];
  people: StageWorkPerson[];
  flows: { workflow: RecordRow; taskIds: string[]; tasks: RecordRow[] }[];
  taskIds: string[];
  dutyIds: string[];
  personIds: string[];
  unownedTaskIds: string[];
  unperformedTaskIds: string[];
  unownedDutyIds: string[];
};

export type StageWorkStage = StageWorkScope & {
  id: string;
  name: string;
  streamId: string;
};

export type StageWorkStream = StageWorkScope & {
  id: string;
  name: string;
  primary: boolean;
  stages: StageWorkStage[];
};

export type StageWorkMap = {
  streams: StageWorkStream[];
  all: StageWorkScope;
  unmapped: StageWorkScope;
  invalidStageLinks: (BusinessStageLink & { recordId: string })[];
  missingTaskIds: string[];
};

const inactive = new Set(["withdrawn", "retracted", "superseded"]);
const unique = (ids: string[]) => [...new Set(ids)];
const taskReferences = (record: RecordRow): string[] =>
  Array.isArray(record.data.taskIds) ? unique(record.data.taskIds) : [];
const stageKey = (streamId: string, stageId: string) =>
  `${streamId}:${stageId}`;

function emptyScope(): StageWorkScope {
  return {
    tasks: [],
    duties: [],
    people: [],
    flows: [],
    taskIds: [],
    dutyIds: [],
    personIds: [],
    unownedTaskIds: [],
    unperformedTaskIds: [],
    unownedDutyIds: [],
  };
}

/**
 * Read recorded membership only. Business stages are distinct from task.valueStage,
 * reporting relationships, titles and departments. This view never grants authority.
 */
export function stageWorkMap(
  records: RecordRow[],
  profile?: BusinessProfile | null,
): StageWorkMap {
  // State APIs supply current rows. Also tolerate duplicate references/versions
  // without resurrecting an older active row after its latest version was removed.
  const latest = new Map<string, RecordRow>();
  for (const record of records) {
    const old = latest.get(record.id);
    if (!old || (record.version || 0) >= (old.version || 0))
      latest.set(record.id, record);
  }
  const current = [...latest.values()].filter((r) => !inactive.has(r.state));
  const people = current.filter((r) => r.kind === "person");
  const tasks = current.filter((r) => r.kind === "task");
  const duties = current.filter((r) => r.kind === "duty");
  const workflows = current.filter((r) => r.kind === "workflow");
  const personIds = new Set(people.map((p) => p.id));
  const taskIds = new Set(tasks.map((t) => t.id));
  const knownStages = new Set(
    (profile?.streams || []).flatMap((stream) =>
      stream.stages.map((stage) => stageKey(stream.id, stage.id)),
    ),
  );
  const invalidStageLinks: StageWorkMap["invalidStageLinks"] = [];
  const rawLinks = (record: RecordRow): BusinessStageLink[] =>
    Array.isArray(record.data.businessStageLinks)
      ? record.data.businessStageLinks
      : [];
  const validLinks = (record: RecordRow): Set<string> => {
    const links = new Set<string>();
    for (const link of rawLinks(record)) {
      if (
        !link ||
        typeof link.streamId !== "string" ||
        typeof link.stageId !== "string"
      )
        continue;
      const key = stageKey(link.streamId, link.stageId);
      if (knownStages.has(key)) links.add(key);
      else if (
        !invalidStageLinks.some(
          (l) =>
            l.recordId === record.id && stageKey(l.streamId, l.stageId) === key,
        )
      ) {
        invalidStageLinks.push({
          recordId: record.id,
          streamId: link.streamId,
          stageId: link.stageId,
        });
      }
    }
    return links;
  };
  const dutyStages = new Map(duties.map((duty) => [duty.id, validLinks(duty)]));
  const taskDuties = new Map<string, RecordRow[]>();
  for (const duty of duties) {
    for (const id of taskReferences(duty)) {
      if (taskIds.has(id))
        taskDuties.set(id, [...(taskDuties.get(id) || []), duty]);
    }
  }
  const taskStages = new Map<string, Set<string>>();
  for (const task of tasks) {
    const links = validLinks(task);
    // An explicit (even stale) task assignment overrides inherited membership.
    // Do not silently turn an invalid explicit assignment into a different stage.
    if (!rawLinks(task).length) {
      for (const duty of taskDuties.get(task.id) || []) {
        for (const key of dutyStages.get(duty.id) || []) links.add(key);
      }
    }
    taskStages.set(task.id, links);
  }
  const scope = (
    scopeTasks: RecordRow[],
    scopeDuties: RecordRow[],
  ): StageWorkScope => {
    const inScope = new Set(scopeTasks.map((t) => t.id));
    const participants = people.flatMap((person): StageWorkPerson[] => {
      const ownedDutyIds = scopeDuties
        .filter((d) => d.data.ownerId === person.id)
        .map((d) => d.id);
      const ownedTaskIds = scopeTasks
        .filter((t) => t.data.ownerId === person.id)
        .map((t) => t.id);
      const performedTaskIds = scopeTasks
        .filter((t) => t.data.performerId === person.id)
        .map((t) => t.id);
      const taskIds = unique([...ownedTaskIds, ...performedTaskIds]);
      const linked = new Set(taskIds);
      const dutyIds = unique([
        ...ownedDutyIds,
        ...scopeDuties
          .filter((d) => taskReferences(d).some((id) => linked.has(id)))
          .map((d) => d.id),
      ]);
      return dutyIds.length || taskIds.length
        ? [
            {
              person,
              personId: person.id,
              dutyIds,
              taskIds,
              ownedDutyIds,
              ownedTaskIds,
              performedTaskIds,
            },
          ]
        : [];
    });
    return {
      tasks: scopeTasks,
      duties: scopeDuties,
      people: participants,
      flows: workflows.flatMap((workflow) => {
        const ids = new Set(taskReferences(workflow));
        const relevantTasks = scopeTasks.filter(
          (t) => ids.has(t.id) && inScope.has(t.id),
        );
        return relevantTasks.length
          ? [
              {
                workflow,
                tasks: relevantTasks,
                taskIds: relevantTasks.map((t) => t.id),
              },
            ]
          : [];
      }),
      taskIds: scopeTasks.map((t) => t.id),
      dutyIds: scopeDuties.map((d) => d.id),
      personIds: participants.map((p) => p.personId),
      unownedTaskIds: scopeTasks
        .filter((t) => !personIds.has(t.data.ownerId))
        .map((t) => t.id),
      unperformedTaskIds: scopeTasks
        .filter((t) => !personIds.has(t.data.performerId))
        .map((t) => t.id),
      unownedDutyIds: scopeDuties
        .filter((d) => !personIds.has(d.data.ownerId))
        .map((d) => d.id),
    };
  };
  const scopeForStages = (keys: Set<string>): StageWorkScope => {
    const scopeTasks = tasks.filter((t) =>
      [...(taskStages.get(t.id) || [])].some((key) => keys.has(key)),
    );
    const includedTasks = new Set(scopeTasks.map((t) => t.id));
    const scopeDuties = duties.filter(
      (d) =>
        [...(dutyStages.get(d.id) || [])].some((key) => keys.has(key)) ||
        taskReferences(d).some((id) => includedTasks.has(id)),
    );
    return scope(scopeTasks, scopeDuties);
  };
  const streams = (profile?.streams || []).map(
    (stream, index): StageWorkStream => ({
      id: stream.id,
      name: stream.name,
      primary: index === 0,
      ...scopeForStages(
        new Set(stream.stages.map((stage) => stageKey(stream.id, stage.id))),
      ),
      stages: stream.stages.map((stage): StageWorkStage => ({
        id: stage.id,
        name: stage.name,
        streamId: stream.id,
        ...scopeForStages(new Set([stageKey(stream.id, stage.id)])),
      })),
    }),
  );
  // A duty connected through a mapped task is represented on that task's stage.
  // Its remaining unassigned tasks stay visible independently under Unmapped.
  const unmappedTasks = tasks.filter((t) => !taskStages.get(t.id)?.size);
  const unmappedDuties = duties.filter(
    (d) =>
      !dutyStages.get(d.id)?.size &&
      !taskReferences(d).some((id) => taskStages.get(id)?.size),
  );
  return {
    streams,
    all: scope(tasks, duties),
    unmapped: scope(unmappedTasks, unmappedDuties),
    invalidStageLinks,
    missingTaskIds: unique(
      [...duties, ...workflows]
        .flatMap(taskReferences)
        .filter((id) => !taskIds.has(id)),
    ),
  };
}

/** Omit both IDs for all recorded work; omit stageId for the selected whole stream. */
export function selectStageWork(
  model: StageWorkMap,
  streamId?: string,
  stageId?: string,
): StageWorkScope {
  if (!streamId) return stageId ? emptyScope() : model.all;
  const stream = model.streams.find((s) => s.id === streamId);
  if (!stream) return emptyScope();
  return stageId
    ? stream.stages.find((s) => s.id === stageId) || emptyScope()
    : stream;
}
