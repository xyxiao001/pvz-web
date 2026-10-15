# Display-density asset review

## Findings

- Before this change, the runtime shipped 475 WebP images. Scene backgrounds and actor parts were 2x; 11 chooser/dialog/HUD surfaces were still 1x. Source/background dimensions were checked directly with Pillow, rather than inferred from filenames.
- Full backgrounds were 2800x1200 at 2x. The renderer only displays the logical rectangle (220, 0, 800, 600). Loading a 4x version of the whole 1400px source would waste memory on hidden scenery and produce a 5600px texture.
- Native plant/zombie parts and their atlases already use 2x source resolution. They remain unchanged: multiplying all of those textures by four in memory would penalize crowded survival games. Their pose/crop coverage is exercised by the actor/plant/giant motion tests.

## Changes

- Seven cropped scenery images: unsodded yard, lawn, night, pool, fog, roof, boss. Each is 3200x2400 at 4x and preserves the exact 800x600 logical camera. Day lawn strips retain their original row positions.
- 92 DOM/HUD/background images and 11 UI surfaces have separate high-density URLs. Plant prices remain DOM text. CSS image-set selects existing or HD art by density; wide 1x desktops select HD art. DOM portraits use the new small standalone files.
- Scenery tier is selected when entering a board, using actual framebuffer pixels per simulation unit. At up to 2 pixels/unit the existing image is loaded; above that, the cropped 4x image is loaded. No background download is added to startup, no retry/failure substitution is introduced, and old URLs stay available.
- Nine-slice HUD regions use percentages so either density samples the same corners and edges.

## Costs and limits

- 110 HD images total 10,806,518 bytes (10.31 MiB); seven scenery images account for 4,453,692 bytes. The HD lawn is 962,532 bytes.
- One HD scenery texture occupies 30,720,000 RGBA bytes before driver overhead; a daytime board uses yard plus lawn. Small boards retain existing 2x resources. DOM art is loaded through the existing lazy image mechanism where present. Offline installation includes both tiers.
- Texture edges stay at or below 4096 pixels. The previous framebuffer change retains the 3840x2160 total pixel budget.
- This is super-resolution of original art, not recovered native 4K source detail. Original grass patterns, painted shading and animation geometry are retained.
- Resizing an already-loaded board keeps its selected scenery tier until the next board load.

## Reproduction and verification

Run `python3 tools/build-display-hd.py` with the existing Real-ESRGAN ncnn runtime/models in `artifacts/hd-work/runtime`. The exporter uses the x4 animevideo-v3 model, fixed tile size and explicit sources/crops in `tools/display-hd-targets.json`. PNG inference results are encoded as Q95 scenery, Q97 other surfaces, and lossless packet lettering/logo. `--encode-only` re-encodes existing inference results.

Source/output hashes, dimensions and sizes are in `display-hd-assets.json`. All 110 encoded outputs were checked against inference PNG dimensions and alpha channels. The 312-test suite and production build passed. Browser checks covered main menu, original nine-slice panels, plant selection and entering a daytime battle without console errors. A same-scale lawn comparison is saved locally at `artifacts/hd4/lawn-comparison.png` (left: former 2x image enlarged, right: direct 4x result).
