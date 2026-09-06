# Record-field reference

Generated from the same runtime schemas that validate saved records. Required fields, defaults and limits below describe API input. The manual explains their business meaning. Internal snapshots and server-computed fields are not editable inputs.

## engagement

| Field | Required | Shape and limits |
| --- | --- | --- |
| title | Yes | string; min 1 characters; max 200 characters |
| sponsorId | No | union; see API schema; default "" |
| totalHeadcount | No | union; see API schema; default null |
| outcome | Yes | string; min 1 characters; max 20000 characters |
| startDate | Yes | string; date |
| endDate | Yes | string; date |
| systems | No | array; max 80 items; default [] |
| locations | No | array; max 80 items; default [] |
| inScope | Yes | string; min 1 characters; max 20000 characters |
| outOfScope | Yes | string; min 1 characters; max 20000 characters |
| sourcePolicy | Yes | string; min 1 characters; max 20000 characters |
| visibility | Yes | string; min 1 characters; max 20000 characters |
| retentionDays | Yes | integer; minimum 1; maximum 3650 |
| reviewCadence | Yes | string; min 1 characters; max 200 characters |
| timezone | Yes | string; min 1 characters; max 200 characters |
| successCriteria | Yes | string; min 1 characters; max 20000 characters |

## duty

| Field | Required | Shape and limits |
| --- | --- | --- |
| title | Yes | string; min 1 characters; max 200 characters |
| ownerId | No | union; see API schema; default "" |
| purpose | Yes | string; min 1 characters; max 20000 characters |
| scope | Yes | string; min 1 characters; max 20000 characters |
| taskIds | No | array; max 150 items; default [] |
| evidenceIds | No | array; max 150 items; default [] |
| reviewDue | Yes | string; date |
| reason | Yes | string; min 1 characters; max 200 characters |

## handoff

| Field | Required | Shape and limits |
| --- | --- | --- |
| title | Yes | string; min 1 characters; max 200 characters |
| sourceTaskId | Yes | string; uuid |
| targetTaskId | Yes | string; uuid |
| condition | Yes | string; min 1 characters; max 20000 characters |
| outputMapping | Yes | string; min 1 characters; max 20000 characters |
| requiredInput | Yes | string; min 1 characters; max 20000 characters |
| acceptanceCheck | Yes | string; min 1 characters; max 20000 characters |
| exceptionOwnerId | Yes | string; uuid |
| timeoutHours | Yes | number; maximum 8760 |
| maxRetries | Yes | integer; minimum 0; maximum 10 |
| failureAction | Yes | string; min 1 characters; max 20000 characters |
| evidenceIds | No | array; max 150 items; default [] |
| reason | Yes | string; min 1 characters; max 200 characters |

## outcome

| Field | Required | Shape and limits |
| --- | --- | --- |
| title | Yes | string; min 1 characters; max 200 characters |
| interventionId | Yes | string; uuid |
| ownerId | Yes | string; uuid |
| result | Yes | supported, falsified, inconclusive |
| observationWindow | Yes | string; min 1 characters; max 200 characters |
| coverage | Yes | string; min 1 characters; max 20000 characters |
| confounders | Yes | string; min 1 characters; max 20000 characters |
| interpretation | Yes | string; min 1 characters; max 20000 characters |
| nextAction | Yes | string; min 1 characters; max 20000 characters |
| evidenceIds | Yes | array; max 150 items |
| reason | Yes | string; min 1 characters; max 200 characters |

## workflow

| Field | Required | Shape and limits |
| --- | --- | --- |
| title | Yes | string; min 3 characters; max 200 characters |
| purpose | Yes | string; min 5 characters; max 12000 characters |
| ownerId | Yes | string; uuid |
| taskIds | Yes | array; max 40 items |
| handoffIds | Yes | array; max 100 items |
| joinPolicy | Yes | all, any |
| timeoutHours | Yes | number; maximum 8760 |
| maxAttempts | Yes | integer; minimum 1; maximum 10 |
| reason | Yes | string; min 3 characters; max 500 characters |

## person

| Field | Required | Shape and limits |
| --- | --- | --- |
| name | Yes | string; min 1 characters; max 200 characters |
| email | Yes | string; email |
| role | Yes | string; min 1 characters; max 200 characters |
| team | Yes | string; min 1 characters; max 200 characters |
| managerId | No | union; see API schema; default "" |
| externalId | No | string; max 20000 characters; default "" |

## evidence

| Field | Required | Shape and limits |
| --- | --- | --- |
| title | Yes | string; min 1 characters; max 200 characters |
| type | Yes | Employee account, Leadership account, Customer account, Policy document, System configuration, Execution record, Public research, Other document |
| text | Yes | string; min 1 characters; max 20000 characters |
| personId | No | union; see API schema; default "" |
| locator | Yes | string; min 1 characters; max 200 characters |
| originId | No | string; max 20000 characters; default "" |
| classification | No | Known, Inferred, Assumed, Missing; default "Known" |
| bucket | No | biz, leadership, calls, org; default "org" |
| assetId | No | union; see API schema; default "" |
| sourceDate | No | string; max 20000 characters; default "" |

