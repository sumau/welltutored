# Well Tutored

A public directory of tutors and the teaching resources they write, plus a
private area where those tutors maintain their own profiles and content. One
vocabulary is shared by every package in this repository.

## Language

### The public site

**Tutor**:
A person offering tuition, with a profile in the directory. A Tutor is `draft`,
`published` or `archived`; only a published Tutor appears publicly.
_Avoid_: Teacher, instructor, coach

**Tutor Profile Draft**:
Unpublished edits to a Tutor's profile, held separately from the published
profile so that editing never changes what visitors see.
_Avoid_: Revision, pending profile, version

**Directory**:
The public listing of published Tutors.
_Avoid_: Listing, search, index

**Resource**:
A piece of teaching material written by a Tutor and read by visitors. A
Resource is `draft` or `published`.
_Avoid_: Article, post, content, material

**Enquiry**:
A message sent by a visitor to a Tutor through the public site. The main thing
a visitor does, and the only way an unauthenticated person writes to the
system.
_Avoid_: Contact, lead, message, request

**Intake**:
Whether a Tutor is taking new students: `accepting`, `limited` or `full`. A
`full` Tutor cannot receive Enquiries. Distinct from whether their profile is
published.
_Avoid_: Availability, status

**Availability**:
When a Tutor teaches — the days and times they offer sessions, in the Tutor's
own words. Not whether they are taking new students; that is Intake.
_Avoid_: Schedule, hours

**Experience**:
A Tutor's working history in their own words — jobs, volunteering, tutoring
and career breaks alike. Optional; not limited to paid employment.
_Avoid_: Employment history, career, work history

**Education**:
A Tutor's full educational history in their own words. Optional. Distinct from
the University and Qualification a Tutor is summarised by, which stay as
headline facts.
_Avoid_: Qualifications, academic history

### The private area

**Workspace**:
The private, authenticated area where Tutors and the Owner manage profiles and
Resources. The word means only this area; the repository and its packages are
not "the workspace".
_Avoid_: Studio, admin, dashboard, back office, CMS

**Workspace Account**:
A signed-in person's record, distinct from the Tutor profile it may be linked
to. One person can hold an account without being a Tutor.
_Avoid_: User, member, profile

**Role**:
A Workspace Account is `owner`, `tutor` or `pending`. A new account is
`pending` until promoted.

**Owner**:
The single Workspace Account with the `owner` role, who promotes other
accounts. There is at most one: a new database has none until the first is
promoted by hand.
_Avoid_: Admin, superuser, root

### Delivery

**Deployment**:
The running instance serving the site — one Public Origin serving both the
frontend and the API.
_Avoid_: Publish, publication, the app, the environment

**Public Origin**:
The one origin the Deployment is known by. Every other hostname that reaches
the Deployment redirects there, except for the Health Check's `/api/healthz`.
With `PUBLIC_ORIGIN` unset, nothing redirects.
_Avoid_: Primary domain, main URL, canonical domain

**Deploy**:
The act of shipping the current `main` to the Deployment.
_Avoid_: Publish, ship, release, launch

**Health Check**:
Whether a machine of the Deployment may take traffic: its process is up and the
database answers. Gates the switch to a new version during a Deploy. Says
nothing about whether the site is usable; that is the Public Site Smoke.
_Avoid_: Liveness, readiness, ping

**CI Smoke**:
The group of Smokes that runs before merge against a throwaway build of the
production image, with the Clerk development instance and a throwaway database
seeded with sample content. It checks the image's recipe, not the exact image
that ships. It is a required check.
_Avoid_: Image Smoke, development smoke

**Prod Smoke**:
The group of Smokes that runs against the live Deployment after each Deploy, on
the image that ships. A failure there means visitors are already seeing it.
_Avoid_: post-deploy check

**Public Site Smoke**:
The check that the site is *usable*: it has a published Tutor, its pages
render, and the API rejects an invalid Enquiry and keeps answering. It runs
before merge and again on the Deployment after each Deploy. While Resources are
hidden from visitors, a usable site needs no published Resource. A successful
Deploy doesn't imply a passing Public Site Smoke; they assert different things.
_Avoid_: Launch Smoke, Image Smoke, health check, published smoke

**Domain Smoke**:
The check, on the Deployment after each Deploy, that the domain setup around it
holds: every other hostname redirects permanently to the Public Origin, and
Clerk answers on its own hostname as the production instance. A broken DNS
record, a lapsed certificate or a development key shipped by mistake fails it.
_Avoid_: DNS check, redirect check, Launch Smoke

**Verify**:
The check, before merge, that the repository holds together: its tests pass
against a dedicated test database, it typechecks and builds, the Docs Check
passes and the CSS stays within budget. The one check every pull request must
pass.
_Avoid_: Test, CI, the build

**Workspace Smoke**:
The check, before merge, that a person can sign in through the real Clerk form,
using the development instance, and use the Workspace: edit a profile, and
publish a Resource that stays hidden from visitors. Differences between the
development and production Clerk instances are outside it.
_Avoid_: Sign-in Smoke, auth test, login check

**Enquiry Smoke**:
The check, before merge and again on the Deployment after each Deploy, that a
person can fill in and send the enquiry form in a real browser, by keyboard
alone. It intercepts the request that would send it, so it never creates a real
Enquiry.
_Avoid_: Enquiry browser check, form test

**Docs Check**:
The check, before merge, that the docs' mechanical claims hold: the ones a
parser can verify against the repository. It blocks the build.
_Avoid_: Docs lint, link check

**Docs Review**:
Claude's reading of the docs against the code for statements the code no
longer supports, run by hand with `/technical-documentation` in facts mode. It
advises and never blocks; the Docs Check is the gate.
_Avoid_: Docs audit, AI review
