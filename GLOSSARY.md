# Well Tutored

A public directory of tutors and the teaching resources they write, plus a
private area where those tutors maintain their own profiles and content. One
vocabulary is shared by every package in this workspace.

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
Resources.
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
accounts. There is exactly one.
_Avoid_: Admin, superuser, root

### Delivery

**Deployment**:
The running instance serving the site — one Public Origin serving both the
frontend and the API.
_Avoid_: Publish, publication, the app, the environment

**Public Origin**:
The one origin the Deployment is known by. Every other hostname that reaches
the Deployment redirects there.
_Avoid_: Primary domain, main URL, canonical domain

**Deploy**:
The act of shipping the current `main` to the Deployment.
_Avoid_: Publish, ship, release, launch

**Health Check**:
Whether a machine of the Deployment may take traffic: its process is up and the
database answers. Gates the switch to a new version during a Deploy. Says
nothing about whether the site is usable; that is the Launch Smoke.
_Avoid_: Liveness, readiness, ping

**Launch Smoke**:
The check that a Deployment is *usable* — it has a published Tutor, its pages
render, and an Enquiry can be submitted. While Resources are hidden from
visitors, a usable Deployment needs no published Resource. A
successful Deploy does not imply a passing Launch Smoke; they assert different
things.
_Avoid_: Health check, published smoke

**Image Smoke**:
The check, before merge, that the production image starts and serves the site
against a throwaway database seeded with sample content. It checks the image's
recipe, not the exact image that ships.
_Avoid_: Docker test, build check

**Sign-in Smoke**:
The check, before merge, that a person can sign in through the real Clerk form,
using the development instance, and use the Workspace. Differences between the
development and production Clerk instances are outside it.
_Avoid_: Auth test, login check

**Docs Check**:
The check, before merge, that the docs' mechanical claims hold: commands they
name exist, links resolve, and files they name are in the repo. It also checks
that every environment variable the code reads is documented. It blocks the
build.
_Avoid_: Docs lint, link check
