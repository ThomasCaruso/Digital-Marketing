# FORM refinement review
Date: 2026-09-29
Status: implemented and verified in the existing working tree. No commit or push.

## Experience
For You now uses a compact FORM masthead, restrained heading and selection progress, a softly framed product stage, concise brand/price/name hierarchy, color swatch and recommendation copy. Product scale adapts to available height; primary decisions fit above navigation at a 390 × 844 viewport. Smaller screens scroll without hiding controls. Fixture illustrations have subtle fabric shading, construction details and grounding shadows. Demo designation remains visible.

Horizontal swipes follow the finger with small rotation and directional feedback. A distance threshold and horizontal intent reject tiny or vertical gestures. Canceled gestures return to rest, can be picked up again immediately, and cannot open details accidentally. Buttons use the same exit transition. Next cards fade and settle. Tab changes cancel pending decisions; returning restores a fully visible card.

Saved/pass decisions are atomic. Repeated or conflicting commits for the same reviewed piece are ignored. Single-step Undo restores eligibility and preserves unrelated saves. Refresh, preference edits and external product mutations invalidate undo. Decisions persist; undo does not survive a restart. The completion state links to Saved, offers refresh, and can undo the last piece.

All five tabs, product detail and look actions share subtle press motion and tactile feedback. Navigation has quiet selected icon surfaces and consistent touch targets. Haptics use the existing Expo module, fire once after a discovery commit and fail silently when unavailable. Reduced motion removes card travel/tilt and press scaling. Toast dismissal remains reliable when the preference changes.

## Verification
- npx tsc --noEmit: pass.
- npx expo lint: pass, no lint errors or warnings.
- node scripts/test-discovery.cjs: pass.
- node scripts/test-persistence.cjs: pass, includes fixture product-loop regression suite.
- npx expo export --platform android: pass, native bundle and assets exported to C:/Users/Tommy/form-product-qa/refinement-bundle.
- Live Expo browser review: standard-phone proportions; save/undo; short swipe cancellation without detail navigation; left/right swipe; saved-piece detail; all five tabs; decision cancellation on tab change; intentional detail tap; reload persistence; 320 × 568 viewport; reduced-motion decisions; feed completion; undo of final piece.
- Focused independent code review: no critical/important findings; toast preference-change dismissal finding fixed.
- Dependency manifests unchanged. Temporary browser QA Metro resolver removed. Browser tooling is isolated under the existing QA folder; no production dependencies added.

## Evidence and limits
Screenshots: C:/Users/Tommy/form-product-qa/refinement-home.png and refinement-small-phone.png.
Live check: C:/Users/Tommy/form-product-qa/check-refinement.cjs.
Browser rendering verifies layout and event/state behavior; it cannot prove Android/iOS gesture performance or physical haptics. ADB reported no connected device. Tactile tuning and native-device visual review remain for a connected phone.

## Physical phone review and card correction
Connected Samsung A14 SM-A146U over USB; opened the existing development client through ADB reverse on port 8081. The full product presentation now occupies one rounded card, including illustration, material, brand, name, price, color and recommendation. A quiet backing layer gives the card depth. Header condensed to FORM, For You and progress; card occupies about 70% of available home area. Primary decisions remain below it and above navigation.

Verified on the actual phone: canceled swipe across product text stays on Home; right swipe across product text saves and advances; left swipe across illustration passes and advances; Undo restores the original piece after both decisions; deliberate tap opens product details and Back restores Home; all five tabs open; save/undo button flow works. Existing preferences and saves preserved. Native error log check returned no errors during review. Final screenshot: C:/Users/Tommy/form-product-qa/refinement-android-card-final.png.

Android device dump reports semantic haptic support unavailable. Switched Android feedback to Expo's short Light impact pulse. Vibration manager recorded completed 50ms FORM pulses for save and undo at the current test time. Physical subjective strength remains for the user to assess. No system vibration settings changed. This review supersedes the earlier no-connected-device limitation.

After the card/haptic changes: TypeScript and Expo lint passed; discovery/persistence checks passed after the card change. Current native JavaScript loaded through the running Metro server on the phone. No commit or push.

