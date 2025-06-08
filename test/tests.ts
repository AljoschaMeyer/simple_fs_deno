import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { copy } from "@std/fs/copy";

import { SimpleFsDeno } from "../mod.ts";

const originalCwd = Deno.cwd();

let i = 0;

async function inTmpCopy(
  original: string,
  thunk: (fs: SimpleFsDeno) => Promise<void>,
) {
  const myI = i;
  i += 1;

  const tmpPath = `test/tmp/tmp${myI}_${original}`;

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

const curryText = "Mix ingredients, then eat.";
const pancakeText = "Buy cake, heat in pan.";

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

Deno.test("ls", async () => {
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    const set1 = await fs.ls();
    assertEquals(set1.size, 3);
    assert(set1.has("blog"));
    assert(set1.has("chess"));
    assert(set1.has("emptyDir"));

    const set2 = await fs.ls("blog/posts");
    assertEquals(set2.size, 2);
    assert(set2.has("intro"));
    assert(set2.has("deepThoughts.md"));

    assertEquals((await fs.ls("emptyDir")).size, 0);

    await assertRejects(async () => {
      await fs.ls("..");
    });

    await assertRejects(async () => {
      await fs.ls("blog/recipes/nope");
    });

    await assertRejects(async () => {
      await fs.ls("blog/recipes/curry");
    });
  });
});

Deno.test("lsSync", async () => {
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    const set1 = fs.lsSync();
    assertEquals(set1.size, 3);
    assert(set1.has("blog"));
    assert(set1.has("chess"));
    assert(set1.has("emptyDir"));

    const set2 = fs.lsSync("blog/posts");
    assertEquals(set2.size, 2);
    assert(set2.has("intro"));
    assert(set2.has("deepThoughts.md"));

    assertEquals((fs.lsSync("emptyDir")).size, 0);

    assertThrows(() => {
      fs.lsSync("..");
    });

    assertThrows(() => {
      fs.lsSync("blog/recipes/nope");
    });

    assertThrows(() => {
      fs.lsSync("blog/recipes/curry");
    });
  });
});

Deno.test("stat", async () => {
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertEquals(await fs.stat("blog/posts"), "directory");
    assertEquals(await fs.stat("blog/recipes/curry"), "data");
    assertEquals(await fs.stat("blog/recipes/nope"), "nothing");

    await assertRejects(async () => {
      await fs.stat("..");
    });
  });
});

Deno.test("statSync", async () => {
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertEquals(fs.statSync("blog/posts"), "directory");
    assertEquals(fs.statSync("blog/recipes/curry"), "data");
    assertEquals(fs.statSync("blog/recipes/nope"), "nothing");

    assertThrows(() => {
      fs.statSync("..");
    });
  });
});

Deno.test("read", async () => {
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    const encoder = new TextEncoder();
    const curryBytes = encoder.encode(curryText);
    assertEquals(await fs.read("blog/recipes/curry"), curryBytes);

    await assertRejects(async () => {
      await fs.read("..");
    });

    await assertRejects(async () => {
      await fs.read("blog/recipes/nope");
    });

    await assertRejects(async () => {
      await fs.read("blog");
    });
  });
});

Deno.test("readSync", async () => {
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    const encoder = new TextEncoder();
    const curryBytes = encoder.encode(curryText);
    assertEquals(fs.readSync("blog/recipes/curry"), curryBytes);

    assertThrows(() => {
      fs.readSync("..");
    });

    assertThrows(() => {
      fs.readSync("blog/recipes/nope");
    });

    assertThrows(() => {
      fs.readSync("blog");
    });
  });
});

