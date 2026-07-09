<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# What we building in short

building a personal outreach CRM + automation platform that happens to send job applications with incremental features addons as needed. its basically going to be a personal Job Operating System

we will keep a handoff at root as handoff.md (create if not one), to udpate the feature in short and caveats.

# Please follow these instructions

- we have all shadcn components installed, use them properly.
- we are buliding things feature by feature.
- follow a clean and minimal visual direction as followed by modern apps like linear, slack, clerk, notion.
- try not to repeat code.
- implementation should be incremental and non-breaking and incremtanl and unless explicitly told so.
- when testing or doing sanity after doing feature or fix, do not go for over-enginerring like playwright, chromium-cli or so, go for lint or typecheck.
- dont try to run server, as we may have it already running.
- our goal is not to be flashy in terms of visual direction.
- no new packages installation unless approved (ask if needed).
- for table, we have table from shadcn just basic one, but we also have tanstack table installed, we need to create a data-table type of abstraction over it using tanstack table and table component from shadcn so we make it more abstracted and reusable
- this abstraction may be needed to done for some other components like combobox or so, so that we can use it in a more declartive way
- we also have zod and react hook form installed, can create some abstraction if needed or use it as needed.
- always make sure the code is modular and future proof and scalable.
- dont use native like date, input, checkbox, button and styling it over it, use installed shadcn components.
- when a screenshot or reference is given. dont copy it exactly, just follow the placement of ui elements, logic or functionality type of things and implement in our own visual direction.
- dont use native select from ui folder, use select.
- if code or any component becomes complex and too much code in a single file, try to modularize it.
- dont repeat code unless much needed
