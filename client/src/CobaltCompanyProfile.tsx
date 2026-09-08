import { cobaltCompanySnapshot } from "../../shared/cobalt-company-example.ts";
import type { Company, RecordRow } from "../../shared/domain.ts";
import { KickoffSnapshot } from "./KickoffSnapshot.tsx";

/** Uses the same snapshot layout as research, with explicit fictional provenance. */
export function CobaltCompanyProfile({
  company,
  records,
}: {
  company: Company;
  records: RecordRow[];
}) {
  const sample = cobaltCompanySnapshot;
  const count = (kind: string) =>
    records.filter(
      (r) =>
        r.kind === kind &&
        !["withdrawn", "retracted", "superseded"].includes(r.state),
    ).length;
  return (
    <KickoffSnapshot
      illustrative
      context={{
        name: company.name,
        industry: sample.businessType,
        summary:
          "A fictional distributor of maintenance, repair and operating supplies to business customers. Follow the work from customer needs and product availability to delivery, invoicing and repeat orders.",
        streams: company.settings.businessProfile?.streams || [],
        provenance: sample.provenance,
        unknowns: sample.unknowns,
        facts: [
          ...sample.offers.map((offer) => ({
            category: "offers",
            label: offer,
            value: offer,
          })),
          {
            category: "customers",
            label: "Customers",
            value: "Business purchasing teams",
          },
          {
            category: "scale",
            label: "People",
            value: `${count("person")} people in the sample`,
          },
          {
            category: "scale",
            label: "Duties",
            value: `${count("duty")} recorded duties`,
          },
          {
            category: "scale",
            label: "Tasks",
            value: `${count("task")} task cards`,
          },
        ],
      }}
    />
  );
}
