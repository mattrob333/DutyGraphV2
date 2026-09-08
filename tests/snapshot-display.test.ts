import { test } from "node:test";
import assert from "node:assert/strict";
import { snapshotFactText, snapshotCompanyLink } from "../shared/snapshot-display.ts";
test("snapshot extracts reported headcount and ranges without using dates", () => {
  const fact = { category:"scale", label:"Reported team size", value:"A company source reports that Example employs 3 people. The measurement date is not stated." };
  assert.equal(snapshotFactText(fact), "3 people");
  assert.equal(snapshotFactText({...fact,value:"As of 2025, the company employs about 11–50 people."}), "About 11–50 people");
  assert.equal(snapshotFactText({...fact,value:"No employee count is published."}), "No employee count is published.");
});
test("snapshot uses concise labels and keeps unsupported prose out of bullets", () => {
  assert.equal(snapshotFactText({category:"offers", label:"AI training",value:"The public company profile also presents workforce upskilling and training as part of the offer."}),"AI training");
  assert.equal(snapshotFactText({category:"footprint",label:"Headquarters",value:"A source reports headquarters in Alpharetta, Georgia, United States."}),"Alpharetta, Georgia, United States");
});
test("competitor links use matching saved source addresses, never invented URLs", () => {
  assert.equal(snapshotCompanyLink({label:"Example Consulting",citations:[{url:"https://example.com/services"}]}),"https://example.com/services");
  assert.equal(snapshotCompanyLink({label:"Example Consulting",citations:[{url:"https://linkedin.com/company/example"}]}),undefined);
  assert.equal(snapshotCompanyLink({label:"Example Consulting",citations:[{url:"javascript:example"}]}),undefined);
});
