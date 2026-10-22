# Schema pushes

What `push` prompts for each kind of schema change, how past pushes were
answered, and how to rehearse one first. The push command, and the check of
where it landed, are in [deploy.md](deploy.md#applying-the-schema); every
command here uses the `DIRECT_DATABASE_URL` read there.

Record each new kind of prompt here, with what you answered
([CONTRIBUTING.md](../CONTRIBUTING.md#schema-changes)).

## What push prompts

Against an empty database there is nothing to drop, so a *truncate* prompt there
means the connection string is not pointing where you think it is. When you are
unsure what a push will do to existing rows, run it on a copy first — see
[Rehearsing a push on a Neon branch](#rehearsing-a-push-on-a-neon-branch).

Dropping a column prompts with a count of the rows that hold a value. Removing
the tutor `style` field (issue #53) looked like this against seeded data:

```
 Warning  Found data-loss statements:
· You're about to delete style column in tutors table with 5 items
· You're about to delete style column in tutor_profile_drafts table with 1 items

THIS ACTION WILL CAUSE DATA LOSS AND CANNOT BE REVERTED

Do you still want to push changes?
```

Answer yes only when every listed column is one the schema diff removes on
purpose. The live code still reads a dropped column until the merge deploys, so
merge straight after the push.

Dropping a table prompts the same way, with a count of its rows. Removing saved
resources (issue #69) looked like this against local data:

```
 Warning  Found data-loss statements:
· You're about to delete saved_resources table with 2 items

THIS ACTION WILL CAUSE DATA LOSS AND CANNOT BE REVERTED

Do you still want to push changes?
❯ No, abort
  Yes, I want to remove 1 table,
```

Here the order flips: merge first and push after, so the running Deployment
never queries a table that has gone. That works whenever the merged code no
longer reads the table.

**Both prompts appear only when there is data to lose.** `push` counts the rows
first and asks only when the count is above zero. An empty table, or a column
no row holds a value in, is dropped with no prompt, and the push just reports
`Changes applied`. Production's `saved_resources` was empty, so its push showed
no prompt. To confirm the drop, run the `\conninfo` and `\dt` check in
[deploy.md](deploy.md#applying-the-schema), then push again: it should print
`No changes detected`.

**Renames are the exception, and they prompt on any database, empty or not.**
`push` diffs states, so it cannot tell a renamed type or constraint from a
dropped one and a new one — it asks. The highlighted default is `create`, which
is the drop-and-recreate; the rename is the line below it:

```
Is workspace_account_role enum created or renamed from another enum?
❯ + workspace_account_role                       create enum
  ~ studio_account_role › workspace_account_role rename enum
```

Answered as a rename it emits `ALTER TYPE ... RENAME TO ...` and touches no
rows. Answered with the default it creates the new type, casts the column across
with `USING role::text::<new type>`, restores the default and drops the old
type — which, for a pure rename where the label set is unchanged, lands on the
same state. Verified against a populated table: rows survive intact, and a
second `push` reports no changes.

Pick the rename line anyway — it is the honest description of the change.

**Neither answer copes with a changed label.** `push` has no way to rename an
enum value: whichever line you pick, a label set that differs from the
database's makes it cast the column to `text`, drop the type, create it with
the new labels and cast back. Any row still holding a label the new type lacks
fails the cast back, and `push` stops there, partway through and outside a
transaction, leaving the column as plain `text`. Renaming the Intake value
`unavailable` to `full` (issue #55) did exactly that in rehearsal:

```
ALTER TABLE "tutors" ALTER COLUMN "intake" SET DATA TYPE text;
...
DROP TYPE "public"."tutor_intake";
CREATE TYPE "public"."tutor_intake" AS ENUM('accepting', 'limited', 'full');
...
error: invalid input value for enum tutor_intake: "unavailable"
```

So rename the label yourself first, in place, which rewrites every row holding
it at once:

```
docker compose run --rm -e DATABASE_URL="$DIRECT_DATABASE_URL" --entrypoint bash migrate \
  -lc "psql \"\$DATABASE_URL\" -c \"ALTER TYPE tutor_availability RENAME VALUE 'unavailable' TO 'full'\""
```

The labels then match, and `push` asks only about names. For #55, answer
`rename` to all three prompts:

```
Is tutor_intake enum created or renamed from another enum?
  ~ tutor_availability › tutor_intake rename enum
Is intake column in tutors table created or renamed from another column?
  ~ availability › intake rename column
Is intake column in tutor_profile_drafts table created or renamed from another column?
  ~ availability › intake rename column
```

and it emits renames and nothing else:

```
ALTER TYPE "public"."tutor_availability" RENAME TO "tutor_intake";
ALTER TABLE "tutors" RENAME COLUMN "availability" TO "intake";
ALTER TABLE "tutor_profile_drafts" RENAME COLUMN "availability" TO "intake";
```

The column prompts list every column of that table the schema no longer has,
so read the names, not the position: `rename` is not always the line directly
below `create`. Between the `ALTER TYPE` and the merge, the live code still
writes the old label, so saving a profile as `unavailable` fails until the
deploy lands. Push and merge back to back.

**If a push has already stopped partway**, do not run it again as it is. A
rerun generates statements from whatever state was left, and it fails at the
same row. When #56 was merged without the `ALTER TYPE` above, the first push
renamed the type and the columns, then left `intake` as plain `text` with two
rows still holding `unavailable`. The live site kept working, since a `text`
column holds the same values.

To recover, fix the rows by hand first. A `text` column takes the new label
directly, and the `::text` comparison works whatever the column's type is:

```
docker compose run --rm -T -e DATABASE_URL="$DIRECT_DATABASE_URL" --entrypoint bash migrate \
  -lc 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1' <<'SQL'
update tutors set intake = 'full' where intake::text = 'unavailable';
update tutor_profile_drafts set intake = 'full' where intake::text = 'unavailable';
SQL
```

Then `push` again. The names already match, so it asks nothing; it casts the
column back with `SET DATA TYPE ... USING intake::tutor_intake`, restores the
default, and applies anything else pending. Push a second time to confirm it
reports `No changes detected`. Before touching the Deployment, rebuild the
half-applied state in a local scratch database (`create database ... template
welltutored`, then undo the parts that did not land) and rehearse both steps
there.

Renaming a constraint additionally asks whether to truncate the table before
adding the new one — answer no; the default is already no.

## Rehearsing a push on a Neon branch

A push you are unsure of — a rename, a dropped column, a new constraint on a
table that already has rows — can be run against a copy of the Deployment
database first. The local development database has seed content, not the
Deployment's rows, so it cannot tell you whether a constraint holds against
real data. A Neon branch can: it is a copy-on-write clone of the database at the
moment you create it, made in seconds, with its own connection strings.

1. **Create the branch.** In the Neon dashboard, open the project, go to
   **Branches**, and create one from the branch the Deployment's
   `DATABASE_URL` points at. Name it for what it is, e.g. `push-rehearsal`.
2. **Take its direct connection string**, not the pooled one, and append
   `?sslmode=require`, for the reasons under
   [Applying the schema](deploy.md#applying-the-schema).
3. **Push to it** with the same command as a real push, and answer the prompts
   as you intend to answer them for real:

   ```
   read -rsp 'Rehearsal branch DATABASE_URL: ' REHEARSAL_DATABASE_URL; echo

   docker compose run --rm -e DATABASE_URL="$REHEARSAL_DATABASE_URL" --entrypoint bash migrate \
     -lc 'pnpm --filter @workspace/db run push'
   ```

   It is read as `REHEARSAL_DATABASE_URL` so that it cannot be confused with
   the `DIRECT_DATABASE_URL` you read for the real push.
4. **Check the result** with the `\conninfo` and `\dt` command in
   [deploy.md](deploy.md#applying-the-schema), passing
   `"$REHEARSAL_DATABASE_URL"`. The host in `\conninfo` should be the branch's
   endpoint, which differs from the Deployment's. Query the tables the change
   touches to confirm the rows came through as you expected.
5. **Delete the branch** from the same **Branches** page. It shares storage
   with its parent until either one diverges, so leaving it costs little at
   first, but it counts towards the project's branch limit and goes stale.

The branch is a disposable copy. Nothing you do to it reaches the Deployment,
so a push that goes wrong there is the result you were looking for: fix the
schema change, delete the branch, and branch again.
