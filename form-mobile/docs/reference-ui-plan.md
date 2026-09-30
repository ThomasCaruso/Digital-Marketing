# FORM reference UI plan

Scope: presentation and local mock interactions only, within form-mobile. Keep the existing Expo dev client, Metro instance, fonts, routing, and original domain store. No commits or pushes.

Design: reproduce the supplied five-screen reference using warm bone backgrounds, Instrument Serif headings, DM Sans metadata, thin line icons, unobtrusive navigation, and coherent fashion photography. Each tab has one focused purpose. Assets are temporary and documented.

- [x] Bundle jacket, outfit composition, three editorial model photographs, and portrait in assets/placeholders.
- [x] Add a separate local preview dataset/store for selection and saves, leaving existing domain state intact.
- [x] Replace tab presentation and add Edits and Try On destinations.
- [x] Rebuild For You, Saved, You, and look details around the reference.
- [x] Verify all five tabs and basic save/selection interactions on the physical Android device using the running Metro server.
- [x] Run npx tsc --noEmit and npx expo lint; review the final diff for scope.

Verification uses device interaction and screenshots for this reversible visual prototype, plus TypeScript and lint. No test framework or backend dependencies are introduced. The user explicitly requested implementation followed by phone review.

Verified on the connected SM-A146U with the existing Metro server and ADB reverse. All five tabs rendered; discovery pass/save/unsave, edit selectors, details, mock comparison, look selection, Saved remove/resave, and profile preferences passed device interaction checks. Screenshots and verification scripts are under the ignored .expo/ui-review directory. TypeScript and Expo lint passed with no errors or warnings. No commits or pushes were made.