Deno.test("write", async () => {
  const encoder = new TextEncoder();
  const pancakeBytes = encoder.encode(pancakeText);

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.write("blog/recipes/pancakes", pancakeBytes);
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsExtraRecipe`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.write("blog/recipes/pancakes", pancakeBytes, "timid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsExtraRecipe`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.write("blog/recipes/pancakes", pancakeBytes, "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsExtraRecipe`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.write("blog/recipes/pancakes", pancakeBytes, "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsExtraRecipe`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.write("blog/recipes/curry", pancakeBytes);
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.write("blog/recipes/curry", pancakeBytes, "timid");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.write("blog/recipes/curry", pancakeBytes, "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.write("blog/recipes/curry", pancakeBytes, "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsUpdatedCurry`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.write("chess", pancakeBytes);
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.write("chess", pancakeBytes, "timid");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.write("chess", pancakeBytes, "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.write("chess", pancakeBytes, "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsButChessTurnedIntoPancakes`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.write("newdir/pancakes", pancakeBytes);
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsNewFileInNewDirectory`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.write("newdir/pancakes", pancakeBytes, "timid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsNewFileInNewDirectory`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.write("newdir/pancakes", pancakeBytes, "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsNewFileInNewDirectory`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.write("newdir/pancakes", pancakeBytes, "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsNewFileInNewDirectory`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.write("..", pancakeBytes, "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.write("/", pancakeBytes, "assertive");
    });
  });
});

Deno.test("writeSync", async () => {
  const encoder = new TextEncoder();
  const pancakeBytes = encoder.encode(pancakeText);

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.writeSync("blog/recipes/pancakes", pancakeBytes);
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsExtraRecipe`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.writeSync("blog/recipes/pancakes", pancakeBytes, "timid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsExtraRecipe`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.writeSync("blog/recipes/pancakes", pancakeBytes, "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsExtraRecipe`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.writeSync("blog/recipes/pancakes", pancakeBytes, "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsExtraRecipe`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.writeSync("blog/recipes/curry", pancakeBytes);
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.writeSync("blog/recipes/curry", pancakeBytes, "timid");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.writeSync("blog/recipes/curry", pancakeBytes, "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.writeSync("blog/recipes/curry", pancakeBytes, "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsUpdatedCurry`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.writeSync("chess", pancakeBytes);
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.writeSync("chess", pancakeBytes, "timid");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.writeSync("chess", pancakeBytes, "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.writeSync("chess", pancakeBytes, "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsButChessTurnedIntoPancakes`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.writeSync("newdir/pancakes", pancakeBytes);
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsNewFileInNewDirectory`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.writeSync("newdir/pancakes", pancakeBytes, "timid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsNewFileInNewDirectory`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.writeSync("newdir/pancakes", pancakeBytes, "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsNewFileInNewDirectory`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.writeSync("newdir/pancakes", pancakeBytes, "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsNewFileInNewDirectory`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.writeSync("..", pancakeBytes, "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.writeSync("/", pancakeBytes, "assertive");
    });
  });
});

Deno.test("mkdir", async () => {
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.mkdir("blog/recipes/pancakes");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsExtraDir`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.mkdir("blog/recipes/pancakes", "timid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsExtraDir`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.mkdir("blog/recipes/pancakes", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsExtraDir`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.mkdir("blog/recipes/pancakes", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsExtraDir`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.mkdir("blog/recipes/curry");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.mkdir("blog/recipes/curry", "timid");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.mkdir("blog/recipes/curry", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.mkdir("blog/recipes/curry", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsUpdatedCurryDir`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.mkdir("chess");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.mkdir("chess", "timid");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.mkdir("chess", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.mkdir("chess", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsButChessTurnedIntoPancakesDir`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.mkdir("newdir/pancakes");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsNewDirectoryInNewDirectory`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.mkdir("newdir/pancakes", "timid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsNewDirectoryInNewDirectory`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.mkdir("newdir/pancakes", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsNewDirectoryInNewDirectory`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.mkdir("newdir/pancakes", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsNewDirectoryInNewDirectory`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.mkdir("..", "assertive");
    });
  });
});

