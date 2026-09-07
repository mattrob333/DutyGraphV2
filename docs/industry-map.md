# Industry map research baseline

Discovery > Research & contact > Open industry map opens the same versioned canvas used in Strategy. Run public research first, then generate the map from collected sources. It can run before BMC. After leadership clarifies the scope, refresh research and rerun the map. Current maps are included as AI interpretations in kickoff preparation and as upstream artifacts for dependent strategy frameworks.

The user-provided ten-step methodology is preserved in shared/industry-map-prompt.ts. framework-specs.ts adapts it to the validated output contract: classification, ten research views, strategic implications, and changes/monitoring. Every finding has source IDs, evidence basis, confidence/reason, and next step. Entity names and relationship descriptions are shared across sections; this does not create industry entities in Neo4j.

The latest previous map is passed as historical comparison context, not evidence. Saved versions remain available. New source fingerprints invalidate dependent runs. The upgraded instruction version also makes older analyses stale. Refresh is manual, not scheduled monitoring. The AI does not browse independently; it uses the research pipeline's collected sources. Missing dates, talent flows, market shares and other unsupported detail must remain unknown. No paid generation was executed to validate this change.
