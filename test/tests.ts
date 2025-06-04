import { assert, assertEquals, assertThrows } from "@std/assert";
import { copy } from "@std/fs/copy";

import { SimpleFsDeno } from "../mod.ts";

let i = 0;

async function inTmpCopy(
  original: string,
  thunk: (fs: SimpleFsDeno) => Promise<void>,
) {
  const myI = i;
  i += 1;

  const originalCwd = Deno.cwd();

  const tmpPath = `test/tmp/tmp${i}_${original}`;

  try {
    await Deno.remove(tmpPath, { recursive: true });
  } catch (_) {
    // no-op
  }

  await copy(original, tmpPath);

  const fs = new SimpleFsDeno(tmpPath);
  await thunk(fs);

  Deno.chdir(originalCwd);
  await Deno.remove(tmpPath, { recursive: true });
}

Deno.test("cd", async () => {
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertEquals(fs.pwd().toString(), "/");

    fs.cd("blog/recipes");
    assertEquals(fs.pwd().toString(), "/blog/recipes");

    fs.cd("..");
    assertEquals(fs.pwd().toString(), "/blog");

    fs.cd("/chess");
    assertEquals(fs.pwd().toString(), "/chess");

    assertThrows(() => {
      fs.cd("../../../..");
    });

    // Assert that the throwing cd didn't change the pwd.
    assertEquals(fs.pwd().toString(), "/chess");

    assertThrows(() => {
      fs.cd("doesntexist");
    });

    assertThrows(() => {
      fs.cd("game1/move1");
    });
  });
});