Deno.test("mkdirSync", async () => {
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.mkdirSync("blog/recipes/pancakes");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsExtraDir`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.mkdirSync("blog/recipes/pancakes", "timid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsExtraDir`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.mkdirSync("blog/recipes/pancakes", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsExtraDir`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.mkdirSync("blog/recipes/pancakes", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsExtraDir`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.mkdirSync("blog/recipes/curry");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.mkdirSync("blog/recipes/curry", "timid");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.mkdirSync("blog/recipes/curry", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.mkdirSync("blog/recipes/curry", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsUpdatedCurryDir`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.mkdirSync("chess");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.mkdirSync("chess", "timid");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.mkdirSync("chess", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.mkdirSync("chess", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsButChessTurnedIntoPancakesDir`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.mkdirSync("newdir/pancakes");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsNewDirectoryInNewDirectory`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.mkdirSync("newdir/pancakes", "timid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsNewDirectoryInNewDirectory`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.mkdirSync("newdir/pancakes", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsNewDirectoryInNewDirectory`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.mkdirSync("newdir/pancakes", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsNewDirectoryInNewDirectory`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.mkdirSync("..", "assertive");
    });
  });
});

Deno.test("remove", async () => {
  await inTmpCopy("test/expected_fss/testFsExtraDir", async (fs) => {
    await fs.remove("blog/recipes/pancakes");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy(
    "test/expected_fss/testFsNewFileInNewDirectory",
    async (fs) => {
      await fs.remove("newdir");
      const controlFs = new SimpleFsDeno(
        `${originalCwd}/test/expected_fss/testFs`,
      );
      assert(fs.eq(controlFs));
    },
  );

  await inTmpCopy(
    "test/expected_fss/testFsNewDirectoryInNewDirectory",
    async (fs) => {
      await fs.remove("newdir");
      const controlFs = new SimpleFsDeno(
        `${originalCwd}/test/expected_fss/testFs`,
      );
      assert(fs.eq(controlFs));
    },
  );

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.remove("..");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.remove("/");
    });
  });
});

Deno.test("removeSync", async () => {
  await inTmpCopy("test/expected_fss/testFsExtraDir", async (fs) => {
    fs.removeSync("blog/recipes/pancakes");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy(
    "test/expected_fss/testFsNewFileInNewDirectory",
    async (fs) => {
      fs.removeSync("newdir");
      const controlFs = new SimpleFsDeno(
        `${originalCwd}/test/expected_fss/testFs`,
      );
      assert(fs.eq(controlFs));
    },
  );

  await inTmpCopy(
    "test/expected_fss/testFsNewDirectoryInNewDirectory",
    async (fs) => {
      fs.removeSync("newdir");
      const controlFs = new SimpleFsDeno(
        `${originalCwd}/test/expected_fss/testFs`,
      );
      assert(fs.eq(controlFs));
    },
  );

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.removeSync("..");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.removeSync("/");
    });
  });
});