## Floating menu and in-card controls
User-directed correction: the five-tab menu is a rounded elevated surface inset 20dp from the sides and 16dp above the bottom safe area. Layout reserves its full height so it cannot cover page controls. The discovery card starts 24dp lower; Pass and Save piece now live inside the animated card, and their touch handlers reject taps synthesized from a canceled drag. The product stage scales to preserve action space. Live browser flow checks passed for decisions, gestures, undo, navigation, persistence, completion, reduced motion and small viewport. TypeScript, lint and discovery/persistence checks passed.

USB debugging recovery: Windows saw the phone while ADB stalled. Restarted ADB and restored the bridge. The preview subsequently needed an IPv4 loopback binding: PowerShell NODE_OPTIONS='--dns-result-order=ipv4first', EXPO_OFFLINE='1', then npx expo start --dev-client --port 8081 --host localhost. It binds 127.0.0.1:8081 and connects through adb reverse. No LAN server exposure required. Final native screenshot: C:/Users/Tommy/form-product-qa/refinement-android-floating-menu-final.png.
## Swipe cues and corner undo
Adapted Tinder's directional stamp feedback and curved rewind icon to FORM. Removed the visible swipe instruction/footer; SAVE (muted olive) and PASS (warm clay) outlined stamps fade in as the card moves. Kept accessible swipe guidance and the in-card action buttons. Undo is a small curved icon at the upper-right of the card with a 48dp touch target, disabled styling and drag/tap protection; it also remains available on the completion card. Reclaimed footer space for a taller product card while preserving the floating menu.

Verified on the USB-connected Samsung A14: right and left swipes advance; the corner icon restores the previous piece after both; a canceled short swipe stays on the same piece. Inspected native screenshots during each directional drag. QA decisions were undone, preserving the original selection and saves. TypeScript, Expo lint and discovery tests passed. Native evidence: C:/Users/Tommy/form-product-qa/swipe-refinement-final.png, swipe-refinement-stamp.png and swipe-refinement-pass-stamp.png.
References: https://www.help.tinder.com/hc/en-gb/articles/115004493323-Rewind and Tinder screenshot research at https://documentserver.uhasselt.be/bitstream/1942/39423/1/08%3A09%20Passage%201%20.pdf. Existing working tree retained; no commit or push.

## Real stack and angled card motion
Replaced the blank backing shape with the actual next two unseen products, using the shared DiscoveryCardFace presentation. Resting layers fan in opposite directions with exposed upper corners; the next card straightens and lifts as the front moves. The front stays fully opaque, pivots below its center, follows a little vertical thumb movement, and exits at up to 22 degrees. Release timing responds to swipe speed; cancellation uses a damped spring. The deck remains mounted between pieces and resets its animated position before painting the promoted card, removing the entrance fade. Haptic feedback now occurs when the decision releases.

Preview layers use static controls, ignore touches and declare accessibility exclusion. Added opt-out of disabled opacity to MotionPressable for the moving card so its image, title and controls stay solid during exit; existing controls keep their original disabled treatment. Decision thresholds and atomic review/undo behavior remain intact. Motion preference and focus changes stop the animation.

Verification: TypeScript passed; Expo lint --no-cache passed (cleared an imported-file parser cache after a corrected JSX typo); existing discovery tests passed. Samsung A14 native screenshots confirm both angled directions and real next-product reveal, with stack corners visible at rest. Native checks covered directional decisions, short canceled swipe, in-card button decisions, undo and intentional product details. Evidence: C:/Users/Tommy/form-product-qa/stack-rest.png, stack-right-reveal.png, stack-left-reveal.png and stack-final.png. No commit or push.

## Anchored, uniform stack correction
User-directed correction supersedes the fanned stack and drag-linked promotion. Both preview cards are straight, centered and uniformly spaced (10dp of top edge per depth). Their promotion uses an independent animated value, untouched during the drag; it starts only after release confirms a decision. Removed vertical thumb drift, limited front-card drag tilt to 8 degrees across a full width, retained an 18-degree committed exit, and tightened the cancel spring to stiffness 300/damping 30/mass 0.75.