## task

| Field | Required | Shape and limits |
| --- | --- | --- |
| title | Yes | string; min 1 characters; max 200 characters |
| duty | Yes | string; min 1 characters; max 200 characters |
| ownerId | No | union; see API schema; default "" |
| performerId | No | union; see API schema; default "" |
| purpose | Yes | string; min 1 characters; max 20000 characters |
| trigger | Yes | string; min 1 characters; max 20000 characters |
| inputs | Yes | string; min 1 characters; max 20000 characters |
| instructions | Yes | string; min 1 characters; max 20000 characters |
| aiPrompt | No | string; max 20000 characters; default "" |
| destination | No | string; max 20000 characters; default "" |
| valueStage | No | receive, prepare, check, decide, deliver, unmapped; default "unmapped" |
| output | Yes | string; min 1 characters; max 20000 characters |
| systems | No | array; max 80 items; default [] |
| controlAreas | No | array; max 3 items; default [] |
| allowed | No | array; max 80 items; default [] |
| denied | No | array; max 80 items; default [] |
| humanGate | Yes | string; min 1 characters; max 20000 characters |
| evidenceIds | No | array; max 150 items; default [] |
| mode | No | human_only, ai_assist, ai_draft, ai_recommend, ai_execute_with_approval, ai_execute_bounded, prohibited; default "human_only" |
| classification | No | Known, Inferred, Assumed, Missing; default "Inferred" |
| conflict | No | boolean; default false |
| stopConditions | No | string; max 20000 characters; default "" |
| reviewDue | Yes | string; date |
| reason | Yes | string; min 1 characters; max 200 characters |

## request

| Field | Required | Shape and limits |
| --- | --- | --- |
| title | Yes | string; min 1 characters; max 200 characters |
| personId | Yes | string; uuid |
| type | Yes | work, leadership, confirmation |
| questions | Yes | array; max 10 items |
| questionPlanVersion | No | string; max 100 characters; default "custom-v1" |
| questionIds | No | array; max 10 items; default [] |
| emailSubject | No | string; max 200 characters; default "" |
| emailBody | No | string; max 12000 characters; default "" |
| taskIds | No | array; max 150 items; default [] |
| dueDate | Yes | string; date |
| notice | Yes | string; min 1 characters; max 20000 characters |

## candidate

| Field | Required | Shape and limits |
| --- | --- | --- |
| title | Yes | string; min 1 characters; max 200 characters |
| flow | Yes | string; min 1 characters; max 200 characters |
| pressure | Yes | string; min 1 characters; max 20000 characters |
| alternative | Yes | string; min 1 characters; max 20000 characters |
| counterfactual | Yes | string; min 1 characters; max 20000 characters |
| discriminator | Yes | string; min 1 characters; max 20000 characters |
| evidenceIds | No | array; max 150 items; default [] |
| disconfirmingEvidenceIds | No | array; max 150 items; default [] |
| ownerId | Yes | string; uuid |
| throughputUnit | Yes | string; min 1 characters; max 200 characters |

## metric

| Field | Required | Shape and limits |
| --- | --- | --- |
| title | Yes | string; min 1 characters; max 200 characters |
| question | Yes | string; min 1 characters; max 20000 characters |
| formula | Yes | string; min 1 characters; max 20000 characters |
| unit | Yes | string; min 1 characters; max 200 characters |
| population | Yes | string; min 1 characters; max 200 characters |
| source | Yes | string; min 1 characters; max 200 characters |
| ownerId | Yes | string; uuid |
| baseline | Yes | number,null |
| target | Yes | number,null |
| missingReason | No | string; max 20000 characters; default "" |
| window | Yes | string; min 1 characters; max 200 characters |
| guardrail | Yes | string; min 1 characters; max 20000 characters |

## intervention

| Field | Required | Shape and limits |
| --- | --- | --- |
| title | Yes | string; min 1 characters; max 200 characters |
| candidateId | Yes | string; uuid |
| ownerId | Yes | string; uuid |
| metricId | Yes | string; uuid |
| change | Yes | string; min 1 characters; max 20000 characters |
| prediction | Yes | string; min 1 characters; max 20000 characters |
| stopConditions | Yes | string; min 1 characters; max 20000 characters |
| reviewDate | Yes | string; date |

## agent

| Field | Required | Shape and limits |
| --- | --- | --- |
| title | Yes | string; min 1 characters; max 200 characters |
| ownerId | Yes | string; uuid |
| taskIds | Yes | array; max 50 items |
| purpose | Yes | string; min 1 characters; max 20000 characters |

## review

| Field | Required | Shape and limits |
| --- | --- | --- |
| title | Yes | string; min 1 characters; max 200 characters |
| ownerId | Yes | string; uuid |
| decision | Yes | string; min 1 characters; max 20000 characters |
| nextAction | Yes | string; min 1 characters; max 20000 characters |
| dueDate | Yes | string; date |