Deno.test("copy", async () => {
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.copy("blog/recipes/curry", "newDir/moreCurry");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy1`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.copy("blog/recipes/curry", "newDir/moreCurry", "timid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy1`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.copy("blog/recipes/curry", "newDir/moreCurry", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy1`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.copy("blog/recipes/curry", "newDir/moreCurry", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy1`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.copy("blog/recipes", "newDir/recipes");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy2`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.copy("blog/recipes", "newDir/recipes", "timid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy2`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.copy("blog/recipes", "newDir/recipes", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy2`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.copy("blog/recipes", "newDir/recipes", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy2`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.copy("blog/recipes/curry", "blog/posts");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.copy("blog/recipes/curry", "blog/posts", "timid");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.copy("blog/recipes/curry", "blog/posts", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.copy("blog/recipes/curry", "blog/posts", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy3`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.copy("emptyDir", "chess");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.copy("emptyDir", "chess", "timid");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.copy("emptyDir", "chess", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.copy("emptyDir", "chess", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy4`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.copy("..", "blog", "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.copy("blog", "..", "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.copy("doesntExist", "blog", "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.copy("blog/recipes/curry", "/", "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.copy("blog", "/", "assertive");
    });
  });
});

Deno.test("copySync", async () => {
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.copySync("blog/recipes/curry", "newDir/moreCurry");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy1`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.copySync("blog/recipes/curry", "newDir/moreCurry", "timid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy1`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.copySync("blog/recipes/curry", "newDir/moreCurry", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy1`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.copySync("blog/recipes/curry", "newDir/moreCurry", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy1`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.copySync("blog/recipes", "newDir/recipes");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy2`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.copySync("blog/recipes", "newDir/recipes", "timid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy2`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.copySync("blog/recipes", "newDir/recipes", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy2`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.copySync("blog/recipes", "newDir/recipes", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy2`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.copySync("blog/recipes/curry", "blog/posts");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.copySync("blog/recipes/curry", "blog/posts", "timid");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.copySync("blog/recipes/curry", "blog/posts", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.copySync("blog/recipes/curry", "blog/posts", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy3`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.copySync("emptyDir", "chess");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.copySync("emptyDir", "chess", "timid");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.copySync("emptyDir", "chess", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.copySync("emptyDir", "chess", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsCopy4`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.copySync("..", "blog", "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.copySync("blog", "..", "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.copySync("doesntExist", "blog", "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.copySync("blog/recipes/curry", "/", "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.copySync("blog", "/", "assertive");
    });
  });
});

Deno.test("move", async () => {
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.move("blog/recipes/curry", "newDir/moreCurry");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove1`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.move("blog/recipes/curry", "newDir/moreCurry", "timid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove1`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.move("blog/recipes/curry", "newDir/moreCurry", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove1`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.move("blog/recipes/curry", "newDir/moreCurry", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove1`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.move("blog/recipes", "newDir/recipes");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove2`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.move("blog/recipes", "newDir/recipes", "timid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove2`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.move("blog/recipes", "newDir/recipes", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove2`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.move("blog/recipes", "newDir/recipes", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove2`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.move("blog/recipes/curry", "blog/posts");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.move("blog/recipes/curry", "blog/posts", "timid");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.move("blog/recipes/curry", "blog/posts", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.move("blog/recipes/curry", "blog/posts", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove3`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.move("emptyDir", "chess");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.move("emptyDir", "chess", "timid");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.move("emptyDir", "chess", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await fs.move("emptyDir", "chess", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove4`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.move("..", "blog", "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.move("blog", "..", "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.move("doesntExist", "blog", "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.move("blog/recipes/curry", "/", "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    await assertRejects(async () => {
      await fs.move("blog", "/", "assertive");
    });
  });
});

Deno.test("moveSync", async () => {
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.moveSync("blog/recipes/curry", "newDir/moreCurry");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove1`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.moveSync("blog/recipes/curry", "newDir/moreCurry", "timid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove1`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.moveSync("blog/recipes/curry", "newDir/moreCurry", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove1`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.moveSync("blog/recipes/curry", "newDir/moreCurry", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove1`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.moveSync("blog/recipes", "newDir/recipes");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove2`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.moveSync("blog/recipes", "newDir/recipes", "timid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove2`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.moveSync("blog/recipes", "newDir/recipes", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove2`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.moveSync("blog/recipes", "newDir/recipes", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove2`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.moveSync("blog/recipes/curry", "blog/posts");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.moveSync("blog/recipes/curry", "blog/posts", "timid");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.moveSync("blog/recipes/curry", "blog/posts", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.moveSync("blog/recipes/curry", "blog/posts", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove3`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.moveSync("emptyDir", "chess");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.moveSync("emptyDir", "chess", "timid");
    });
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.moveSync("emptyDir", "chess", "placid");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFs`,
    );
    assert(fs.eq(controlFs));
  });
  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    fs.moveSync("emptyDir", "chess", "assertive");
    const controlFs = new SimpleFsDeno(
      `${originalCwd}/test/expected_fss/testFsMove4`,
    );
    assert(fs.eq(controlFs));
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.moveSync("..", "blog", "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.moveSync("blog", "..", "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.moveSync("doesntExist", "blog", "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.moveSync("blog/recipes/curry", "/", "assertive");
    });
  });

  await inTmpCopy("test/expected_fss/testFs", async (fs) => {
    assertThrows(() => {
      fs.moveSync("blog", "/", "assertive");
    });
  });
});