Verified rest and held-drag screenshots on the Samsung A14: background edges remain aligned in the same position while the front moves. Right and left decisions and corner undo work; a canceled short drag retains Lambswool Crewneck. QA decisions undone. TypeScript, Expo lint --no-cache and discovery checks passed. Evidence: C:/Users/Tommy/form-product-qa/anchored-stack-rest.png, anchored-stack-drag.png, anchored-stack-final.png.

## Fixed Home, glass surfaces and native swipe tracking
The Home scene is fixed in height and cannot scroll vertically. It sizes the card from the available scene height and uses compact typography and product-stage sizing on short screens. Navigation, the selected tab, corner undo and card actions use layered translucent gradients, lens edges and subtle tinted backgrounds through GlassMaterial; no Android blur dependency was added.

Replaced JS PanResponder tracking with Gesture Handler 3.3 and Reanimated UI-thread worklets. Horizontal translation directly follows the gesture, while vertical displacement uses continuous resistance bounded at 14dp and tilt is bounded at 5 degrees during tracking. Pure vertical starts fail recognition. Confirmed exits preserve the raw gesture direction, rotate to 16 degrees and use velocity-aware timing. Preview cards remain uniformly anchored until confirmation. Removed scale-on-touch from the image/title/actions. Hardware textures cache the bounded three-card deck and feedback stamps to reduce redraw cost.

Verified on the connected Samsung A14: diagonal save/pass, short cancellation, button decision and corner undo; restored the starting Linen Trouser and QA saves. Earlier fixed-scene native vertical tests and 320x568/390x844 browser layout checks passed. Latest native rewrite passed TypeScript, Expo lint --no-cache, discovery regression checks and exit-vector/vertical-resistance tests. Native runtime logs had no JS errors during these flows. Explicitly added the already compiled Gesture Handler dependency; aligned react-dom with React 19.2.3 to resolve the dependency installation conflict.

Performance verification remains in progress: isolated Android drag profiling showed median frame duration 42ms before hardware caching and 26ms afterward, with slow frames still present in the ordinary debug client. An optimized Android development build is being prepared to separate native debug overhead from remaining rendering cost. This is not yet a verified 60fps result. Evidence: C:/Users/Tommy/form-product-qa/drag-before-cache.txt, drag-after-cache.txt, smooth-native-tracking.png and smooth-native-final.png. No commit or push.

### Swipe performance follow-up
Built and installed debugOptimized over the existing package with adb install -r, preserving app data. The initial build produced an APK but Gradle failed afterward replacing its existing HTML warning report; subsequent build used the documented --no-problems-report option and completed successfully. Enabled ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS through package.json and verified the true flag in Reanimated's C++ compilation arguments. Press targets now use Gesture Handler Pressable to support transformed hit targets. The card pose is updated atomically as one shared x/y/tilt object per drag event; confirmed travel and spring return also animate this pose together.

Caught and fixed a vertical-drag detail-tap bug on the physical phone: touch movement exceeding 8dp suppresses taps even when the pan fails vertical recognition. Deliberate taps still work. A separate cached face/stamp experiment measured worse performance and was reverted. The retained deck cache is bounded to the front card, two previews and two feedback surfaces.

The optimized client alone did not improve injected-drag frame timing; the direct transform path had a modest input-processing improvement, and atomic pose tracking measured median 25ms/p90 29ms on the same ADB-injected 2500ms path. These injected-drag frame reports still contain slow frames and do not establish 60fps. Button-triggered animation has substantially less input-handling time than the injected drag. The user tested an actual slow finger drag and explicitly reported 'Smooth and controlled'. This confirms the intended subjective tracking improvement without claiming a measured frame-rate guarantee. Final native functional verification and logs recorded separately below. Current Android preview uses the optimized installed client through USB/localhost. No commit or push.

Final verification after atomic pose change: short drag cancellation, pure vertical drag staying on Home, left decision and undo, in-card Save and undo, deliberate detail tap and Back passed on Samsung A14. Right diagonal decision/undo passed during the measured run. All five tabs passed after native Pressable migration. Native error-log check was empty. Final screenshot: C:/Users/Tommy/form-product-qa/smooth-native-verified.png. TypeScript, Expo lint --no-cache, discovery and motion regression checks passed. QA restored Linen Trouser and its save state.
