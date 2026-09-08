import test from "node:test";
import assert from "node:assert/strict";
import { invitationOrigin } from "../server/origins.ts";
test("invitation origin brands the legacy production alias and preserves explicit local/custom origins", () => {
 assert.equal(invitationOrigin({APP_ORIGIN:"https://dutygraph-v2.vercel.app"}), "https://dutygraph.com");
 assert.equal(invitationOrigin({APP_ORIGIN:"http://127.0.0.1:4339"}), "http://127.0.0.1:4339");
 assert.equal(invitationOrigin({PUBLIC_APP_ORIGIN:"https://dutygraph.com", APP_ORIGIN:"https://example.vercel.app"}), "https://dutygraph.com");
 assert.throws(() => invitationOrigin({PUBLIC_APP_ORIGIN:"https://user:secret@example.com"}));
 assert.throws(() => invitationOrigin({PUBLIC_APP_ORIGIN:"https://example.com/path"}));
});
